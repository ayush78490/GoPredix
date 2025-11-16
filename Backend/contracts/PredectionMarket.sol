// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// PDX Token Interface
interface IPDX {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

// Prediction Market Interface for external calls
interface IPredictionMarketExternal {
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
        uint256 pdxBacking;
        uint256 bnbBacking;
        uint256 totalLiquidity;
    }

    struct OrderInfo {
        address user;
        uint256 marketId;
        bool isYes;
        uint256 tokenAmount;
        uint256 stopLossPrice;
        uint256 takeProfitPrice;
        bool isActive;
        uint256 createdAt;
    }

    struct UserPosition {
        uint256 yesBalance;
        uint256 noBalance;
        uint256 totalInvestedPDX;
        uint256 totalInvestedBNB;
        uint256 lpBalance;
    }

    function getMarketInfo() external view returns (MarketInfo memory);
    function getOrderInfo(uint256 orderId) external view returns (OrderInfo memory);
    function getUserOrders(address user) external view returns (uint256[] memory);
    function getCurrentMultipliers() external view returns (uint256, uint256, uint256, uint256);
    function getUserPosition(address user) external view returns (UserPosition memory);
    
    function buyYesWithPDXFor(address beneficiary, uint256 minYesOut, uint256 pdxAmount) external;
    function buyNoWithPDXFor(address beneficiary, uint256 minNoOut, uint256 pdxAmount) external;
    function buyYesWithBNBFor(address beneficiary, uint256 minYesOut) external payable;
    function buyNoWithBNBFor(address beneficiary, uint256 minNoOut) external payable;
    
    function sellYesForPDX(uint256 tokenAmount, uint256 minPDXOut) external;
    function sellNoForPDX(uint256 tokenAmount, uint256 minPDXOut) external;
    function sellYesForBNB(uint256 tokenAmount, uint256 minBNBOut) external;
    function sellNoForBNB(uint256 tokenAmount, uint256 minBNBOut) external;
    
    function createStopLossOrder(bool isYes, uint256 tokenAmount, uint256 stopLossPrice) external returns (uint256);
    function createTakeProfitOrder(bool isYes, uint256 tokenAmount, uint256 takeProfitPrice) external returns (uint256);
    function executeOrder(uint256 orderId) external;
    function cancelOrder(uint256 orderId) external;
    
    function addLiquidity(uint256 yesAmount, uint256 noAmount) external;
    function removeLiquidity(uint256 lpAmount) external;
    
    function requestResolution(string calldata reason) external;
    function claimRedemption() external;
}

// Outcome Token Contract (replicated for completeness)
contract OutcomeToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    address public immutable market;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

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

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(to != address(0), "zero address");
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "insufficient allowance");
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
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

// Main Prediction Market Contract
contract PredictionMarket is IPredictionMarketExternal {
    enum MarketStatus { Open, Closed, ResolutionRequested, Resolved, Disputed }
    enum Outcome { Undecided, Yes, No }
    enum OrderType { StopLoss, TakeProfit }
    enum PaymentToken { PDX, BNB }

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
        uint256 pdxBacking;
        uint256 bnbBacking;
        uint256 platformFeesPDX;
        uint256 platformFeesBNB;
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
        bool isYes;
        uint256 tokenAmount;
        uint256 triggerPrice;
        OrderType orderType;
        bool isActive;
        uint256 createdAt;
    }

    struct UserInvestment {
        uint256 totalInvestedPDX;
        uint256 totalInvestedBNB;
        uint256 lastUpdated;
    }

    IPDX public immutable pdxToken;
    address public factory;
    address public owner;
    uint32 public feeBps;
    uint32 public lpFeeBps;
    address public resolutionServer;
    
    Market public market;
    uint256 public nextOrderId;
    
    mapping(address => uint256) public lpBalances;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders;
    mapping(address => UserInvestment) public userInvestments;

    uint256 constant MINIMUM_LIQUIDITY = 1_000;
    uint256 constant MIN_INITIAL_LIQUIDITY = 0.01 ether;
    uint256 constant DISPUTE_PERIOD = 7 days;
    uint256 private _lock = 1;

    event UserInvestmentUpdated(address indexed user, uint256 totalInvestedPDX, uint256 totalInvestedBNB, uint256 timestamp);
    event LiquidityAdded(address indexed provider, uint256 yesAmount, uint256 noAmount, uint256 lpTokens);
    event LiquidityRemoved(address indexed provider, uint256 yesAmount, uint256 noAmount, uint256 lpTokens);
    event Swap(address indexed user, bool yesIn, uint256 amountIn, uint256 amountOut, uint256 fee, PaymentToken paymentToken);
    event BuyWithPDX(address indexed user, bool buyYes, uint256 pdxIn, uint256 tokenOut);
    event BuyWithBNB(address indexed user, bool buyYes, uint256 bnbIn, uint256 tokenOut);
    event SellForPDX(address indexed user, bool sellYes, uint256 tokenIn, uint256 pdxOut);
    event SellForBNB(address indexed user, bool sellYes, uint256 tokenIn, uint256 bnbOut);
    event ResolutionRequested(address requester, uint256 requestedAt);
    event MarketResolved(Outcome outcome, string reason, uint256 confidence, address resolvedBy);
    event RedemptionClaimed(address indexed user, uint256 amountClaimed, PaymentToken paymentToken);
    event OrderCreated(uint256 indexed orderId, address indexed user, OrderType orderType, bool isYes, uint256 tokenAmount, uint256 triggerPrice);
    event OrderExecuted(uint256 indexed orderId, address indexed user, uint256 amountReceived);
    event OrderCancelled(uint256 indexed orderId, address indexed user);

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

    modifier marketOpen() {
        require(market.status == MarketStatus.Open, "market not open");
        require(block.timestamp < market.endTime, "market ended");
        _;
    }

    modifier marketExists() {
        require(market.creator != address(0), "market not initialized");
        _;
    }

    constructor(
        address _pdxToken,
        address _creator,
        string memory _question,
        string memory _category,
        uint256 _endTime,
        uint256 _initialYes,
        uint256 _initialNo,
        uint32 _feeBps,
        uint32 _lpFeeBps,
        address _resolutionServer
    ) {
        require(_pdxToken != address(0), "invalid PDX token");
        require(_creator != address(0), "invalid creator");
        
        factory = msg.sender;
        pdxToken = IPDX(_pdxToken);
        owner = _creator;
        feeBps = _feeBps;
        lpFeeBps = _lpFeeBps;
        resolutionServer = _resolutionServer;

        // Create outcome tokens
        market.yesToken = new OutcomeToken(string.concat("YES: ", _truncate(_question, 50)), "YES", address(this));
        market.noToken = new OutcomeToken(string.concat("NO: ", _truncate(_question, 50)), "NO", address(this));

        // Initialize market
        market.creator = _creator;
        market.question = _question;
        market.category = _category;
        market.endTime = _endTime;
        market.status = MarketStatus.Open;
        market.outcome = Outcome.Undecided;
        market.yesPool = _initialYes;
        market.noPool = _initialNo;
    }

    function initializeWithPDX(uint256 pdxAmount) external {
        require(msg.sender == factory, "only factory");
        require(market.yesPool > 0 && market.noPool > 0, "already initialized");

        // Mint initial tokens to this contract
        market.yesToken.mint(address(this), market.yesPool);
        market.noToken.mint(address(this), market.noPool);

        // Set up liquidity
        uint256 liquidity = _sqrt(market.yesPool * market.noPool);
        require(liquidity > MINIMUM_LIQUIDITY, "insufficient liquidity");

        market.lpTotalSupply = liquidity;
        lpBalances[owner] = liquidity - MINIMUM_LIQUIDITY;
        lpBalances[address(1)] = MINIMUM_LIQUIDITY;

        market.totalBacking = market.yesPool + market.noPool;
        market.pdxBacking = market.yesPool + market.noPool;

        // Refund excess PDX
        if (pdxAmount > market.totalBacking) {
            require(pdxToken.transfer(owner, pdxAmount - market.totalBacking), "PDX refund failed");
        }
    }

    function initializeWithBNB() external payable {
        require(msg.sender == factory, "only factory");
        require(market.yesPool > 0 && market.noPool > 0, "already initialized");

        // Mint initial tokens to this contract
        market.yesToken.mint(address(this), market.yesPool);
        market.noToken.mint(address(this), market.noPool);

        // Set up liquidity
        uint256 liquidity = _sqrt(market.yesPool * market.noPool);
        require(liquidity > MINIMUM_LIQUIDITY, "insufficient liquidity");

        market.lpTotalSupply = liquidity;
        lpBalances[owner] = liquidity - MINIMUM_LIQUIDITY;
        lpBalances[address(1)] = MINIMUM_LIQUIDITY;

        market.totalBacking = market.yesPool + market.noPool;
        market.bnbBacking = market.yesPool + market.noPool;

        // Refund excess BNB
        if (msg.value > market.totalBacking) {
            (bool success, ) = owner.call{value: msg.value - market.totalBacking}("");
            require(success, "BNB refund failed");
        }
    }

    // ==================== VIEW FUNCTIONS ====================

    function getMarketInfo() external view override returns (MarketInfo memory) {
        return MarketInfo({
            creator: market.creator,
            question: market.question,
            category: market.category,
            endTime: market.endTime,
            status: uint8(market.status),
            outcome: uint8(market.outcome),
            yesPool: market.yesPool,
            noPool: market.noPool,
            totalBacking: market.totalBacking,
            pdxBacking: market.pdxBacking,
            bnbBacking: market.bnbBacking,
            totalLiquidity: market.lpTotalSupply
        });
    }

    function getOrderInfo(uint256 orderId) external view override returns (OrderInfo memory) {
        Order storage order = orders[orderId];
        return OrderInfo({
            user: order.user,
            marketId: 0, // Single market doesn't need ID
            isYes: order.isYes,
            tokenAmount: order.tokenAmount,
            stopLossPrice: order.orderType == OrderType.StopLoss ? order.triggerPrice : 0,
            takeProfitPrice: order.orderType == OrderType.TakeProfit ? order.triggerPrice : 0,
            isActive: order.isActive,
            createdAt: order.createdAt
        });
    }

    function getUserOrders(address user) external view override returns (uint256[] memory) {
        return userOrders[user];
    }

    function getUserPosition(address user) external view override returns (UserPosition memory) {
        return UserPosition({
            yesBalance: market.yesToken.balanceOf(user),
            noBalance: market.noToken.balanceOf(user),
            totalInvestedPDX: userInvestments[user].totalInvestedPDX,
            totalInvestedBNB: userInvestments[user].totalInvestedBNB,
            lpBalance: lpBalances[user]
        });
    }

    function getCurrentMultipliers() external view override returns (uint256 yesMultiplier, uint256 noMultiplier, uint256 yesPrice, uint256 noPrice) {
        uint256 totalPool = market.yesPool + market.noPool;
        if (totalPool == 0) return (10000, 10000, 5000, 5000);

        yesPrice = (market.yesPool * 10000) / totalPool;
        noPrice = (market.noPool * 10000) / totalPool;

        yesMultiplier = yesPrice > 0 ? (1e6) / yesPrice : type(uint256).max;
        noMultiplier = noPrice > 0 ? (1e6) / noPrice : type(uint256).max;
    }

    // ==================== TRADING FUNCTIONS ====================

    function buyYesWithPDXFor(address beneficiary, uint256 minYesOut, uint256 pdxAmount) external override nonReentrant marketExists marketOpen {
        _buyWithToken(beneficiary, minYesOut, true, pdxAmount, PaymentToken.PDX);
    }

    function buyNoWithPDXFor(address beneficiary, uint256 minNoOut, uint256 pdxAmount) external override nonReentrant marketExists marketOpen {
        _buyWithToken(beneficiary, minNoOut, false, pdxAmount, PaymentToken.PDX);
    }

    function buyYesWithBNBFor(address beneficiary, uint256 minYesOut) external payable override nonReentrant marketExists marketOpen {
        _buyWithToken(beneficiary, minYesOut, true, msg.value, PaymentToken.BNB);
    }

    function buyNoWithBNBFor(address beneficiary, uint256 minNoOut) external payable override nonReentrant marketExists marketOpen {
        _buyWithToken(beneficiary, minNoOut, false, msg.value, PaymentToken.BNB);
    }

    function _buyWithToken(address beneficiary, uint256 minOut, bool isYes, uint256 amount, PaymentToken paymentToken) internal {
        require(beneficiary != address(0), "zero beneficiary");
        require(amount > 0, "zero amount");

        // Handle token transfer
        if (paymentToken == PaymentToken.PDX) {
            require(pdxToken.transferFrom(msg.sender, address(this), amount), "PDX transfer failed");
            market.pdxBacking += amount;
            _updateUserInvestment(beneficiary, amount, 0);
        } else {
            market.bnbBacking += amount;
            _updateUserInvestment(beneficiary, 0, amount);
        }

        uint256 platformFee = (amount * feeBps) / 10000;
        uint256 lpFee = (platformFee * lpFeeBps) / 10000;
        uint256 protocolFee = platformFee - lpFee;
        uint256 amountAfterFee = amount - platformFee;

        // Update platform fees
        if (paymentToken == PaymentToken.PDX) {
            market.platformFeesPDX += protocolFee;
        } else {
            market.platformFeesBNB += protocolFee;
        }

        uint256 outAmount;
        if (isYes) {
            outAmount = _getAmountOut(amountAfterFee, market.noPool, market.yesPool);
            require(outAmount >= minOut, "slippage too high");
            require(outAmount <= market.yesPool, "insufficient liquidity");

            market.noPool += amountAfterFee + lpFee;
            market.yesPool -= outAmount;
            market.yesToken.mint(beneficiary, outAmount);
            
            if (paymentToken == PaymentToken.PDX) {
                emit BuyWithPDX(beneficiary, true, amount, outAmount);
            } else {
                emit BuyWithBNB(beneficiary, true, amount, outAmount);
            }
        } else {
            outAmount = _getAmountOut(amountAfterFee, market.yesPool, market.noPool);
            require(outAmount >= minOut, "slippage too high");
            require(outAmount <= market.noPool, "insufficient liquidity");

            market.yesPool += amountAfterFee + lpFee;
            market.noPool -= outAmount;
            market.noToken.mint(beneficiary, outAmount);
            
            if (paymentToken == PaymentToken.PDX) {
                emit BuyWithPDX(beneficiary, false, amount, outAmount);
            } else {
                emit BuyWithBNB(beneficiary, false, amount, outAmount);
            }
        }
        
        market.totalBacking += amount;
        emit Swap(beneficiary, isYes, amount, outAmount, platformFee, paymentToken);
    }

    function sellYesForPDX(uint256 tokenAmount, uint256 minPDXOut) external override nonReentrant marketExists marketOpen {
        _sellForToken(tokenAmount, minPDXOut, true, PaymentToken.PDX);
    }

    function sellNoForPDX(uint256 tokenAmount, uint256 minPDXOut) external override nonReentrant marketExists marketOpen {
        _sellForToken(tokenAmount, minPDXOut, false, PaymentToken.PDX);
    }

    function sellYesForBNB(uint256 tokenAmount, uint256 minBNBOut) external override nonReentrant marketExists marketOpen {
        _sellForToken(tokenAmount, minBNBOut, true, PaymentToken.BNB);
    }

    function sellNoForBNB(uint256 tokenAmount, uint256 minBNBOut) external override nonReentrant marketExists marketOpen {
        _sellForToken(tokenAmount, minBNBOut, false, PaymentToken.BNB);
    }

    function _sellForToken(uint256 tokenAmount, uint256 minOut, bool isYes, PaymentToken paymentToken) internal {
        require(tokenAmount > 0, "zero amount");

        OutcomeToken token = isYes ? market.yesToken : market.noToken;
        require(token.balanceOf(msg.sender) >= tokenAmount, "insufficient balance");

        uint256 platformFee = (tokenAmount * feeBps) / 10000;
        uint256 lpFee = (platformFee * lpFeeBps) / 10000;
        uint256 protocolFee = platformFee - lpFee;
        uint256 tokenAfterFee = tokenAmount - platformFee;

        // Update platform fees
        if (paymentToken == PaymentToken.PDX) {
            market.platformFeesPDX += protocolFee;
        } else {
            market.platformFeesBNB += protocolFee;
        }

        uint256 outAmount;
        if (isYes) {
            outAmount = _getAmountOut(tokenAfterFee, market.yesPool, market.noPool);
            require(outAmount <= market.noPool, "insufficient liquidity");
        } else {
            outAmount = _getAmountOut(tokenAfterFee, market.noPool, market.yesPool);
            require(outAmount <= market.yesPool, "insufficient liquidity");
        }

        // Check output and balances
        if (paymentToken == PaymentToken.PDX) {
            require(outAmount >= minOut, "slippage too high");
            require(pdxToken.balanceOf(address(this)) >= outAmount, "insufficient PDX");
            require(market.pdxBacking >= outAmount, "insufficient PDX backing");
        } else {
            require(outAmount >= minOut, "slippage too high");
            require(address(this).balance >= outAmount, "insufficient BNB");
            require(market.bnbBacking >= outAmount, "insufficient BNB backing");
        }

        token.burn(msg.sender, tokenAmount);

        if (isYes) {
            market.yesPool += tokenAfterFee + lpFee;
            market.noPool -= outAmount;
        } else {
            market.noPool += tokenAfterFee + lpFee;
            market.yesPool -= outAmount;
        }

        // Transfer output
        if (paymentToken == PaymentToken.PDX) {
            market.pdxBacking -= outAmount;
            market.totalBacking -= outAmount;
            require(pdxToken.transfer(msg.sender, outAmount), "PDX transfer failed");
            emit SellForPDX(msg.sender, isYes, tokenAmount, outAmount);
        } else {
            market.bnbBacking -= outAmount;
            market.totalBacking -= outAmount;
            (bool success, ) = msg.sender.call{value: outAmount}("");
            require(success, "BNB transfer failed");
            emit SellForBNB(msg.sender, isYes, tokenAmount, outAmount);
        }

        emit Swap(msg.sender, isYes, tokenAmount, outAmount, platformFee, paymentToken);
    }

    // ==================== ORDER MANAGEMENT ====================

    function createStopLossOrder(bool isYes, uint256 tokenAmount, uint256 stopLossPrice) external override marketExists marketOpen returns (uint256) {
        return _createOrder(isYes, tokenAmount, stopLossPrice, OrderType.StopLoss);
    }

    function createTakeProfitOrder(bool isYes, uint256 tokenAmount, uint256 takeProfitPrice) external override marketExists marketOpen returns (uint256) {
        return _createOrder(isYes, tokenAmount, takeProfitPrice, OrderType.TakeProfit);
    }

    function _createOrder(bool isYes, uint256 tokenAmount, uint256 triggerPrice, OrderType orderType) internal returns (uint256) {
        require(tokenAmount > 0, "zero amount");

        if (orderType == OrderType.StopLoss) { 
            require(triggerPrice > 0 && triggerPrice < 10000, "invalid stop loss price"); 
        } else { 
            require(triggerPrice > 10000 && triggerPrice <= 20000, "invalid take profit price"); 
        }

        OutcomeToken token = isYes ? market.yesToken : market.noToken;
        require(token.balanceOf(msg.sender) >= tokenAmount, "insufficient balance");

        uint256 orderId = nextOrderId++;
        orders[orderId] = Order({
            orderId: orderId,
            user: msg.sender,
            isYes: isYes,
            tokenAmount: tokenAmount,
            triggerPrice: triggerPrice,
            orderType: orderType,
            isActive: true,
            createdAt: block.timestamp
        });
        
        userOrders[msg.sender].push(orderId);

        emit OrderCreated(orderId, msg.sender, orderType, isYes, tokenAmount, triggerPrice);
        return orderId;
    }

    function executeOrder(uint256 orderId) external override nonReentrant {
        Order storage order = orders[orderId];
        require(order.isActive, "order not active");

        require(market.status == MarketStatus.Open && block.timestamp < market.endTime, "market not open");

        uint256 totalPool = market.yesPool + market.noPool;
        require(totalPool > 0, "no liquidity");

        uint256 currentPrice = order.isYes ? (market.yesPool * 10000) / totalPool : (market.noPool * 10000) / totalPool;
        bool isTriggered = order.orderType == OrderType.StopLoss ? currentPrice <= order.triggerPrice : currentPrice >= order.triggerPrice;
        require(isTriggered, "order not triggered");

        OutcomeToken tokenIn = order.isYes ? market.yesToken : market.noToken;
        require(tokenIn.balanceOf(order.user) >= order.tokenAmount, "insufficient balance");

        uint256 platformFee = (order.tokenAmount * feeBps) / 10000;
        uint256 lpFee = (platformFee * lpFeeBps) / 10000;
        uint256 protocolFee = platformFee - lpFee;
        uint256 amountAfterFee = order.tokenAmount - platformFee;
        
        // Fee goes to PDX pool (since orders are token-to-token)
        market.platformFeesPDX += protocolFee;

        uint256 amountOut;
        OutcomeToken tokenOut;
        if (order.isYes) {
            amountOut = _getAmountOut(amountAfterFee, market.yesPool, market.noPool);
            require(amountOut <= market.noPool, "insufficient liquidity");
            
            tokenIn.burn(order.user, order.tokenAmount);
            market.yesPool += amountAfterFee + lpFee;
            market.noPool -= amountOut;
            tokenOut = market.noToken;
        } else {
            amountOut = _getAmountOut(amountAfterFee, market.noPool, market.yesPool);
            require(amountOut <= market.yesPool, "insufficient liquidity");
            
            tokenIn.burn(order.user, order.tokenAmount);
            market.noPool += amountAfterFee + lpFee;
            market.yesPool -= amountOut;
            tokenOut = market.yesToken;
        }

        tokenOut.mint(order.user, amountOut);
        order.isActive = false;

        emit OrderExecuted(orderId, order.user, amountOut);
        emit Swap(order.user, order.isYes, order.tokenAmount, amountOut, platformFee, PaymentToken.PDX);
    }

    function cancelOrder(uint256 orderId) external override {
        Order storage order = orders[orderId];
        require(order.user == msg.sender && order.isActive, "not owner or inactive");
        order.isActive = false;
        emit OrderCancelled(orderId, msg.sender);
    }

    function checkOrderTrigger(uint256 orderId) external view returns (bool, uint256, uint256) {
        Order storage order = orders[orderId];
        require(order.isActive, "order not active");
        uint256 totalPool = market.yesPool + market.noPool;
        if (totalPool == 0) return (false, 0, order.triggerPrice);
        uint256 price = order.isYes ? (market.yesPool * 10000) / totalPool : (market.noPool * 10000) / totalPool;
        bool triggered = order.orderType == OrderType.StopLoss ? price <= order.triggerPrice : price >= order.triggerPrice;
        return (triggered, price, order.triggerPrice);
    }

    // ==================== LIQUIDITY MANAGEMENT ====================

    function addLiquidity(uint256 yesAmount, uint256 noAmount) external override nonReentrant marketExists marketOpen {
        require(yesAmount > 0 && noAmount > 0, "zero amount");
        require(market.yesToken.balanceOf(msg.sender) >= yesAmount && market.noToken.balanceOf(msg.sender) >= noAmount, "insufficient balance");

        market.yesToken.burn(msg.sender, yesAmount);
        market.noToken.burn(msg.sender, noAmount);

        uint256 liquidity = _sqrt(yesAmount * noAmount);
        require(liquidity > 0, "insufficient liquidity");

        market.lpTotalSupply += liquidity;
        lpBalances[msg.sender] += liquidity;

        market.yesPool += yesAmount;
        market.noPool += noAmount;

        emit LiquidityAdded(msg.sender, yesAmount, noAmount, liquidity);
    }

    function removeLiquidity(uint256 lpAmount) external override nonReentrant marketExists {
        require(lpAmount > 0 && lpBalances[msg.sender] >= lpAmount, "insufficient LP");
        uint256 totalSupply = market.lpTotalSupply;
        require(totalSupply > 0, "no liquidity");

        uint256 yesAmount = (market.yesPool * lpAmount) / totalSupply;
        uint256 noAmount = (market.noPool * lpAmount) / totalSupply;

        lpBalances[msg.sender] -= lpAmount;
        market.lpTotalSupply -= lpAmount;

        market.yesPool -= yesAmount;
        market.noPool -= noAmount;

        market.yesToken.mint(msg.sender, yesAmount);
        market.noToken.mint(msg.sender, noAmount);

        emit LiquidityRemoved(msg.sender, yesAmount, noAmount, lpAmount);
    }

    // ==================== RESOLUTION & REDEMPTION ====================

    function requestResolution(string calldata reason) external override marketExists {
        require(market.status == MarketStatus.Open, "market not open");
        require(block.timestamp >= market.endTime, "market not ended");

        market.status = MarketStatus.ResolutionRequested;
        market.resolutionRequestedAt = block.timestamp;
        market.resolutionRequester = msg.sender;
        market.resolutionReason = reason;
        market.disputeDeadline = block.timestamp + DISPUTE_PERIOD;

        emit ResolutionRequested(msg.sender, block.timestamp);
    }

    function resolveMarket(uint8 outcomeIndex, string calldata reason, uint256 confidence) external onlyServer {
        require(market.status == MarketStatus.ResolutionRequested, "resolution not requested");
        require(outcomeIndex <= 2, "invalid outcome");

        market.outcome = Outcome(outcomeIndex);
        market.status = MarketStatus.Resolved;
        market.resolutionReason = reason;
        market.resolutionConfidence = confidence;

        emit MarketResolved(market.outcome, reason, confidence, msg.sender);
    }

    function claimRedemption() external override nonReentrant marketExists {
        require(market.status == MarketStatus.Resolved, "market not resolved");

        uint256 yesTokens = market.yesToken.balanceOf(msg.sender);
        uint256 noTokens = market.noToken.balanceOf(msg.sender);

        if (market.outcome == Outcome.Yes && yesTokens > 0) {
            market.yesToken.burn(msg.sender, yesTokens);
            _distributeRedemption(msg.sender, yesTokens, true);
            
        } else if (market.outcome == Outcome.No && noTokens > 0) {
            market.noToken.burn(msg.sender, noTokens);
            _distributeRedemption(msg.sender, noTokens, false);
        }
    }

    function _distributeRedemption(address user, uint256 tokens, bool isYes) internal {
        // Calculate total winning tokens
        uint256 totalWinningTokens = isYes ? market.yesToken.totalSupply() : market.noToken.totalSupply();
        require(totalWinningTokens > 0, "no winning tokens");
        
        // Calculate user's share
        uint256 userShare = (tokens * 1e18) / totalWinningTokens;
        
        // Calculate amounts from both PDX and BNB backing
        uint256 pdxAmount = (userShare * market.pdxBacking) / 1e18;
        uint256 bnbAmount = (userShare * market.bnbBacking) / 1e18;
        
        // Transfer PDX if any
        if (pdxAmount > 0) {
            require(pdxToken.transfer(user, pdxAmount), "PDX transfer failed");
            market.pdxBacking -= pdxAmount;
            emit RedemptionClaimed(user, pdxAmount, PaymentToken.PDX);
        }
        
        // Transfer BNB if any
        if (bnbAmount > 0) {
            (bool success, ) = user.call{value: bnbAmount}("");
            require(success, "BNB transfer failed");
            market.bnbBacking -= bnbAmount;
            emit RedemptionClaimed(user, bnbAmount, PaymentToken.BNB);
        }
        
        market.totalBacking -= (pdxAmount + bnbAmount);
    }

    // ==================== ADMIN FUNCTIONS ====================

    function withdrawPlatformFeesPDX() external onlyOwner nonReentrant {
        uint256 fees = market.platformFeesPDX;
        require(fees > 0, "no PDX fees");

        market.platformFeesPDX = 0;
        require(pdxToken.transfer(owner, fees), "PDX transfer failed");
    }

    function withdrawPlatformFeesBNB() external onlyOwner nonReentrant {
        uint256 fees = market.platformFeesBNB;
        require(fees > 0, "no BNB fees");

        market.platformFeesBNB = 0;
        (bool success, ) = owner.call{value: fees}("");
        require(success, "BNB transfer failed");
    }

    // ==================== INTERNAL HELPER FUNCTIONS ====================

    function _updateUserInvestment(address user, uint256 pdxAmount, uint256 bnbAmount) internal {
        UserInvestment storage inv = userInvestments[user];
        inv.totalInvestedPDX += pdxAmount;
        inv.totalInvestedBNB += bnbAmount;
        inv.lastUpdated = block.timestamp;
        emit UserInvestmentUpdated(user, inv.totalInvestedPDX, inv.totalInvestedBNB, block.timestamp);
    }

    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256) {
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0, "invalid amounts");
        uint256 numerator = amountIn * reserveOut;
        uint256 denominator = reserveIn + amountIn;
        return numerator / denominator;
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

    function _truncate(string memory str, uint256 maxLen) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        if (strBytes.length <= maxLen) return str;
        bytes memory result = new bytes(maxLen);
        for (uint256 i = 0; i < maxLen; i++) {
            result[i] = strBytes[i];
        }
        return string(result);
    }

    // ==================== FALLBACK FUNCTION ====================

    receive() external payable {}
}