// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract OutcomeToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    address public immutable market;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 amount
    );

    constructor(string memory _name, string memory _symbol, address _market) {
        name = _name;
        symbol = _symbol;
        market = _market;
    }

    modifier onlyMarket() {
        require(msg.sender == market, "only market");
        _;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "zero address");
        uint256 senderBalance = balanceOf[msg.sender];
        require(senderBalance >= amount, "insufficient balance");
        unchecked {
            balanceOf[msg.sender] = senderBalance - amount;
            balanceOf[to] += amount;
        }
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        require(to != address(0), "zero address");
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "insufficient allowance");
        if (allowed != type(uint256).max)
            allowance[from][msg.sender] = allowed - amount;
        uint256 senderBalance = balanceOf[from];
        require(senderBalance >= amount, "insufficient balance");
        unchecked {
            balanceOf[from] = senderBalance - amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external onlyMarket {
        require(to != address(0), "zero address");
        totalSupply += amount;
        unchecked {
            balanceOf[to] += amount;
        }
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external onlyMarket {
        uint256 senderBalance = balanceOf[from];
        require(senderBalance >= amount, "insufficient balance");
        unchecked {
            balanceOf[from] = senderBalance - amount;
            totalSupply -= amount;
        }
        emit Transfer(from, address(0), amount);
    }
}

interface IPredictionMarket {
    struct MarketInfo {
        address creator;
        string question;
        string category;
        uint256 endTime;
        uint8 status;
        uint8 outcome;
        uint256 yesPool;
        uint256 noPool;
        uint256 totalBacking;
    }

    struct OrderInfo {
        address user;
        uint256 marketId;
        bool isYes;
        uint256 tokenAmount;
        uint256 stopLossPrice;
        uint256 takeProfitPrice;
        bool isActive;
    }

    function getMarketInfo(
        uint256 marketId
    ) external view returns (MarketInfo memory);

    function getCurrentMultipliers(
        uint256 id
    ) external view returns (uint256, uint256, uint256, uint256);

    function buyYesWithBNBFor(
        uint256 id,
        address beneficiary,
        uint256 minYesOut
    ) external payable;

    function buyNoWithBNBFor(
        uint256 id,
        address beneficiary,
        uint256 minNoOut
    ) external payable;

    function createStopLossOrder(
        uint256 marketId,
        bool isYes,
        uint256 tokenAmount,
        uint256 stopLossPrice
    ) external returns (uint256);

    function createTakeProfitOrder(
        uint256 marketId,
        bool isYes,
        uint256 tokenAmount,
        uint256 takeProfitPrice
    ) external returns (uint256);

    function executeOrder(uint256 orderId) external;

    function getUserOrders(
        address user
    ) external view returns (uint256[] memory);

    function getOrderInfo(
        uint256 orderId
    ) external view returns (OrderInfo memory);
}

contract PredictionMarketWithMultipliers is IPredictionMarket {
    enum MarketStatus {
        Open,
        Closed,
        ResolutionRequested,
        Resolved,
        Disputed
    }
    enum Outcome {
        Undecided,
        Yes,
        No
    }
    enum OrderType {
        StopLoss,
        TakeProfit
    }

    struct Market {
        address creator;
        string question;
        string category;
        uint256 endTime;
        MarketStatus status;
        Outcome outcome;
        OutcomeToken yesToken;
        OutcomeToken noToken;
        uint256 yesPool;
        uint256 noPool;
        uint256 lpTotalSupply;
        uint256 totalBacking;
        uint256 platformFees;
        uint256 resolutionRequestedAt;
        address resolutionRequester;
        string resolutionReason;
        uint256 resolutionConfidence;
        uint256 disputeDeadline;
        address disputer;
        string disputeReason;
    }

    struct Order {
        uint256 orderId;
        address user;
        uint256 marketId;
        bool isYes;
        uint256 tokenAmount;
        uint256 triggerPrice;
        OrderType orderType;
        bool isActive;
        uint256 createdAt;
    }

    struct UserInvestment {
        uint256 totalInvested;
        uint256 lastUpdated;
    }

    struct TradeInfo {
        address trader;
        bool isBuy; // true = buy, false = sell
        bool isYes; // true = YES token, false = NO token
        uint256 amount; // BNB/PDX amount
        uint256 tokenAmount; // Token amount received/sold
        uint256 timestamp;
    }

    uint256 public nextMarketId;
    uint256 public nextOrderId;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => uint256)) public lpBalances;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders;
    mapping(uint256 => mapping(address => UserInvestment))
        public userInvestments;

    // Trade history: marketId => array of trades (max 100 per market)
    mapping(uint256 => TradeInfo[]) private marketTrades;
    uint256 constant MAX_TRADES_STORED = 100;

    address public resolutionServer;
    address public owner;
    uint32 public feeBps;
    uint32 public lpFeeBps;

    uint256 constant MINIMUM_LIQUIDITY = 1_000;
    uint256 constant MIN_INITIAL_LIQUIDITY = 0.01 ether;
    uint256 constant DISPUTE_PERIOD = 7 days;
    uint256 private _lock = 1;

    event UserInvestmentUpdated(
        uint256 indexed marketId,
        address indexed user,
        uint256 totalInvested,
        uint256 timestamp
    );
    event MarketCreated(
        uint256 indexed id,
        string question,
        string category,
        address yesToken,
        address noToken,
        uint256 endTime
    );
    event LiquidityAdded(
        uint256 indexed id,
        address indexed provider,
        uint256 yesAmount,
        uint256 noAmount,
        uint256 lpTokens
    );
    event LiquidityRemoved(
        uint256 indexed id,
        address indexed provider,
        uint256 yesAmount,
        uint256 noAmount,
        uint256 lpTokens
    );
    event Swap(
        uint256 indexed id,
        address indexed user,
        bool yesIn,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );
    event BuyWithBNB(
        uint256 indexed id,
        address indexed user,
        bool buyYes,
        uint256 bnbIn,
        uint256 tokenOut
    );
    event SellForBNB(
        uint256 indexed id,
        address indexed user,
        bool sellYes,
        uint256 tokenIn,
        uint256 bnbOut
    );
    event ResolutionRequested(
        uint256 indexed id,
        address requester,
        uint256 requestedAt
    );
    event MarketResolved(
        uint256 indexed id,
        Outcome outcome,
        string reason,
        uint256 confidence,
        address resolvedBy
    );
    event RedemptionClaimed(
        uint256 indexed id,
        address indexed user,
        uint256 amountClaimed
    );
    event OrderCreated(
        uint256 indexed orderId,
        address indexed user,
        uint256 indexed marketId,
        OrderType orderType,
        bool isYes,
        uint256 tokenAmount,
        uint256 triggerPrice
    );
    event OrderExecuted(
        uint256 indexed orderId,
        address indexed user,
        uint256 indexed marketId,
        uint256 amountReceived
    );
    event OrderCancelled(
        uint256 indexed orderId,
        address indexed user,
        uint256 indexed marketId
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyServer() {
        require(msg.sender == resolutionServer, "not resolution server");
        _;
    }

    modifier nonReentrant() {
        require(_lock == 1, "reentrancy");
        _lock = 2;
        _;
        _lock = 1;
    }

    modifier marketExists(uint256 id) {
        require(id < nextMarketId, "market does not exist");
        _;
    }

    constructor(uint32 _feeBps, uint32 _lpFeeBps, address _resolutionServer) {
        require(_feeBps <= 500, "fee too high");
        require(_lpFeeBps <= 10000, "LP share invalid");
        owner = msg.sender;
        feeBps = _feeBps;
        lpFeeBps = _lpFeeBps;
        resolutionServer = _resolutionServer;
    }

    function getMarketInfo(
        uint256 id
    )
        external
        view
        override
        marketExists(id)
        returns (MarketInfo memory mInfo)
    {
        Market storage m = markets[id];
        mInfo.creator = m.creator;
        mInfo.question = m.question;
        mInfo.category = m.category;
        mInfo.endTime = m.endTime;
        mInfo.status = uint8(m.status);
        mInfo.outcome = uint8(m.outcome);
        mInfo.yesPool = m.yesPool;
        mInfo.noPool = m.noPool;
        mInfo.totalBacking = m.totalBacking;
    }

    function getOrderInfo(
        uint256 id
    ) external view override returns (OrderInfo memory oInfo) {
        Order storage order = orders[id];
        oInfo.user = order.user;
        oInfo.marketId = order.marketId;
        oInfo.isYes = order.isYes;
        oInfo.tokenAmount = order.tokenAmount;
        oInfo.stopLossPrice = order.orderType == OrderType.StopLoss
            ? order.triggerPrice
            : 0;
        oInfo.takeProfitPrice = order.orderType == OrderType.TakeProfit
            ? order.triggerPrice
            : 0;
        oInfo.isActive = order.isActive;
    }

    function getUserOrders(
        address user
    ) external view override returns (uint256[] memory) {
        return userOrders[user];
    }

    // These two functions were missing and are needed for frontend trade estimation

    function getBuyYesOutput(
        uint256 id,
        uint256 bnbAmount
    )
        external
        view
        marketExists(id)
        returns (uint256 totalYesOut, uint256 totalFee)
    {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open, "market not open");
        require(bnbAmount > 0, "zero amount");

        uint256 platformFee = (bnbAmount * feeBps) / 10000;
        uint256 noAfterFee = bnbAmount - platformFee;
        uint256 yesOutFromSwap = _getAmountOut(noAfterFee, m.noPool, m.yesPool);

        totalYesOut = bnbAmount + yesOutFromSwap;
        totalFee = platformFee;
    }

    function getBuyNoOutput(
        uint256 id,
        uint256 bnbAmount
    )
        external
        view
        marketExists(id)
        returns (uint256 totalNoOut, uint256 totalFee)
    {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open, "market not open");
        require(bnbAmount > 0, "zero amount");

        uint256 platformFee = (bnbAmount * feeBps) / 10000;
        uint256 yesAfterFee = bnbAmount - platformFee;
        uint256 noOutFromSwap = _getAmountOut(yesAfterFee, m.yesPool, m.noPool);

        totalNoOut = bnbAmount + noOutFromSwap;
        totalFee = platformFee;
    }

    function buyYesWithBNBFor(
        uint256 id,
        address beneficiary,
        uint256 minYesOut
    ) external payable override nonReentrant marketExists(id) {
        _buyWithBNB(id, beneficiary, minYesOut, true);
    }

    function buyNoWithBNBFor(
        uint256 id,
        address beneficiary,
        uint256 minNoOut
    ) external payable override nonReentrant marketExists(id) {
        _buyWithBNB(id, beneficiary, minNoOut, false);
    }

    function _buyWithBNB(
        uint256 id,
        address beneficiary,
        uint256 minOut,
        bool isYes
    ) internal {
        require(beneficiary != address(0));
        Market storage m = markets[id];
        require(
            m.status == MarketStatus.Open &&
                block.timestamp < m.endTime &&
                msg.value > 0
        );

        uint256 amountIn = msg.value;
        _updateUserInvestment(id, beneficiary, amountIn);

        // 3% total fee: 2% creator + 1% platform
        uint256 totalFee = (amountIn * 300) / 10000; // 3% total
        uint256 creatorFee = (amountIn * 200) / 10000; // 2% to creator
        uint256 platformFee = totalFee - creatorFee; // 1% to platform
        uint256 amountToPool = amountIn - totalFee; // 97% to pool

        // Accumulate platform fees
        m.platformFees += platformFee;

        // Send creator fee directly to market creator
        if (creatorFee > 0) {
            _transferBNB(m.creator, creatorFee);
        }

        uint256 outAmount;
        uint256 totalOut;
        if (isYes) {
            outAmount = _getAmountOut(amountToPool, m.noPool, m.yesPool);
            require(outAmount <= m.yesPool && outAmount + amountIn >= minOut);
            totalOut = outAmount + amountIn;

            m.yesPool += amountToPool;
            m.noPool -= outAmount;
            m.yesToken.mint(beneficiary, totalOut);
        } else {
            outAmount = _getAmountOut(amountToPool, m.yesPool, m.noPool);
            require(outAmount <= m.noPool && outAmount + amountIn >= minOut);
            totalOut = outAmount + amountIn;

            m.noPool += amountToPool;
            m.yesPool -= outAmount;
            m.noToken.mint(beneficiary, totalOut);
        }
        m.totalBacking += amountIn;

        // Record the trade
        _recordTrade(id, beneficiary, true, isYes, amountIn, totalOut);

        emit BuyWithBNB(id, beneficiary, isYes, amountIn, totalOut);
    }

    function sellYesForBNB(
        uint256 id,
        uint256 tokenAmount,
        uint256 minBNBOut
    ) external nonReentrant marketExists(id) {
        _sellForBNB(id, tokenAmount, minBNBOut, true);
    }

    function sellNoForBNB(
        uint256 id,
        uint256 tokenAmount,
        uint256 minBNBOut
    ) external nonReentrant marketExists(id) {
        _sellForBNB(id, tokenAmount, minBNBOut, false);
    }

    function _sellForBNB(
        uint256 id,
        uint256 tokenAmount,
        uint256 minBNBOut,
        bool isYes
    ) internal {
        Market storage m = markets[id];
        require(
            m.status == MarketStatus.Open &&
                block.timestamp < m.endTime &&
                tokenAmount > 0
        );

        OutcomeToken token = isYes ? m.yesToken : m.noToken;
        require(token.balanceOf(msg.sender) >= tokenAmount);

        uint256 outAmount;
        if (isYes) {
            outAmount = _getAmountOut(tokenAmount, m.yesPool, m.noPool);
            require(outAmount <= m.noPool);
        } else {
            outAmount = _getAmountOut(tokenAmount, m.noPool, m.yesPool);
            require(outAmount <= m.yesPool);
        }

        require(outAmount >= minBNBOut && address(this).balance >= outAmount);

        // 3% total fee from BNB output: 2% creator + 1% platform
        uint256 totalFee = (outAmount * 300) / 10000; // 3% total
        uint256 creatorFee = (outAmount * 200) / 10000; // 2% to creator
        uint256 platformFee = totalFee - creatorFee; // 1% to platform
        uint256 userReceives = outAmount - totalFee; // 97% to user

        token.burn(msg.sender, tokenAmount);

        if (isYes) {
            m.noPool += tokenAmount;
            m.yesPool -= outAmount;
        } else {
            m.yesPool += tokenAmount;
            m.noPool -= outAmount;
        }

        m.totalBacking -= outAmount;

        // Accumulate platform fees
        m.platformFees += platformFee;

        // Send creator fee to market creator
        if (creatorFee > 0) {
            _transferBNB(m.creator, creatorFee);
        }

        // Send remaining to user
        _transferBNB(msg.sender, userReceives);

        // Record the trade
        _recordTrade(id, msg.sender, false, isYes, userReceives, tokenAmount);

        emit SellForBNB(id, msg.sender, isYes, tokenAmount, userReceives);
    }

    function createStopLossOrder(
        uint256 marketId,
        bool isYes,
        uint256 tokenAmount,
        uint256 stopLossPrice
    ) external override marketExists(marketId) returns (uint256) {
        return
            _createOrder(
                marketId,
                isYes,
                tokenAmount,
                stopLossPrice,
                OrderType.StopLoss
            );
    }

    function createTakeProfitOrder(
        uint256 marketId,
        bool isYes,
        uint256 tokenAmount,
        uint256 takeProfitPrice
    ) external override marketExists(marketId) returns (uint256) {
        return
            _createOrder(
                marketId,
                isYes,
                tokenAmount,
                takeProfitPrice,
                OrderType.TakeProfit
            );
    }

    function _createOrder(
        uint256 marketId,
        bool isYes,
        uint256 tokenAmount,
        uint256 triggerPrice,
        OrderType orderType
    ) internal returns (uint256) {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.Open && tokenAmount > 0);

        if (orderType == OrderType.StopLoss) {
            require(triggerPrice > 0 && triggerPrice < 10000);
        } else {
            require(triggerPrice > 10000);
        }

        OutcomeToken token = isYes ? m.yesToken : m.noToken;
        require(token.balanceOf(msg.sender) >= tokenAmount);

        uint256 orderId = nextOrderId++;
        orders[orderId] = Order(
            orderId,
            msg.sender,
            marketId,
            isYes,
            tokenAmount,
            triggerPrice,
            orderType,
            true,
            block.timestamp
        );
        userOrders[msg.sender].push(orderId);

        emit OrderCreated(
            orderId,
            msg.sender,
            marketId,
            orderType,
            isYes,
            tokenAmount,
            triggerPrice
        );

        return orderId;
    }

    function executeOrder(uint256 orderId) external override nonReentrant {
        Order storage order = orders[orderId];
        require(order.isActive);

        Market storage m = markets[order.marketId];
        require(m.status == MarketStatus.Open && block.timestamp < m.endTime);

        uint256 totalPool = m.yesPool + m.noPool;
        require(totalPool > 0);

        uint256 currentPrice = order.isYes
            ? (m.yesPool * 10000) / totalPool
            : (m.noPool * 10000) / totalPool;
        bool isTriggered = order.orderType == OrderType.StopLoss
            ? currentPrice <= order.triggerPrice
            : currentPrice >= order.triggerPrice;
        require(isTriggered);

        OutcomeToken tokenIn = order.isYes ? m.yesToken : m.noToken;
        require(tokenIn.balanceOf(order.user) >= order.tokenAmount);

        // Calculate swap output
        uint256 amountOut;
        OutcomeToken tokenOut;
        if (order.isYes) {
            amountOut = _getAmountOut(order.tokenAmount, m.yesPool, m.noPool);
            require(amountOut <= m.noPool);
            tokenIn.burn(order.user, order.tokenAmount);
            m.yesPool += order.tokenAmount;
            m.noPool -= amountOut;
            tokenOut = m.noToken;
        } else {
            amountOut = _getAmountOut(order.tokenAmount, m.noPool, m.yesPool);
            require(amountOut <= m.yesPool);
            tokenIn.burn(order.user, order.tokenAmount);
            m.noPool += order.tokenAmount;
            m.yesPool -= amountOut;
            tokenOut = m.yesToken;
        }

        // 3% total fee from output tokens: 2% creator + 1% platform
        uint256 totalFee = (amountOut * 300) / 10000; // 3% total
        uint256 creatorFee = (amountOut * 200) / 10000; // 2% to creator
        uint256 platformFee = totalFee - creatorFee; // 1% to platform
        uint256 userReceives = amountOut - totalFee; // 97% to user

        // Accumulate platform fees (in tokens)
        m.platformFees += platformFee;

        // Mint tokens to user and creator
        tokenOut.mint(order.user, userReceives);
        if (creatorFee > 0) {
            tokenOut.mint(m.creator, creatorFee);
        }

        order.isActive = false;

        emit OrderExecuted(orderId, order.user, order.marketId, userReceives);
        emit Swap(
            order.marketId,
            order.user,
            order.isYes,
            order.tokenAmount,
            userReceives,
            totalFee
        );
    }

    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.user == msg.sender && order.isActive);
        order.isActive = false;
        emit OrderCancelled(orderId, msg.sender, order.marketId);
    }

    function checkOrderTrigger(
        uint256 orderId
    ) external view returns (bool, uint256, uint256) {
        Order storage order = orders[orderId];
        require(order.isActive);
        Market storage m = markets[order.marketId];
        uint256 totalPool = m.yesPool + m.noPool;
        if (totalPool == 0) return (false, 0, order.triggerPrice);
        uint256 price = order.isYes
            ? (m.yesPool * 10000) / totalPool
            : (m.noPool * 10000) / totalPool;
        bool triggered = order.orderType == OrderType.StopLoss
            ? price <= order.triggerPrice
            : price >= order.triggerPrice;
        return (triggered, price, order.triggerPrice);
    }

    function createMarket(
        string calldata question,
        uint256 endTime,
        uint256 initialYes,
        uint256 initialNo
    ) external payable nonReentrant returns (uint256) {
        require(endTime > block.timestamp + 1 hours);
        require(bytes(question).length > 0 && bytes(question).length <= 280);
        require(
            initialYes > 0 &&
                initialNo > 0 &&
                (initialYes + initialNo) >= MIN_INITIAL_LIQUIDITY
        );
        require(msg.value >= (initialYes + initialNo));

        uint256 id = nextMarketId++;
        OutcomeToken yesToken = new OutcomeToken(
            string.concat("YES: ", _truncate(question, 50)),
            string.concat("YES", _toString(id)),
            address(this)
        );
        OutcomeToken noToken = new OutcomeToken(
            string.concat("NO: ", _truncate(question, 50)),
            string.concat("NO", _toString(id)),
            address(this)
        );

        markets[id] = Market(
            msg.sender,
            question,
            "",
            endTime,
            MarketStatus.Open,
            Outcome.Undecided,
            yesToken,
            noToken,
            initialYes,
            initialNo,
            0,
            initialYes + initialNo,
            0,
            0,
            address(0),
            "",
            0,
            0,
            address(0),
            ""
        );

        yesToken.mint(address(this), initialYes);
        noToken.mint(address(this), initialNo);

        uint256 liquidity = _sqrt(initialYes * initialNo);
        require(liquidity > MINIMUM_LIQUIDITY);

        markets[id].lpTotalSupply = liquidity;
        lpBalances[id][msg.sender] = liquidity - MINIMUM_LIQUIDITY;
        lpBalances[id][address(1)] = MINIMUM_LIQUIDITY;

        if (msg.value > (initialYes + initialNo)) {
            _transferBNB(msg.sender, msg.value - (initialYes + initialNo));
        }

        emit MarketCreated(
            id,
            question,
            "",
            address(yesToken),
            address(noToken),
            endTime
        );
        emit LiquidityAdded(
            id,
            msg.sender,
            initialYes,
            initialNo,
            liquidity - MINIMUM_LIQUIDITY
        );

        return id;
    }

    function addLiquidity(
        uint256 id,
        uint256 yesAmount,
        uint256 noAmount
    ) external nonReentrant marketExists(id) {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open);
        require(yesAmount > 0 && noAmount > 0);
        require(
            m.yesToken.balanceOf(msg.sender) >= yesAmount &&
                m.noToken.balanceOf(msg.sender) >= noAmount
        );

        m.yesToken.burn(msg.sender, yesAmount);
        m.noToken.burn(msg.sender, noAmount);

        uint256 liquidity = _sqrt(yesAmount * noAmount);
        require(liquidity > 0);

        m.lpTotalSupply += liquidity;
        lpBalances[id][msg.sender] += liquidity;

        m.yesPool += yesAmount;
        m.noPool += noAmount;

        emit LiquidityAdded(id, msg.sender, yesAmount, noAmount, liquidity);
    }

    function removeLiquidity(
        uint256 id,
        uint256 lpAmount
    ) external nonReentrant marketExists(id) {
        Market storage m = markets[id];
        require(lpAmount > 0 && lpBalances[id][msg.sender] >= lpAmount);
        uint256 totalSupply = m.lpTotalSupply;
        require(totalSupply > 0);

        uint256 yesAmount = (m.yesPool * lpAmount) / totalSupply;
        uint256 noAmount = (m.noPool * lpAmount) / totalSupply;

        lpBalances[id][msg.sender] -= lpAmount;
        m.lpTotalSupply -= lpAmount;

        m.yesPool -= yesAmount;
        m.noPool -= noAmount;

        m.yesToken.mint(msg.sender, yesAmount);
        m.noToken.mint(msg.sender, noAmount);

        emit LiquidityRemoved(id, msg.sender, yesAmount, noAmount, lpAmount);
    }

    function requestResolution(
        uint256 id,
        string calldata reason
    ) external marketExists(id) {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open);
        require(block.timestamp >= m.endTime);

        m.status = MarketStatus.ResolutionRequested;
        m.resolutionRequestedAt = block.timestamp;
        m.resolutionRequester = msg.sender;
        m.resolutionReason = reason;
        m.disputeDeadline = block.timestamp + DISPUTE_PERIOD;

        emit ResolutionRequested(id, msg.sender, block.timestamp);
    }

    function resolveMarket(
        uint256 id,
        uint8 outcomeIndex,
        string calldata reason,
        uint256 confidence
    ) external onlyServer marketExists(id) {
        Market storage m = markets[id];
        require(m.status == MarketStatus.ResolutionRequested);
        require(outcomeIndex <= 2);

        m.outcome = Outcome(outcomeIndex);
        m.status = MarketStatus.Resolved;
        m.resolutionReason = reason;
        m.resolutionConfidence = confidence;

        emit MarketResolved(id, m.outcome, reason, confidence, msg.sender);
    }

    function claimRedemption(
        uint256 id
    ) external nonReentrant marketExists(id) {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Resolved);

        uint256 yesTokens = m.yesToken.balanceOf(msg.sender);
        uint256 noTokens = m.noToken.balanceOf(msg.sender);

        if (m.outcome == Outcome.Yes) {
            require(yesTokens > 0);
            m.yesToken.burn(msg.sender, yesTokens);
            _transferBNB(msg.sender, yesTokens);
            emit RedemptionClaimed(id, msg.sender, yesTokens);
        } else if (m.outcome == Outcome.No) {
            require(noTokens > 0);
            m.noToken.burn(msg.sender, noTokens);
            _transferBNB(msg.sender, noTokens);
            emit RedemptionClaimed(id, msg.sender, noTokens);
        }
    }

    function withdrawPlatformFees(
        uint256 id
    ) external onlyOwner nonReentrant marketExists(id) {
        Market storage m = markets[id];
        uint256 fees = m.platformFees;
        require(fees > 0);

        m.platformFees = 0;
        _transferBNB(owner, fees);
    }

    /// @notice Returns current odds and prices
    ///         - Multiplier goes DOWN when that side is heavily bought (exactly what you want)
    ///         - 1_000_000 = 1.00x, 3_500_000 = 3.50x, etc.
    function getCurrentMultipliers(
        uint256 id
    )
        external
        view
        override
        marketExists(id)
        returns (
            uint256 yesMultiplier, // payout multiplier if YES wins
            uint256 noMultiplier, // payout multiplier if NO wins
            uint256 yesPrice, // 0–10000 (probability × 100)
            uint256 noPrice
        )
    {
        Market storage m = markets[id];
        uint256 totalPool = m.yesPool + m.noPool;

        if (totalPool == 0) {
            return (2_000_000, 2_000_000, 5000, 5000); // 2.00× both sides before any liquidity
        }

        yesPrice = (m.yesPool * 10000) / totalPool;
        noPrice = 10000 - yesPrice; // always adds up perfectly

        // CORRECT BEHAVIOUR:
        // More people buy YES → noPrice becomes smaller → yesMultiplier becomes smaller (worse odds)
        // More people buy NO  → yesPrice becomes smaller → noMultiplier becomes smaller
        yesMultiplier = (10000 * 1_000_000) / noPrice;
        noMultiplier = (10000 * 1_000_000) / yesPrice;

        // Your original 999× cap — kept exactly as requested
        if (yesMultiplier > 999_000_000) yesMultiplier = 999_000_000;
        if (noMultiplier > 999_000_000) noMultiplier = 999_000_000;
    }

    function _updateUserInvestment(
        uint256 marketId,
        address user,
        uint256 amount
    ) internal {
        UserInvestment storage inv = userInvestments[marketId][user];
        inv.totalInvested += amount;
        inv.lastUpdated = block.timestamp;
        emit UserInvestmentUpdated(
            marketId,
            user,
            inv.totalInvested,
            block.timestamp
        );
    }

    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256) {
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0);
        return (amountIn * reserveOut) / (reserveIn + amountIn);
    }

    function _transferBNB(address to, uint256 amount) internal {
        (bool success, ) = to.call{value: amount}("");
        require(success);
    }

    function transferMarketOwnership(
        uint256 id,
        address newOwner
    ) external marketExists(id) {
        require(newOwner != address(0), "zero address");
        Market storage m = markets[id];
        require(msg.sender == m.creator, "not market creator");
        require(m.status == MarketStatus.Open, "market not open");

        address previousOwner = m.creator;
        m.creator = newOwner;

        // emit MarketOwnershipTransferred(id, previousOwner, newOwner, block.timestamp);
    }

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _truncate(
        string memory str,
        uint256 maxLen
    ) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        if (strBytes.length <= maxLen) return str;
        bytes memory result = new bytes(maxLen);
        for (uint256 i = 0; i < maxLen; i++) {
            result[i] = strBytes[i];
        }
        return string(result);
    }

    // Helper function to record a trade
    function _recordTrade(
        uint256 marketId,
        address trader,
        bool isBuy,
        bool isYes,
        uint256 amount,
        uint256 tokenAmount
    ) internal {
        TradeInfo[] storage trades = marketTrades[marketId];

        // If we've hit the max, remove the oldest trade
        if (trades.length >= MAX_TRADES_STORED) {
            // Shift all elements left by one (remove first element)
            for (uint256 i = 0; i < trades.length - 1; i++) {
                trades[i] = trades[i + 1];
            }
            trades.pop();
        }

        // Add new trade
        trades.push(
            TradeInfo({
                trader: trader,
                isBuy: isBuy,
                isYes: isYes,
                amount: amount,
                tokenAmount: tokenAmount,
                timestamp: block.timestamp
            })
        );
    }

    // View function to get recent trades for a market
    function getRecentTrades(
        uint256 marketId,
        uint256 count
    ) external view returns (TradeInfo[] memory) {
        TradeInfo[] storage trades = marketTrades[marketId];
        uint256 totalTrades = trades.length;

        if (totalTrades == 0) {
            return new TradeInfo[](0);
        }

        // Return the last 'count' trades, or all if count > totalTrades
        uint256 returnCount = count > totalTrades ? totalTrades : count;
        TradeInfo[] memory recentTrades = new TradeInfo[](returnCount);

        // Copy trades in reverse order (most recent first)
        for (uint256 i = 0; i < returnCount; i++) {
            recentTrades[i] = trades[totalTrades - 1 - i];
        }

        return recentTrades;
    }

    receive() external payable {}
}

contract TradingBot {
    IPredictionMarket public predictionMarket;
    address public owner;

    event AutoTradeExecuted(
        uint256 indexed marketId,
        bool isYes,
        uint256 amount,
        uint256 tokensReceived
    );
    event OrderMonitored(
        uint256 indexed orderId,
        bool shouldExecute,
        uint256 currentPrice
    );

    constructor(address _predictionMarket) {
        predictionMarket = IPredictionMarket(_predictionMarket);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function autoBuyYes(
        uint256 marketId,
        address beneficiary,
        uint256 minYesOut
    ) external payable onlyOwner {
        predictionMarket.buyYesWithBNBFor{value: msg.value}(
            marketId,
            beneficiary,
            minYesOut
        );
        emit AutoTradeExecuted(marketId, true, msg.value, minYesOut);
    }

    function autoBuyNo(
        uint256 marketId,
        address beneficiary,
        uint256 minNoOut
    ) external payable onlyOwner {
        predictionMarket.buyNoWithBNBFor{value: msg.value}(
            marketId,
            beneficiary,
            minNoOut
        );
        emit AutoTradeExecuted(marketId, false, msg.value, minNoOut);
    }

    function getMarketData(
        uint256 marketId
    ) external view returns (IPredictionMarket.MarketInfo memory) {
        return predictionMarket.getMarketInfo(marketId);
    }

    function getMultipliers(
        uint256 marketId
    )
        external
        view
        returns (
            uint256 yesMultiplier,
            uint256 noMultiplier,
            uint256 yesPrice,
            uint256 noPrice
        )
    {
        return predictionMarket.getCurrentMultipliers(marketId);
    }

    function monitorAndExecuteOrder(uint256 orderId) external {
        predictionMarket.executeOrder(orderId);
    }

    function batchMonitorOrders(
        uint256[] calldata orderIds
    ) external view returns (bool[] memory) {
        bool[] memory shouldExecute = new bool[](orderIds.length);
        for (uint256 i = 0; i < orderIds.length; i++) {
            IPredictionMarket.OrderInfo memory orderInfo = predictionMarket
                .getOrderInfo(orderIds[i]);
            if (orderInfo.isActive) {
                (, , uint256 yesPrice, uint256 noPrice) = predictionMarket
                    .getCurrentMultipliers(orderInfo.marketId);
                uint256 currentPrice = orderInfo.isYes ? yesPrice : noPrice;
                if (orderInfo.stopLossPrice > 0)
                    shouldExecute[i] = currentPrice <= orderInfo.stopLossPrice;
                else if (orderInfo.takeProfitPrice > 0)
                    shouldExecute[i] =
                        currentPrice >= orderInfo.takeProfitPrice;
            }
        }
        return shouldExecute;
    }

    function createStopLossForUser(
        uint256 marketId,
        bool isYes,
        uint256 tokenAmount,
        uint256 stopLossPrice
    ) external onlyOwner returns (uint256) {
        return
            predictionMarket.createStopLossOrder(
                marketId,
                isYes,
                tokenAmount,
                stopLossPrice
            );
    }

    function createTakeProfitForUser(
        uint256 marketId,
        bool isYes,
        uint256 tokenAmount,
        uint256 takeProfitPrice
    ) external onlyOwner returns (uint256) {
        return
            predictionMarket.createTakeProfitOrder(
                marketId,
                isYes,
                tokenAmount,
                takeProfitPrice
            );
    }

    function getUserOrders(
        address user
    ) external view returns (uint256[] memory) {
        return predictionMarket.getUserOrders(user);
    }

    receive() external payable {}
}
