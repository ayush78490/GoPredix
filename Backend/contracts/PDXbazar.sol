// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PDX Prediction Market
 * @notice Prediction market using PDX tokens instead of BNB
 * @dev Adapted from BNB version - liquidity features removed
 */

// ==================== OUTCOME TOKEN ====================

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

// ==================== INTERFACES ====================

interface IPDX {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IPDXPredictionMarket {
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

    function getMarketInfo(uint256 marketId) external view returns (MarketInfo memory);
    function getCurrentMultipliers(uint256 id) external view returns (uint256, uint256, uint256, uint256);
    function buyYesWithPDXFor(uint256 id, address beneficiary, uint256 minYesOut, uint256 pdxAmount) external;
    function buyNoWithPDXFor(uint256 id, address beneficiary, uint256 minNoOut, uint256 pdxAmount) external;
    function createStopLossOrder(uint256 marketId, bool isYes, uint256 tokenAmount, uint256 stopLossPrice) external returns (uint256);
    function createTakeProfitOrder(uint256 marketId, bool isYes, uint256 tokenAmount, uint256 takeProfitPrice) external returns (uint256);
    function executeOrder(uint256 orderId) external;
    function getUserOrders(address user) external view returns (uint256[] memory);
    function getOrderInfo(uint256 orderId) external view returns (OrderInfo memory);
}

// ==================== MAIN PREDICTION MARKET ====================

contract PDXPredictionMarket is IPDXPredictionMarket {
    enum MarketStatus { Open, Closed, ResolutionRequested, Resolved, Disputed }
    enum Outcome { Undecided, Yes, No }
    enum OrderType { StopLoss, TakeProfit }

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

    uint256 public nextMarketId;
    uint256 public nextOrderId;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders;
    mapping(uint256 => mapping(address => UserInvestment)) public userInvestments;

    address public immutable pdxToken;
    address public resolutionServer;
    address public owner;
    uint32 public feeBps;
    uint32 public creatorFeeBps;

    uint256 constant MIN_INITIAL_LIQUIDITY = 100 * 10**18; // 100 PDX minimum
    uint256 constant DISPUTE_PERIOD = 7 days;
    uint256 private _lock = 1;

    event UserInvestmentUpdated(uint256 indexed marketId, address indexed user, uint256 totalInvested, uint256 timestamp);
    event MarketCreated(uint256 indexed id, string question, string category, address yesToken, address noToken, uint256 endTime);
    event Swap(uint256 indexed id, address indexed user, bool yesIn, uint256 amountIn, uint256 amountOut, uint256 fee);
    event BuyWithPDX(uint256 indexed id, address indexed user, bool buyYes, uint256 pdxIn, uint256 tokenOut);
    event SellForPDX(uint256 indexed id, address indexed user, bool sellYes, uint256 tokenIn, uint256 pdxOut);
    event ResolutionRequested(uint256 indexed id, address requester, uint256 requestedAt);
    event MarketResolved(uint256 indexed id, Outcome outcome, string reason, uint256 confidence, address resolvedBy);
    event RedemptionClaimed(uint256 indexed id, address indexed user, uint256 amountClaimed);
    event OrderCreated(uint256 indexed orderId, address indexed user, uint256 indexed marketId, OrderType orderType, bool isYes, uint256 tokenAmount, uint256 triggerPrice);
    event OrderExecuted(uint256 indexed orderId, address indexed user, uint256 indexed marketId, uint256 amountReceived);
    event OrderCancelled(uint256 indexed orderId, address indexed user, uint256 indexed marketId);

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

    constructor(
        address _pdxToken,
        uint32 _feeBps, 
        address _resolutionServer,
        uint32 _creatorFeeBps
    ) {
        require(_pdxToken != address(0), "invalid PDX token");
        require(_feeBps <= 500, "fee too high");
        require(_creatorFeeBps <= 10000, "creator share invalid");
        
        pdxToken = _pdxToken;
        owner = msg.sender;
        feeBps = _feeBps;
        resolutionServer = _resolutionServer;
        creatorFeeBps = _creatorFeeBps;
    }

    // ==================== VIEW FUNCTIONS ====================

    function getMarketInfo(uint256 id) external view override marketExists(id) returns (MarketInfo memory mInfo) {
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

    function getOrderInfo(uint256 id) external view override returns (OrderInfo memory oInfo) {
        Order storage order = orders[id];
        oInfo.user = order.user;
        oInfo.marketId = order.marketId;
        oInfo.isYes = order.isYes;
        oInfo.tokenAmount = order.tokenAmount;
        oInfo.stopLossPrice = order.orderType == OrderType.StopLoss ? order.triggerPrice : 0;
        oInfo.takeProfitPrice = order.orderType == OrderType.TakeProfit ? order.triggerPrice : 0;
        oInfo.isActive = order.isActive;
    }

    function getUserOrders(address user) external view override returns (uint256[] memory) {
        return userOrders[user];
    }

    function getBuyYesOutput(uint256 id, uint256 pdxAmount) external view marketExists(id) returns (uint256 totalYesOut, uint256 totalFee) {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open, "market not open");
        require(pdxAmount > 0, "zero amount");

        uint256 platformFee = (pdxAmount * feeBps) / 10000;
        uint256 noAfterFee = pdxAmount - platformFee;
        uint256 yesOutFromSwap = _getAmountOut(noAfterFee, m.noPool, m.yesPool);

        totalYesOut = pdxAmount + yesOutFromSwap;
        totalFee = platformFee;
    }

    function getBuyNoOutput(uint256 id, uint256 pdxAmount) external view marketExists(id) returns (uint256 totalNoOut, uint256 totalFee) {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open, "market not open");
        require(pdxAmount > 0, "zero amount");

        uint256 platformFee = (pdxAmount * feeBps) / 10000;
        uint256 yesAfterFee = pdxAmount - platformFee;
        uint256 noOutFromSwap = _getAmountOut(yesAfterFee, m.yesPool, m.noPool);

        totalNoOut = pdxAmount + noOutFromSwap;
        totalFee = platformFee;
    }

    /// @notice Returns intuitive multipliers (e.g., 1250000 = 1.25x payout if outcome wins)
    ///         - Heavy buying on YES → YES multiplier goes DOWN (worse odds for next buyer)
    ///         - Scale: 1_000_000 = 1.00x; display as (multiplier / 1_000_000).toFixed(2) + "x"
    function getCurrentMultipliers(uint256 id) external view override marketExists(id) 
        returns (uint256 yesMultiplier, uint256 noMultiplier, uint256 yesPrice, uint256 noPrice) 
    {
        Market storage m = markets[id];
        uint256 totalPool = m.yesPool + m.noPool;

        if (totalPool == 0) {
            return (2_000_000, 2_000_000, 5000, 5000); // 2.00x both sides at launch
        }

        // Prices as % probability (0-10000)
        yesPrice = (m.yesPool * 10000) / totalPool;
        noPrice = 10000 - yesPrice;

        // CORRECT: Payout multiplier = total / winning_pool (decreases with heavy buying on that side)
        yesMultiplier = (totalPool * 1_000_000) / m.yesPool;  // e.g., yesPool=80% → 1.25x
        noMultiplier  = (totalPool * 1_000_000) / m.noPool;   // e.g., noPool=20% → 5.00x

        // Cap at 999x to prevent overflow/UI issues (your original cap kept)
        if (yesMultiplier > 999_000_000) yesMultiplier = 999_000_000;
        if (noMultiplier  > 999_000_000) noMultiplier  = 999_000_000;
    }

    // ==================== TRADING FUNCTIONS ====================

    function buyYesWithPDXFor(uint256 id, address beneficiary, uint256 minYesOut, uint256 pdxAmount) external override nonReentrant marketExists(id) {
        _buyWithPDX(id, beneficiary, minYesOut, true, pdxAmount);
    }

    function buyNoWithPDXFor(uint256 id, address beneficiary, uint256 minNoOut, uint256 pdxAmount) external override nonReentrant marketExists(id) {
        _buyWithPDX(id, beneficiary, minNoOut, false, pdxAmount);
    }

    function _buyWithPDX(uint256 id, address beneficiary, uint256 minOut, bool isYes, uint256 pdxAmount) internal {
        require(beneficiary != address(0), "zero address");
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open && block.timestamp < m.endTime && pdxAmount > 0, "invalid trade");

        // Transfer PDX from user
        require(IPDX(pdxToken).transferFrom(msg.sender, address(this), pdxAmount), "PDX transfer failed");

        _updateUserInvestment(id, beneficiary, pdxAmount);

        // Split and distribute trading fee
        uint256 totalFee = (pdxAmount * feeBps) / 10000;
        uint256 creatorShare = (totalFee * creatorFeeBps) / 10000;
        uint256 protocolShare = totalFee - creatorShare;
        uint256 amountAfterFee = pdxAmount - totalFee;

        m.platformFees += protocolShare;
        if (creatorShare > 0) {
            require(IPDX(pdxToken).transfer(m.creator, creatorShare), "creator payout failed");
        }

        uint256 outAmount;
        uint256 totalOut;
        if (isYes) {
            outAmount = _getAmountOut(amountAfterFee, m.noPool, m.yesPool);
            require(outAmount <= m.yesPool && outAmount + pdxAmount >= minOut, "slippage exceeded");
            totalOut = outAmount + pdxAmount;

            m.yesPool += amountAfterFee;
            m.noPool -= outAmount;
            m.yesToken.mint(beneficiary, totalOut);
        } else {
            outAmount = _getAmountOut(amountAfterFee, m.yesPool, m.noPool);
            require(outAmount <= m.noPool && outAmount + pdxAmount >= minOut, "slippage exceeded");
            totalOut = outAmount + pdxAmount;

            m.noPool += amountAfterFee;
            m.yesPool -= outAmount;
            m.noToken.mint(beneficiary, totalOut);
        }
        m.totalBacking += pdxAmount;

        emit BuyWithPDX(id, beneficiary, isYes, pdxAmount, totalOut);
    }

    function sellYesForPDX(uint256 id, uint256 tokenAmount, uint256 minPDXOut) external nonReentrant marketExists(id) {
        _sellForPDX(id, tokenAmount, minPDXOut, true);
    }

    function sellNoForPDX(uint256 id, uint256 tokenAmount, uint256 minPDXOut) external nonReentrant marketExists(id) {
        _sellForPDX(id, tokenAmount, minPDXOut, false);
    }

    function _sellForPDX(uint256 id, uint256 tokenAmount, uint256 minPDXOut, bool isYes) internal {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open && block.timestamp < m.endTime && tokenAmount > 0, "invalid trade");

        OutcomeToken token = isYes ? m.yesToken : m.noToken;
        require(token.balanceOf(msg.sender) >= tokenAmount, "insufficient balance");

        // Split and distribute trading fee
        uint256 totalFee = (tokenAmount * feeBps) / 10000;
        uint256 creatorShare = (totalFee * creatorFeeBps) / 10000;
        uint256 protocolShare = totalFee - creatorShare;
        uint256 tokenAfterFee = tokenAmount - totalFee;

        m.platformFees += protocolShare;
        if (creatorShare > 0) {
            require(IPDX(pdxToken).transfer(m.creator, creatorShare), "creator payout failed");
        }

        uint256 outAmount;
        if (isYes) {
            outAmount = _getAmountOut(tokenAfterFee, m.yesPool, m.noPool);
            require(outAmount <= m.noPool, "insufficient liquidity");
            m.noPool += tokenAfterFee;
            m.yesPool -= outAmount;
        } else {
            outAmount = _getAmountOut(tokenAfterFee, m.noPool, m.yesPool);
            require(outAmount <= m.yesPool, "insufficient liquidity");
            m.yesPool += tokenAfterFee;
            m.noPool -= outAmount;
        }

        require(outAmount >= minPDXOut, "slippage exceeded");
        require(IPDX(pdxToken).balanceOf(address(this)) >= outAmount, "insufficient PDX balance");

        token.burn(msg.sender, tokenAmount);

        m.totalBacking -= outAmount;

        require(IPDX(pdxToken).transfer(msg.sender, outAmount), "PDX transfer failed");

        emit SellForPDX(id, msg.sender, isYes, tokenAmount, outAmount);
    }

    // ==================== ORDER MANAGEMENT ====================

    function createStopLossOrder(uint256 marketId, bool isYes, uint256 tokenAmount, uint256 stopLossPrice) external override marketExists(marketId) returns (uint256) {
        return _createOrder(marketId, isYes, tokenAmount, stopLossPrice, OrderType.StopLoss);
    }

    function createTakeProfitOrder(uint256 marketId, bool isYes, uint256 tokenAmount, uint256 takeProfitPrice) external override marketExists(marketId) returns (uint256) {
        return _createOrder(marketId, isYes, tokenAmount, takeProfitPrice, OrderType.TakeProfit);
    }

    function _createOrder(uint256 marketId, bool isYes, uint256 tokenAmount, uint256 triggerPrice, OrderType orderType) internal returns (uint256) {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.Open && tokenAmount > 0, "invalid order");

        if (orderType == OrderType.StopLoss) { require(triggerPrice > 0 && triggerPrice < 10000, "invalid stop loss"); }
        else { require(triggerPrice > 10000, "invalid take profit"); }

        OutcomeToken token = isYes ? m.yesToken : m.noToken;
        require(token.balanceOf(msg.sender) >= tokenAmount, "insufficient balance");

        uint256 orderId = nextOrderId++;
        orders[orderId] = Order(orderId, msg.sender, marketId, isYes, tokenAmount, triggerPrice, orderType, true, block.timestamp);
        userOrders[msg.sender].push(orderId);

        emit OrderCreated(orderId, msg.sender, marketId, orderType, isYes, tokenAmount, triggerPrice);

        return orderId;
    }

    function executeOrder(uint256 orderId) external override nonReentrant {
        Order storage order = orders[orderId];
        require(order.isActive, "order not active");

        Market storage m = markets[order.marketId];
        require(m.status == MarketStatus.Open && block.timestamp < m.endTime, "market closed");

        uint256 totalPool = m.yesPool + m.noPool;
        require(totalPool > 0, "no liquidity");

        uint256 currentPrice = order.isYes ? (m.yesPool * 10000) / totalPool : (m.noPool * 10000) / totalPool;
        bool isTriggered = order.orderType == OrderType.StopLoss ? currentPrice <= order.triggerPrice : currentPrice >= order.triggerPrice;
        require(isTriggered, "not triggered");

        OutcomeToken tokenIn = order.isYes ? m.yesToken : m.noToken;
        require(tokenIn.balanceOf(order.user) >= order.tokenAmount, "insufficient balance");

        // Split and distribute trading fee
        uint256 totalFee = (order.tokenAmount * feeBps) / 10000;
        uint256 creatorShare = (totalFee * creatorFeeBps) / 10000;
        uint256 protocolShare = totalFee - creatorShare;
        uint256 amountAfterFee = order.tokenAmount - totalFee;
        m.platformFees += protocolShare;
        if (creatorShare > 0) {
            require(IPDX(pdxToken).transfer(m.creator, creatorShare), "creator payout failed");
        }

        uint256 amountOut;
        OutcomeToken tokenOut;
        if (order.isYes) {
            amountOut = _getAmountOut(amountAfterFee, m.yesPool, m.noPool);
            require(amountOut <= m.noPool, "insufficient liquidity");
            tokenIn.burn(order.user, order.tokenAmount);
            m.yesPool += amountAfterFee;
            m.noPool -= amountOut;
            tokenOut = m.noToken;
        } else {
            amountOut = _getAmountOut(amountAfterFee, m.noPool, m.yesPool);
            require(amountOut <= m.yesPool, "insufficient liquidity");
            tokenIn.burn(order.user, order.tokenAmount);
            m.noPool += amountAfterFee;
            m.yesPool -= amountOut;
            tokenOut = m.yesToken;
        }

        tokenOut.mint(order.user, amountOut);
        order.isActive = false;

        emit OrderExecuted(orderId, order.user, order.marketId, amountOut);
        emit Swap(order.marketId, order.user, order.isYes, order.tokenAmount, amountOut, totalFee);
    }

    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.user == msg.sender && order.isActive, "cannot cancel");
        order.isActive = false;
        emit OrderCancelled(orderId, msg.sender, order.marketId);
    }

    function checkOrderTrigger(uint256 orderId) external view returns (bool, uint256, uint256) {
        Order storage order = orders[orderId];
        require(order.isActive, "order not active");
        Market storage m = markets[order.marketId];
        uint256 totalPool = m.yesPool + m.noPool;
        if (totalPool == 0) return (false, 0, order.triggerPrice);
        uint256 price = order.isYes ? (m.yesPool * 10000) / totalPool : (m.noPool * 10000) / totalPool;
        bool triggered = order.orderType == OrderType.StopLoss ? price <= order.triggerPrice : price >= order.triggerPrice;
        return (triggered, price, order.triggerPrice);
    }

    // ==================== MARKET CREATION ====================

    function createMarket(
        string calldata question, 
        string calldata category, 
        uint256 endTime, 
        uint256 initialYes, 
        uint256 initialNo
    ) external nonReentrant returns (uint256) {
        require(endTime > block.timestamp + 1 hours, "invalid end time");
        require(bytes(question).length > 0 && bytes(question).length <= 280, "invalid question");
        require(bytes(category).length > 0, "invalid category");
        require(initialYes > 0 && initialNo > 0 && (initialYes + initialNo) >= MIN_INITIAL_LIQUIDITY, "insufficient initial liquidity");

        uint256 totalPDX = initialYes + initialNo;
        require(IPDX(pdxToken).transferFrom(msg.sender, address(this), totalPDX), "PDX transfer failed");

        uint256 id = nextMarketId++;
        OutcomeToken yesToken = new OutcomeToken(string.concat("YES: ", _truncate(question, 50)), string.concat("YES", _toString(id)), address(this));
        OutcomeToken noToken = new OutcomeToken(string.concat("NO: ", _truncate(question, 50)), string.concat("NO", _toString(id)), address(this));

        markets[id] = Market(
            msg.sender, question, category, endTime, MarketStatus.Open, Outcome.Undecided, 
            yesToken, noToken, initialYes, initialNo, initialYes + initialNo, 
            0, 0, address(0), "", 0, 0, address(0), ""
        );

        emit MarketCreated(id, question, category, address(yesToken), address(noToken), endTime);

        return id;
    }

    // ==================== RESOLUTION ====================

    function requestResolution(uint256 id, string calldata reason) external marketExists(id) {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open, "not open");
        require(block.timestamp >= m.endTime, "not ended");

        m.status = MarketStatus.ResolutionRequested;
        m.resolutionRequestedAt = block.timestamp;
        m.resolutionRequester = msg.sender;
        m.resolutionReason = reason;
        m.disputeDeadline = block.timestamp + DISPUTE_PERIOD;

        emit ResolutionRequested(id, msg.sender, block.timestamp);
    }

    function resolveMarket(uint256 id, uint8 outcomeIndex, string calldata reason, uint256 confidence) external onlyServer marketExists(id) {
        Market storage m = markets[id];
        require(m.status == MarketStatus.ResolutionRequested, "not requested");
        require(outcomeIndex <= 2, "invalid outcome");

        m.outcome = Outcome(outcomeIndex);
        m.status = MarketStatus.Resolved;
        m.resolutionReason = reason;
        m.resolutionConfidence = confidence;

        emit MarketResolved(id, m.outcome, reason, confidence, msg.sender);
    }

    function claimRedemption(uint256 id) external nonReentrant marketExists(id) {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Resolved, "not resolved");

        uint256 yesTokens = m.yesToken.balanceOf(msg.sender);
        uint256 noTokens = m.noToken.balanceOf(msg.sender);

        if (m.outcome == Outcome.Yes) {
            require(yesTokens > 0, "no YES tokens");
            m.yesToken.burn(msg.sender, yesTokens);
            require(IPDX(pdxToken).transfer(msg.sender, yesTokens), "PDX transfer failed");
            emit RedemptionClaimed(id, msg.sender, yesTokens);
        } else if (m.outcome == Outcome.No) {
            require(noTokens > 0, "no NO tokens");
            m.noToken.burn(msg.sender, noTokens);
            require(IPDX(pdxToken).transfer(msg.sender, noTokens), "PDX transfer failed");
            emit RedemptionClaimed(id, msg.sender, noTokens);
        }
    }

    // ==================== ADMIN ====================

    function withdrawPlatformFees(uint256 id) external onlyOwner nonReentrant marketExists(id) {
        Market storage m = markets[id];
        uint256 fees = m.platformFees;
        require(fees > 0, "no fees");
        m.platformFees = 0;
        require(IPDX(pdxToken).transfer(owner, fees), "PDX transfer failed");
    }
    function setResolutionServer(address _server) external onlyOwner {
        require(_server != address(0), "zero address");
        resolutionServer = _server;
    }

    function setFees(uint32 _feeBps, uint32 _creatorFeeBps) external onlyOwner {
        require(_feeBps <= 500, "fee too high");
        require(_creatorFeeBps <= 10000, "creator share too high");
        feeBps = _feeBps;
        creatorFeeBps = _creatorFeeBps;
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "zero address");
        owner = _newOwner;
    }

    // ==================== INTERNAL ====================

    function _updateUserInvestment(uint256 marketId, address user, uint256 amount) internal {
        UserInvestment storage inv = userInvestments[marketId][user];
        inv.totalInvested += amount;
        inv.lastUpdated = block.timestamp;
        emit UserInvestmentUpdated(marketId, user, inv.totalInvested, block.timestamp);
    }

    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256) {
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0, "invalid amounts");
        return (amountIn * reserveOut) / (reserveIn + amountIn);
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
}

// ==================== TRADING BOT ====================

contract PDXTradingBot {
    IPDXPredictionMarket public predictionMarket;
    address public immutable pdxToken;
    address public owner;

    event AutoTradeExecuted(uint256 indexed marketId, bool isYes, uint256 amount, uint256 tokensReceived);
    event OrderMonitored(uint256 indexed orderId, bool shouldExecute, uint256 currentPrice);

    constructor(address _predictionMarket, address _pdxToken) {
        require(_predictionMarket != address(0) && _pdxToken != address(0), "zero address");
        predictionMarket = IPDXPredictionMarket(_predictionMarket);
        pdxToken = _pdxToken;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function autoBuyYes(uint256 marketId, address beneficiary, uint256 minYesOut, uint256 pdxAmount) external onlyOwner {
        require(IPDX(pdxToken).transferFrom(msg.sender, address(this), pdxAmount), "PDX transfer failed");
        require(IPDX(pdxToken).approve(address(predictionMarket), pdxAmount), "approval failed");
        predictionMarket.buyYesWithPDXFor(marketId, beneficiary, minYesOut, pdxAmount);
        emit AutoTradeExecuted(marketId, true, pdxAmount, minYesOut);
    }

    function autoBuyNo(uint256 marketId, address beneficiary, uint256 minNoOut, uint256 pdxAmount) external onlyOwner {
        require(IPDX(pdxToken).transferFrom(msg.sender, address(this), pdxAmount), "PDX transfer failed");
        require(IPDX(pdxToken).approve(address(predictionMarket), pdxAmount), "approval failed");
        predictionMarket.buyNoWithPDXFor(marketId, beneficiary, minNoOut, pdxAmount);
        emit AutoTradeExecuted(marketId, false, pdxAmount, minNoOut);
    }

    function getMarketData(uint256 marketId) external view returns (IPDXPredictionMarket.MarketInfo memory) {
        return predictionMarket.getMarketInfo(marketId);
    }

    function getMultipliers(uint256 marketId) external view returns (uint256 yesMultiplier, uint256 noMultiplier, uint256 yesPrice, uint256 noPrice) {
        return predictionMarket.getCurrentMultipliers(marketId);
    }

    function monitorAndExecuteOrder(uint256 orderId) external {
        predictionMarket.executeOrder(orderId);
    }

    function batchMonitorOrders(uint256[] calldata orderIds) external view returns (bool[] memory) {
        bool[] memory shouldExecute = new bool[](orderIds.length);
        for (uint256 i = 0; i < orderIds.length; i++) {
            IPDXPredictionMarket.OrderInfo memory orderInfo = predictionMarket.getOrderInfo(orderIds[i]);
            if (orderInfo.isActive) {
                ( , , uint256 yesPrice, uint256 noPrice) = predictionMarket.getCurrentMultipliers(orderInfo.marketId);
                uint256 currentPrice = orderInfo.isYes ? yesPrice : noPrice;
                if (orderInfo.stopLossPrice > 0) shouldExecute[i] = currentPrice <= orderInfo.stopLossPrice;
                else if (orderInfo.takeProfitPrice > 0) shouldExecute[i] = currentPrice >= orderInfo.takeProfitPrice;
            }
        }
        return shouldExecute;
    }

    function createStopLossForUser(uint256 marketId, bool isYes, uint256 tokenAmount, uint256 stopLossPrice) external onlyOwner returns (uint256) {
        return predictionMarket.createStopLossOrder(marketId, isYes, tokenAmount, stopLossPrice);
    }

    function createTakeProfitForUser(uint256 marketId, bool isYes, uint256 tokenAmount, uint256 takeProfitPrice) external onlyOwner returns (uint256) {
        return predictionMarket.createTakeProfitOrder(marketId, isYes, tokenAmount, takeProfitPrice);
    }

    function getUserOrders(address user) external view returns (uint256[] memory) {
        return predictionMarket.getUserOrders(user);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "zero address");
        owner = _newOwner;
    }
}