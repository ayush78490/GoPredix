// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ==================== INTERFACES ====================

interface IPDX {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IOutcomeToken {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

interface IPredictionMarket {
    function buyYesWithBNBFor(uint256 id, address beneficiary, uint256 minYesOut) external payable;
    function buyNoWithBNBFor(uint256 id, address beneficiary, uint256 minNoOut) external payable;
    function sellYesForBNBFor(uint256 id, address beneficiary, uint256 yesAmount, uint256 minBnbOut) external;
    function sellNoForBNBFor(uint256 id, address beneficiary, uint256 noAmount, uint256 minBnbOut) external;
    function markets(uint256 id) external view returns (
        address creator, uint256 endTime, uint8 status, uint8 outcome,
        address yesToken, address noToken, uint256 yesPool, uint256 noPool, uint256 totalBacking
    );
}

// ==================== MAIN ADAPTER CONTRACT ====================

contract TestnetDualTokenAdapter {
    address public pdxToken;
    address public predictionMarket;
    address public resolutionServer;
    address public owner;
    address public resolutionContract;
    address public viewsAdapter;

    uint256 public feeBps = 50;
    uint256 public lpShareBps = 3000;
    uint256 public nextPDXMarketId;

    struct PDXMarket {
        address creator;
        string question;
        string category;
        uint256 endTime;
        address yesToken;
        address noToken;
        uint256 yesPool;
        uint256 noPool;
        uint256 totalBacking;
        uint8 status;
        uint8 outcome;
    }

    struct UserInvestment {
        uint256 totalInvested;
        uint256 yesBalance;
        uint256 noBalance;
    }

    struct Order {
        uint256 marketId;
        address user;
        uint256 triggerPrice;
        uint256 amount;
        uint8 orderType;
        bool isActive;
    }

    mapping(uint256 => PDXMarket) public pdxMarkets;
    mapping(uint256 => mapping(address => UserInvestment)) public pdxUserInvestments;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders;
    mapping(uint256 => uint256) public platformFeeCollected;

    event MarketCreated(uint256 indexed marketId, address indexed creator, string question);
    event BuyYes(uint256 indexed marketId, address indexed user, uint256 yesAmount, uint256 pdxUsed);
    event BuyNo(uint256 indexed marketId, address indexed user, uint256 noAmount, uint256 pdxUsed);
    event SellYes(uint256 indexed marketId, address indexed user, uint256 yesAmount, uint256 pdxReceived);
    event SellNo(uint256 indexed marketId, address indexed user, uint256 noAmount, uint256 pdxReceived);
    event LiquidityAdded(uint256 indexed marketId, uint256 yesAmount, uint256 noAmount, uint256 liquidity);
    event LiquidityRemoved(uint256 indexed marketId, uint256 yesAmount, uint256 noAmount, uint256 liquidity);
    event OrderCreated(uint256 indexed orderId, uint256 indexed marketId, address indexed user, uint8 orderType);
    event OrderExecuted(uint256 indexed orderId);
    event OrderCancelled(uint256 indexed orderId);
    event FeeUpdated(uint256 newFeeBps, uint256 newLpShareBps);

    constructor(address _pdxToken, address _predictionMarket, address _resolutionServer) {
        require(_pdxToken != address(0), "Invalid PDX token");
        require(_predictionMarket != address(0), "Invalid prediction market");
        require(_resolutionServer != address(0), "Invalid resolution server");

        pdxToken = _pdxToken;
        predictionMarket = _predictionMarket;
        resolutionServer = _resolutionServer;
        owner = msg.sender;
        nextPDXMarketId = 0;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier marketExists(uint256 marketId) {
        require(marketId < nextPDXMarketId, "Market does not exist");
        _;
    }

    modifier validAmount(uint256 amount) {
        require(amount > 0, "Amount must be greater than zero");
        _;
    }

    modifier marketOpen(uint256 marketId) {
        require(pdxMarkets[marketId].status == 0, "Market is not open");
        require(block.timestamp < pdxMarkets[marketId].endTime, "Market has ended");
        _;
    }

    // ==================== MARKET CREATION ====================

    function createMarketWithPDX(
        string memory _question,
        string memory _category,
        uint256 _endTime,
        uint256 _initialYes,
        uint256 _initialNo
    ) external validAmount(_initialYes) validAmount(_initialNo) returns (uint256) {
        require(_endTime > block.timestamp + 1 hours, "Invalid end time");
        require(bytes(_question).length > 0, "Question cannot be empty");

        uint256 marketId = nextPDXMarketId++;
        uint256 totalInitial = _initialYes + _initialNo;

        IOutcomeToken yesToken = IOutcomeToken(address(new OutcomeToken("YES", "YES", address(this))));
        IOutcomeToken noToken = IOutcomeToken(address(new OutcomeToken("NO", "NO", address(this))));

        pdxMarkets[marketId] = PDXMarket({
            creator: msg.sender,
            question: _question,
            category: _category,
            endTime: _endTime,
            yesToken: address(yesToken),
            noToken: address(noToken),
            yesPool: _initialYes,
            noPool: _initialNo,
            totalBacking: totalInitial,
            status: 0,
            outcome: 255
        });

        IPDX(pdxToken).transferFrom(msg.sender, address(this), totalInitial);
        _updateUserInvestment(marketId, msg.sender, totalInitial);

        emit MarketCreated(marketId, msg.sender, _question);
        return marketId;
    }

    // ==================== PDX TRADING ====================

    function buyYesWithPDX(
        uint256 marketId,
        address beneficiary,
        uint256 minYesOut,
        uint256 pdxAmount
    ) external marketExists(marketId) marketOpen(marketId) validAmount(pdxAmount) {
        require(beneficiary != address(0), "Invalid beneficiary");
        IPDX(pdxToken).transferFrom(msg.sender, address(this), pdxAmount);
        _buyWithPDX(marketId, beneficiary, minYesOut, true, pdxAmount);
    }

    function buyNoWithPDX(
        uint256 marketId,
        address beneficiary,
        uint256 minNoOut,
        uint256 pdxAmount
    ) external marketExists(marketId) marketOpen(marketId) validAmount(pdxAmount) {
        require(beneficiary != address(0), "Invalid beneficiary");
        IPDX(pdxToken).transferFrom(msg.sender, address(this), pdxAmount);
        _buyWithPDX(marketId, beneficiary, minNoOut, false, pdxAmount);
    }

    function buyYesWithBNBFor(
        uint256 marketId,
        address beneficiary,
        uint256 minYesOut
    ) external payable marketExists(marketId) marketOpen(marketId) {
        require(msg.value > 0, "Must send BNB");
        require(beneficiary != address(0), "Invalid beneficiary");
        IPredictionMarket(predictionMarket).buyYesWithBNBFor{value: msg.value}(marketId, beneficiary, minYesOut);
    }

    function buyNoWithBNBFor(
        uint256 marketId,
        address beneficiary,
        uint256 minNoOut
    ) external payable marketExists(marketId) marketOpen(marketId) {
        require(msg.value > 0, "Must send BNB");
        require(beneficiary != address(0), "Invalid beneficiary");
        IPredictionMarket(predictionMarket).buyNoWithBNBFor{value: msg.value}(marketId, beneficiary, minNoOut);
    }

    function sellYesForPDX(
        uint256 marketId,
        uint256 tokenAmount,
        uint256 minPDXOut
    ) external marketExists(marketId) validAmount(tokenAmount) {
        PDXMarket storage market = pdxMarkets[marketId];
        require(market.status == 0, "Market is not open for trading");

        IOutcomeToken(market.yesToken).transferFrom(msg.sender, address(this), tokenAmount);
        _sellForPDX(marketId, tokenAmount, minPDXOut, true);
    }

    function sellNoForPDX(
        uint256 marketId,
        uint256 tokenAmount,
        uint256 minPDXOut
    ) external marketExists(marketId) validAmount(tokenAmount) {
        PDXMarket storage market = pdxMarkets[marketId];
        require(market.status == 0, "Market is not open for trading");

        IOutcomeToken(market.noToken).transferFrom(msg.sender, address(this), tokenAmount);
        _sellForPDX(marketId, tokenAmount, minPDXOut, false);
    }

    function sellYesForBNB(
        uint256 marketId,
        uint256 tokenAmount,
        uint256 minBNBOut
    ) external marketExists(marketId) validAmount(tokenAmount) {
        IPredictionMarket(predictionMarket).sellYesForBNBFor(marketId, msg.sender, tokenAmount, minBNBOut);
    }

    function sellNoForBNB(
        uint256 marketId,
        uint256 tokenAmount,
        uint256 minBNBOut
    ) external marketExists(marketId) validAmount(tokenAmount) {
        IPredictionMarket(predictionMarket).sellNoForBNBFor(marketId, msg.sender, tokenAmount, minBNBOut);
    }

    // ==================== LIQUIDITY ====================

    function addPDXLiquidity(
        uint256 marketId,
        uint256 yesAmount,
        uint256 noAmount
    ) external marketExists(marketId) validAmount(yesAmount) validAmount(noAmount) {
        PDXMarket storage market = pdxMarkets[marketId];
        uint256 totalAmount = yesAmount + noAmount;

        IPDX(pdxToken).transferFrom(msg.sender, address(this), totalAmount);

        uint256 liquidity = _sqrt(yesAmount * noAmount);
        market.yesPool += yesAmount;
        market.noPool += noAmount;
        market.totalBacking += totalAmount;

        _updateUserInvestment(marketId, msg.sender, totalAmount);

        emit LiquidityAdded(marketId, yesAmount, noAmount, liquidity);
    }

    function removePDXLiquidity(
        uint256 marketId,
        uint256 lpAmount
    ) external marketExists(marketId) validAmount(lpAmount) {
        PDXMarket storage market = pdxMarkets[marketId];
        require(market.totalBacking >= lpAmount, "Insufficient liquidity");

        uint256 yesShare = (market.yesPool * lpAmount) / market.totalBacking;
        uint256 noShare = (market.noPool * lpAmount) / market.totalBacking;

        market.yesPool -= yesShare;
        market.noPool -= noShare;
        market.totalBacking -= lpAmount;

        IPDX(pdxToken).transfer(msg.sender, lpAmount);

        emit LiquidityRemoved(marketId, yesShare, noShare, lpAmount);
    }

    // ==================== ORDER MANAGEMENT ====================

    function createStopLossOrder(
        uint256 marketId,
        uint256 triggerPrice,
        uint256 amount
    ) external marketExists(marketId) validAmount(amount) {
        require(triggerPrice > 0, "Invalid trigger price");
        uint256 orderId = uint256(keccak256(abi.encodePacked(msg.sender, block.timestamp, marketId)));

        orders[orderId] = Order({
            marketId: marketId,
            user: msg.sender,
            triggerPrice: triggerPrice,
            amount: amount,
            orderType: 0,
            isActive: true
        });

        userOrders[msg.sender].push(orderId);
        emit OrderCreated(orderId, marketId, msg.sender, 0);
    }

    function createTakeProfitOrder(
        uint256 marketId,
        uint256 triggerPrice,
        uint256 amount
    ) external marketExists(marketId) validAmount(amount) {
        require(triggerPrice > 0, "Invalid trigger price");
        uint256 orderId = uint256(keccak256(abi.encodePacked(msg.sender, block.timestamp, marketId)));

        orders[orderId] = Order({
            marketId: marketId,
            user: msg.sender,
            triggerPrice: triggerPrice,
            amount: amount,
            orderType: 1,
            isActive: true
        });

        userOrders[msg.sender].push(orderId);
        emit OrderCreated(orderId, marketId, msg.sender, 1);
    }

    function executeOrder(uint256 orderId) external onlyOwner {
        Order storage order = orders[orderId];
        require(order.isActive, "Order is not active");
        order.isActive = false;
        emit OrderExecuted(orderId);
    }

    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.user == msg.sender || msg.sender == owner, "Not authorized");
        require(order.isActive, "Order is not active");
        order.isActive = false;
        emit OrderCancelled(orderId);
    }

    function checkOrderTrigger(uint256 orderId) external view returns (bool) {
        return orders[orderId].isActive;
    }

    function getUserOrders(address user) external view returns (uint256[] memory) {
        return userOrders[user];
    }

    // ==================== ADMIN ====================

    function setFees(uint256 _feeBps, uint256 _lpShareBps) external onlyOwner {
        require(_feeBps <= 500, "Fee too high");
        require(_lpShareBps <= 10000, "Invalid LP share");
        feeBps = _feeBps;
        lpShareBps = _lpShareBps;
        emit FeeUpdated(_feeBps, _lpShareBps);
    }

    function setResolutionServer(address _server) external onlyOwner {
        require(_server != address(0), "Invalid server");
        resolutionServer = _server;
    }

    function setResolutionContract(address _contract) external onlyOwner {
        require(_contract != address(0), "Invalid contract");
        resolutionContract = _contract;
    }

    function setViewsAdapter(address _views) external onlyOwner {
        require(_views != address(0), "Invalid views");
        viewsAdapter = _views;
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    function withdrawPlatformFees(uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        IPDX(pdxToken).transfer(owner, amount);
    }

    function withdrawPDX(uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        IPDX(pdxToken).transfer(owner, amount);
    }

    function withdrawBNB(uint256 amount) external onlyOwner {
        require(amount > 0 && amount <= address(this).balance, "Invalid amount");
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    // ==================== INTERNAL TRADING FUNCTIONS ====================

    function _buyWithPDX(
        uint256 marketId,
        address beneficiary,
        uint256 minOut,
        bool isYes,
        uint256 pdxAmount
    ) internal {
        PDXMarket storage market = pdxMarkets[marketId];
        require(market.status == 0, "Market not open");

        uint256 platformFee = (pdxAmount * feeBps) / 10000;
        uint256 amountAfterFee = pdxAmount - platformFee;
        platformFeeCollected[marketId] += platformFee;

        uint256 tokenOut;
        if (isYes) {
            tokenOut = _getAmountOut(amountAfterFee, market.noPool, market.yesPool);
            require(tokenOut >= minOut, "Slippage exceeded");
            market.yesPool += amountAfterFee;
            market.noPool -= tokenOut;
            IOutcomeToken(market.yesToken).mint(beneficiary, tokenOut);
            emit BuyYes(marketId, beneficiary, tokenOut, pdxAmount);
        } else {
            tokenOut = _getAmountOut(amountAfterFee, market.yesPool, market.noPool);
            require(tokenOut >= minOut, "Slippage exceeded");
            market.noPool += amountAfterFee;
            market.yesPool -= tokenOut;
            IOutcomeToken(market.noToken).mint(beneficiary, tokenOut);
            emit BuyNo(marketId, beneficiary, tokenOut, pdxAmount);
        }

        _updateUserInvestment(marketId, beneficiary, pdxAmount);
    }

    function _sellForPDX(
        uint256 marketId,
        uint256 tokenAmount,
        uint256 minPDXOut,
        bool isYes
    ) internal {
        PDXMarket storage market = pdxMarkets[marketId];

        uint256 pdxOut;
        if (isYes) {
            pdxOut = _getAmountOut(tokenAmount, market.yesPool, market.noPool);
            require(pdxOut >= minPDXOut, "Slippage exceeded");
            market.yesPool -= tokenAmount;
            market.noPool += pdxOut;
            IOutcomeToken(market.yesToken).burn(address(this), tokenAmount);
            emit SellYes(marketId, msg.sender, tokenAmount, pdxOut);
        } else {
            pdxOut = _getAmountOut(tokenAmount, market.noPool, market.yesPool);
            require(pdxOut >= minPDXOut, "Slippage exceeded");
            market.noPool -= tokenAmount;
            market.yesPool += pdxOut;
            IOutcomeToken(market.noToken).burn(address(this), tokenAmount);
            emit SellNo(marketId, msg.sender, tokenAmount, pdxOut);
        }

        IPDX(pdxToken).transfer(msg.sender, pdxOut);
    }

    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid input");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
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

    function _updateUserInvestment(uint256 marketId, address user, uint256 amount) internal {
        pdxUserInvestments[marketId][user].totalInvested += amount;
    }

    // ==================== REQUEST RESOLUTION ====================

    function requestResolution(uint256 marketId, uint8 outcome) external onlyOwner marketExists(marketId) {
        require(outcome <= 1, "Invalid outcome");
        require(pdxMarkets[marketId].status == 0, "Already resolved");
        pdxMarkets[marketId].status = 1;
        pdxMarkets[marketId].outcome = outcome;
    }

    // ==================== RESOLUTION CALLBACKS ====================

    function resolveMarket(uint256 marketId) external marketExists(marketId) {
        require(msg.sender == resolutionServer || msg.sender == owner, "Not authorized");
        require(pdxMarkets[marketId].status == 1, "Not requested");
        pdxMarkets[marketId].status = 2;
    }

    function claimPDXRedemption(uint256 marketId, uint256 amount) external marketExists(marketId) validAmount(amount) {
        require(pdxMarkets[marketId].status == 2, "Market not resolved");
        pdxUserInvestments[marketId][msg.sender].totalInvested -= amount;
    }

    receive() external payable {}
}

// ==================== OUTCOME TOKEN ====================

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
        require(msg.sender == market, "Only market");
        _;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(to != address(0), "Zero address");
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(to != address(0), "Zero address");
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");
        
        allowance[from][msg.sender] -= value;
        balanceOf[from] -= value;
        balanceOf[to] += value;
        
        emit Transfer(from, to, value);
        return true;
    }

    function mint(address to, uint256 value) external onlyMarket {
        require(to != address(0), "Zero address");
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    function burn(address from, uint256 value) external onlyMarket {
        require(balanceOf[from] >= value, "Insufficient balance");
        balanceOf[from] -= value;
        totalSupply -= value;
        emit Transfer(from, address(0), value);
    }
}
