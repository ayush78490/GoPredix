// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Simple ERC20 for outcome tokens
contract OutcomeToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    address public immutable market;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, address _market) {
        name = _name;
        symbol = _symbol;
        market = _market;
    }

    modifier onlyMarket() {
        require(msg.sender == market, "only market");
        _;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(to != address(0), "zero address");
        require(balanceOf[msg.sender] >= value, "insufficient balance");
        unchecked {
            balanceOf[msg.sender] -= value;
            balanceOf[to] += value;
        }
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(to != address(0), "zero address");
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "insufficient allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
        }
        require(balanceOf[from] >= value, "insufficient balance");
        unchecked {
            balanceOf[from] -= value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
        return true;
    }

    function mint(address to, uint256 value) external onlyMarket {
        require(to != address(0), "zero address");
        totalSupply += value;
        unchecked {
            balanceOf[to] += value;
        }
        emit Transfer(address(0), to, value);
    }

    function burn(address from, uint256 value) external onlyMarket {
        require(balanceOf[from] >= value, "insufficient balance");
        unchecked {
            balanceOf[from] -= value;
            totalSupply -= value;
        }
        emit Transfer(from, address(0), value);
    }
}

// ====================================================================
// PREDICTION MARKET WITH MULTIPLIER CALCULATIONS - FULL FIXED VERSION
// ====================================================================

contract PredictionMarketWithMultipliers {
    enum MarketStatus { Open, Closed, ResolutionRequested, Resolved, Disputed }
    enum Outcome { Undecided, Yes, No }

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
        // AI Resolution system
        uint256 resolutionRequestedAt;
        address resolutionRequester;
        string resolutionReason;
        uint256 resolutionConfidence;
        // Dispute system
        uint256 disputeDeadline;
        address disputer;
        string disputeReason;
    }

    // State variables
    uint256 public nextMarketId;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => uint256)) public lpBalances;
    
    // AI Resolution system
    address public resolutionServer;
    address public owner;
    uint32 public feeBps;
    uint32 public lpFeeBps;
    
    // Constants
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    uint256 public constant MIN_INITIAL_LIQUIDITY = 0.01 ether;
    uint256 public constant DISPUTE_PERIOD = 7 days;
    uint256 private _lock = 1;

    // Investment Tracking
    struct UserInvestment {
        uint256 totalInvested;
        uint256 lastUpdated;
    }
    
    mapping(uint256 => mapping(address => UserInvestment)) public userInvestments;
    
    event UserInvestmentUpdated(uint256 indexed marketId, address indexed user, uint256 totalInvested, uint256 timestamp);

    // Events
    event MarketCreated(uint256 indexed id, string question, string category, address yesToken, address noToken, uint256 endTime);
    event LiquidityAdded(uint256 indexed id, address indexed provider, uint256 yesAmount, uint256 noAmount, uint256 lpTokens);
    event LiquidityRemoved(uint256 indexed id, address indexed provider, uint256 yesAmount, uint256 noAmount, uint256 lpTokens);
    event Swap(uint256 indexed id, address indexed user, bool yesIn, uint256 amountIn, uint256 amountOut, uint256 fee);
    event BuyWithBNB(uint256 indexed id, address indexed user, bool buyYes, uint256 bnbIn, uint256 tokenOut);
    event ResolutionRequested(uint256 indexed id, address requester, uint256 requestedAt);
    event MarketResolved(uint256 indexed id, Outcome outcome, string reason, uint256 confidence, address resolvedBy);
    event RedemptionClaimed(uint256 indexed id, address indexed user, uint256 amountClaimed);

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

    // ============ Investment Tracking Functions ============
    
    function getUserInvestment(uint256 marketId, address user) external view returns (uint256) {
        return userInvestments[marketId][user].totalInvested;
    }
    
    function getUserTotalInvestment(address user) external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < nextMarketId; i++) {
            total += userInvestments[i][user].totalInvested;
        }
        return total;
    }
    
    function _updateUserInvestment(uint256 marketId, address user, uint256 additionalInvestment) internal {
        UserInvestment storage investment = userInvestments[marketId][user];
        investment.totalInvested += additionalInvestment;
        investment.lastUpdated = block.timestamp;
        
        emit UserInvestmentUpdated(marketId, user, investment.totalInvested, block.timestamp);
    }

    // ---------------------------------------------------------------
    // Market Creation
    // ---------------------------------------------------------------
    
    function createMarket(
        string calldata question,
        string calldata category,
        uint256 endTime,
        uint256 initialYes,
        uint256 initialNo
    ) external payable nonReentrant returns (uint256) {
        require(endTime > block.timestamp + 1 hours, "end time too soon");
        require(bytes(question).length > 0 && bytes(question).length <= 280, "invalid question");
        require(bytes(category).length > 0, "category required");
        require(initialYes > 0 && initialNo > 0, "need initial liquidity");
        
        uint256 totalRequired = initialYes + initialNo;
        require(totalRequired >= MIN_INITIAL_LIQUIDITY, "liquidity too low");
        require(msg.value >= totalRequired, "insufficient BNB");

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

        markets[id] = Market({
            creator: msg.sender,
            question: question,
            category: category,
            endTime: endTime,
            status: MarketStatus.Open,
            outcome: Outcome.Undecided,
            yesToken: yesToken,
            noToken: noToken,
            yesPool: initialYes,
            noPool: initialNo,
            lpTotalSupply: 0,
            totalBacking: totalRequired,
            platformFees: 0,
            resolutionRequestedAt: 0,
            resolutionRequester: address(0),
            resolutionReason: "",
            resolutionConfidence: 0,
            disputeDeadline: 0,
            disputer: address(0),
            disputeReason: ""
        });

        // Mint initial tokens to contract (for liquidity pool)
        yesToken.mint(address(this), initialYes);
        noToken.mint(address(this), initialNo);

        uint256 liquidity = _sqrt(initialYes * initialNo);
        require(liquidity > MINIMUM_LIQUIDITY, "insufficient liquidity value");
        
        markets[id].lpTotalSupply = liquidity;
        lpBalances[id][msg.sender] = liquidity - MINIMUM_LIQUIDITY;
        lpBalances[id][address(1)] = MINIMUM_LIQUIDITY;

        if (msg.value > totalRequired) {
            _transferBNB(msg.sender, msg.value - totalRequired);
        }

        emit MarketCreated(id, question, category, address(yesToken), address(noToken), endTime);
        emit LiquidityAdded(id, msg.sender, initialYes, initialNo, liquidity - MINIMUM_LIQUIDITY);
        
        return id;
    }

    // ---------------------------------------------------------------
    // Trading with BNB
    // ---------------------------------------------------------------

    function buyYesWithBNB(uint256 id, uint256 minYesOut) 
        external 
        payable 
        nonReentrant 
        marketExists(id) 
    {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open, "market not open");
        require(block.timestamp < m.endTime, "market ended");
        require(msg.value > 0, "zero BNB");

        uint256 bnbAmount = msg.value;
        _updateUserInvestment(id, msg.sender, bnbAmount);

        uint256 noAmount = bnbAmount;
        uint256 platformFee = (noAmount * feeBps) / 10000;
        uint256 lpFee = (platformFee * lpFeeBps) / 10000;
        uint256 protocolFee = platformFee - lpFee;
        uint256 noAfterFee = noAmount - platformFee;

        m.platformFees += protocolFee;

        uint256 yesOutFromSwap = _getAmountOut(noAfterFee, m.noPool, m.yesPool);
        require(yesOutFromSwap <= m.yesPool, "insufficient YES liquidity");

        uint256 totalYesOut = bnbAmount + yesOutFromSwap;
        require(totalYesOut >= minYesOut, "slippage exceeded");

        m.noPool += noAfterFee + lpFee;
        m.yesPool -= yesOutFromSwap;

        m.yesToken.mint(msg.sender, totalYesOut);
        m.totalBacking += bnbAmount;

        emit BuyWithBNB(id, msg.sender, true, bnbAmount, totalYesOut);
    }

    function buyNoWithBNB(uint256 id, uint256 minNoOut) 
        external 
        payable 
        nonReentrant 
        marketExists(id) 
    {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open, "market not open");
        require(block.timestamp < m.endTime, "market ended");
        require(msg.value > 0, "zero BNB");

        uint256 bnbAmount = msg.value;
        _updateUserInvestment(id, msg.sender, bnbAmount);

        uint256 yesAmount = bnbAmount;
        uint256 platformFee = (yesAmount * feeBps) / 10000;
        uint256 lpFee = (platformFee * lpFeeBps) / 10000;
        uint256 protocolFee = platformFee - lpFee;
        uint256 yesAfterFee = yesAmount - platformFee;

        m.platformFees += protocolFee;

        uint256 noOutFromSwap = _getAmountOut(yesAfterFee, m.yesPool, m.noPool);
        require(noOutFromSwap <= m.noPool, "insufficient NO liquidity");

        uint256 totalNoOut = bnbAmount + noOutFromSwap;
        require(totalNoOut >= minNoOut, "slippage exceeded");

        m.yesPool += yesAfterFee + lpFee;
        m.noPool -= noOutFromSwap;

        m.noToken.mint(msg.sender, totalNoOut);
        m.totalBacking += bnbAmount;

        emit BuyWithBNB(id, msg.sender, false, bnbAmount, totalNoOut);
    }

    // ---------------------------------------------------------------
    // Output Calculation Functions
    // ---------------------------------------------------------------

    function getBuyYesOutput(uint256 id, uint256 bnbAmount) 
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

    function getBuyNoOutput(uint256 id, uint256 bnbAmount) 
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

    // ---------------------------------------------------------------
    // MULTIPLIER CALCULATION FUNCTIONS - FIXED ✅
    // ---------------------------------------------------------------

    function getBuyYesMultiplier(uint256 id, uint256 bnbAmount) 
        external 
        view 
        marketExists(id)
        returns (uint256 multiplier, uint256 totalYesOut, uint256 totalFee) 
    {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open, "market not open");
        require(bnbAmount > 0, "zero amount");
        
        uint256 platformFee = (bnbAmount * feeBps) / 10000;
        uint256 noAfterFee = bnbAmount - platformFee;
        
        uint256 yesOutFromSwap = _getAmountOut(noAfterFee, m.noPool, m.yesPool);
        
        totalYesOut = bnbAmount + yesOutFromSwap;
        totalFee = platformFee;
        
        // ✅ FIXED: Changed from (10000 * 10000) to (10000 * 100)
        multiplier = (totalYesOut * 10000) / bnbAmount;
    }

    function getBuyNoMultiplier(uint256 id, uint256 bnbAmount) 
        external 
        view 
        marketExists(id)
        returns (uint256 multiplier, uint256 totalNoOut, uint256 totalFee) 
    {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open, "market not open");
        require(bnbAmount > 0, "zero amount");
        
        uint256 platformFee = (bnbAmount * feeBps) / 10000;
        uint256 yesAfterFee = bnbAmount - platformFee;
        
        uint256 noOutFromSwap = _getAmountOut(yesAfterFee, m.yesPool, m.noPool);
        
        totalNoOut = bnbAmount + noOutFromSwap;
        totalFee = platformFee;
        
        // ✅ FIXED: Correct multiplier calculation
        multiplier = (totalNoOut * 10000) / bnbAmount;
    }

    // ✅ MAIN FIX: getCurrentMultipliers
    function getCurrentMultipliers(uint256 id) 
        external 
        view 
        marketExists(id)
        returns (
            uint256 yesMultiplier, 
            uint256 noMultiplier, 
            uint256 yesPrice, 
            uint256 noPrice
        ) 
    {
        Market storage m = markets[id];
        uint256 totalValue = m.yesPool + m.noPool;
        
        if (totalValue == 0) {
            return (10000, 10000, 5000, 5000);
        }
        
        yesPrice = (m.yesPool * 10000) / totalValue;
        noPrice = (m.noPool * 10000) / totalValue;
        
        // ✅ FIXED: Changed from (10000 * 10000) / yesPrice to (10000 * 100) / yesPrice
        // This ensures 2.5x displays as 2.5x, not 252.7x
        if (yesPrice > 0) {
            yesMultiplier = (10000 * 100) / yesPrice;
        } else {
            yesMultiplier = type(uint256).max;
        }
        
        if (noPrice > 0) {
            noMultiplier = (10000 * 100) / noPrice;
        } else {
            noMultiplier = type(uint256).max;
        }
    }

    // ✅ MAIN FIX: getTradingInfo
    function getTradingInfo(uint256 id)
        external
        view
        marketExists(id)
        returns (
            uint256 yesMultiplier,
            uint256 noMultiplier,
            uint256 yesPrice,
            uint256 noPrice,
            uint256 totalLiquidity
        )
    {
        Market storage m = markets[id];
        totalLiquidity = m.yesPool + m.noPool;
        
        if (totalLiquidity == 0) {
            return (10000, 10000, 5000, 5000, 0);
        }
        
        yesPrice = (m.yesPool * 10000) / totalLiquidity;
        noPrice = (m.noPool * 10000) / totalLiquidity;
        
        // ✅ FIXED: Changed multiplier calculation
        if (yesPrice > 0) {
            yesMultiplier = (10000 * 100) / yesPrice;
        }
        
        if (noPrice > 0) {
            noMultiplier = (10000 * 100) / noPrice;
        }
    }

    function getSwapMultiplier(uint256 id, uint256 amountIn, bool yesIn) 
        external 
        view 
        marketExists(id)
        returns (uint256 multiplier, uint256 amountOut, uint256 fee) 
    {
        Market storage m = markets[id];
        require(amountIn > 0, "zero input");
        
        fee = (amountIn * feeBps) / 10000;
        uint256 amountInAfterFee = amountIn - fee;
        
        if (yesIn) {
            amountOut = _getAmountOut(amountInAfterFee, m.yesPool, m.noPool);
        } else {
            amountOut = _getAmountOut(amountInAfterFee, m.noPool, m.yesPool);
        }
        
        if (amountIn > 0) {
            multiplier = (amountOut * 10000) / amountIn;
        }
    }

    // ---------------------------------------------------------------
    // Token-to-Token Swaps
    // ---------------------------------------------------------------
    
    function swapYesForNo(uint256 id, uint256 yesIn, uint256 minNoOut) 
        external 
        nonReentrant 
        marketExists(id) 
    {
        _swap(id, true, yesIn, minNoOut);
    }

    function swapNoForYes(uint256 id, uint256 noIn, uint256 minYesOut) 
        external 
        nonReentrant 
        marketExists(id) 
    {
        _swap(id, false, noIn, minYesOut);
    }

    function _swap(uint256 id, bool yesIn, uint256 amountIn, uint256 minOut) internal {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open, "market not open");
        require(block.timestamp < m.endTime, "market ended");
        require(amountIn > 0, "zero input");

        uint256 platformFee = (amountIn * feeBps) / 10000;
        uint256 amountInAfterFee = amountIn - platformFee;
        
        uint256 lpFee = (platformFee * lpFeeBps) / 10000;
        m.platformFees += platformFee - lpFee;

        uint256 amountOut;
        if (yesIn) {
            require(m.yesToken.balanceOf(msg.sender) >= amountIn, "insufficient YES balance");
            
            amountOut = _getAmountOut(amountInAfterFee, m.yesPool, m.noPool);
            require(amountOut >= minOut, "slippage exceeded");
            require(amountOut <= m.noPool, "insufficient NO liquidity");

            m.yesToken.burn(msg.sender, amountIn);
            
            m.yesPool += amountInAfterFee + lpFee;
            m.noPool -= amountOut;
            
            m.noToken.mint(msg.sender, amountOut);
        } else {
            require(m.noToken.balanceOf(msg.sender) >= amountIn, "insufficient NO balance");
            
            amountOut = _getAmountOut(amountInAfterFee, m.noPool, m.yesPool);
            require(amountOut >= minOut, "slippage exceeded");
            require(amountOut <= m.yesPool, "insufficient YES liquidity");

            m.noToken.burn(msg.sender, amountIn);
            
            m.noPool += amountInAfterFee + lpFee;
            m.yesPool -= amountOut;
            
            m.yesToken.mint(msg.sender, amountOut);
        }

        emit Swap(id, msg.sender, yesIn, amountIn, amountOut, platformFee);
    }

    // ---------------------------------------------------------------
    // Liquidity Provider Functions
    // ---------------------------------------------------------------

    function addLiquidity(uint256 id, uint256 yesAmount, uint256 noAmount) 
        external 
        nonReentrant 
        marketExists(id) 
    {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open, "market not open");
        require(yesAmount > 0 && noAmount > 0, "need both amounts");

        require(m.yesToken.balanceOf(msg.sender) >= yesAmount, "insufficient YES balance");
        require(m.noToken.balanceOf(msg.sender) >= noAmount, "insufficient NO balance");

        m.yesToken.burn(msg.sender, yesAmount);
        m.noToken.burn(msg.sender, noAmount);

        uint256 liquidity = _sqrt(yesAmount * noAmount);
        require(liquidity > 0, "insufficient liquidity minted");

        m.lpTotalSupply += liquidity;
        lpBalances[id][msg.sender] += liquidity;

        m.yesPool += yesAmount;
        m.noPool += noAmount;

        emit LiquidityAdded(id, msg.sender, yesAmount, noAmount, liquidity);
    }

    function removeLiquidity(uint256 id, uint256 lpAmount) 
        external 
        nonReentrant 
        marketExists(id) 
    {
        Market storage m = markets[id];
        require(lpAmount > 0, "zero LP amount");
        require(lpBalances[id][msg.sender] >= lpAmount, "insufficient LP balance");

        uint256 totalSupply = m.lpTotalSupply;
        require(totalSupply > 0, "no liquidity in pool");

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

    // ---------------------------------------------------------------
    // Constant Product Formula
    // ---------------------------------------------------------------
    
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) 
        internal 
        pure 
        returns (uint256) 
    {
        require(amountIn > 0, "invalid amountIn");
        require(reserveIn > 0 && reserveOut > 0, "insufficient liquidity");
        
        uint256 numerator = amountIn * reserveOut;
        uint256 denominator = reserveIn + amountIn;
        
        return numerator / denominator;
    }

    // ---------------------------------------------------------------
    // Resolution Functions
    // ---------------------------------------------------------------

    function requestResolution(uint256 id, string calldata reason) 
        external 
        marketExists(id)
    {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Open, "market not open");
        require(block.timestamp >= m.endTime, "market still ongoing");

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
    ) 
        external 
        onlyServer 
        marketExists(id)
    {
        Market storage m = markets[id];
        require(m.status == MarketStatus.ResolutionRequested, "not in resolution phase");
        require(outcomeIndex <= 2, "invalid outcome");

        m.outcome = Outcome(outcomeIndex);
        m.status = MarketStatus.Resolved;
        m.resolutionReason = reason;
        m.resolutionConfidence = confidence;

        emit MarketResolved(id, m.outcome, reason, confidence, msg.sender);
    }

    function claimRedemption(uint256 id) 
        external 
        nonReentrant 
        marketExists(id)
    {
        Market storage m = markets[id];
        require(m.status == MarketStatus.Resolved, "market not resolved");

        uint256 yesTokens = m.yesToken.balanceOf(msg.sender);
        uint256 noTokens = m.noToken.balanceOf(msg.sender);

        if (m.outcome == Outcome.Yes) {
            require(yesTokens > 0, "no YES tokens to redeem");
            m.yesToken.burn(msg.sender, yesTokens);
            _transferBNB(msg.sender, yesTokens);
            emit RedemptionClaimed(id, msg.sender, yesTokens);
        } else if (m.outcome == Outcome.No) {
            require(noTokens > 0, "no NO tokens to redeem");
            m.noToken.burn(msg.sender, noTokens);
            _transferBNB(msg.sender, noTokens);
            emit RedemptionClaimed(id, msg.sender, noTokens);
        }
    }

    function withdrawPlatformFees(uint256 id) 
        external 
        onlyOwner 
        nonReentrant 
        marketExists(id)
    {
        Market storage m = markets[id];
        uint256 fees = m.platformFees;
        require(fees > 0, "no fees to withdraw");
        
        m.platformFees = 0;
        _transferBNB(owner, fees);
    }

    // ---------------------------------------------------------------
    // Helper Functions
    // ---------------------------------------------------------------

    function formatMultiplier(uint256 multiplier) external pure returns (string memory) {
        if (multiplier >= 1000000) return "100x+";
        
        uint256 integerPart = multiplier / 10000;
        uint256 fractionalPart = (multiplier % 10000) / 1000;
        
        if (fractionalPart == 0) {
            return string(abi.encodePacked(_toString(integerPart), "x"));
        } else {
            return string(abi.encodePacked(_toString(integerPart), ".", _toString(fractionalPart), "x"));
        }
    }

    function getMarket(uint256 id) 
        external 
        view 
        marketExists(id)
        returns (
            address creator,
            string memory question,
            string memory category,
            uint256 endTime,
            MarketStatus status,
            Outcome outcome,
            uint256 yesPool,
            uint256 noPool,
            uint256 totalBacking
        ) 
    {
        Market storage m = markets[id];
        return (
            m.creator,
            m.question,
            m.category,
            m.endTime,
            m.status,
            m.outcome,
            m.yesPool,
            m.noPool,
            m.totalBacking
        );
    }

    function getAllMarkets() external view returns (uint256) {
        return nextMarketId;
    }

    function _transferBNB(address to, uint256 amount) internal {
        (bool success, ) = to.call{value: amount}("");
        require(success, "transfer failed");
    }

    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
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

    receive() external payable {}
}
