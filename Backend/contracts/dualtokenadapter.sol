// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ==================== INTERFACES ====================

interface IPDX {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IPredictionMarketCore {
    function createMarket(
        string calldata question,
        string calldata category,
        uint256 endTime,
        uint256 initialYes,
        uint256 initialNo
    ) external payable returns (uint256);
    
    function buyYesWithBNBFor(uint256 id, address beneficiary, uint256 minYesOut) external payable;
    function buyNoWithBNBFor(uint256 id, address beneficiary, uint256 minNoOut) external payable;
    
    function sellYesForBNB(uint256 id, uint256 tokenAmount, uint256 minBNBOut) external;
    function sellNoForBNB(uint256 id, uint256 tokenAmount, uint256 minBNBOut) external;
    
    function addLiquidity(uint256 id, uint256 yesAmount, uint256 noAmount) external;
    function removeLiquidity(uint256 id, uint256 lpAmount) external;
    
    function claimRedemption(uint256 id) external;
    
    function createStopLossOrder(uint256 marketId, bool isYes, uint256 tokenAmount, uint256 stopLossPrice) external returns (uint256);
    function createTakeProfitOrder(uint256 marketId, bool isYes, uint256 tokenAmount, uint256 takeProfitPrice) external returns (uint256);
    
    function executeOrder(uint256 orderId) external;
    function cancelOrder(uint256 orderId) external;
}

interface IUniswapV2Router {
    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view returns (uint[] memory amounts);
}

// ==================== MAIN ADAPTER CONTRACT ====================

/**
 * @title TestnetDualTokenAdapter
 * @dev BSC Testnet adapter for dual-token support (BNB + PDX)
 */
contract TestnetDualTokenAdapter {
    
    // ==================== STATE VARIABLES ====================
    
    IPDX public pdxToken;
    IPredictionMarketCore public predictionMarket;
    IUniswapV2Router public dexRouter;
    
    address public owner;
    
    uint256 public slippageTolerance = 5; // 5% for testnet
    address public TBNB; // TBNB address on BSC testnet
    
    // Tracking
    enum PaymentToken { BNB, PDX }
    mapping(uint256 => PaymentToken) public marketPaymentToken;
    
    // ==================== EVENTS ====================
    
    event MarketCreatedWithPDX(uint256 indexed marketId, address indexed creator, uint256 pdxAmount);
    event MarketCreatedWithBNB(uint256 indexed marketId, address indexed creator, uint256 bnbAmount);
    
    event BuyWithPDX(
        uint256 indexed marketId,
        address indexed user,
        bool isYes,
        uint256 pdxAmount,
        uint256 bnbConverted
    );
    
    event BuyWithBNB(uint256 indexed marketId, address indexed user, bool isYes, uint256 bnbAmount);
    
    event SellForPDX(
        uint256 indexed marketId,
        address indexed user,
        bool isYes,
        uint256 tokenAmount,
        uint256 pdxReceived
    );
    
    event SellForBNB(uint256 indexed marketId, address indexed user, bool isYes, uint256 tokenAmount, uint256 bnbReceived);
    
    event PDXSwappedToBNB(uint256 pdxIn, uint256 bnbOut);
    event BNBSwappedToPDX(uint256 bnbIn, uint256 pdxOut);
    event SlippageToleranceUpdated(uint256 newSlippage);
    
    // ==================== MODIFIERS ====================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    // ==================== CONSTRUCTOR ====================
    
    /**
     * @dev Initialize adapter for BSC Testnet
     * @param _pdxToken Your PDX token address
     * @param _predictionMarket Your PredictionMarketWithMultipliers address
     * @param _dexRouter PancakeSwap Router Testnet (0xD99D1c33F9fC3444f8101754ABC46c52416F2D4a)
     * @param _tbnb TBNB address (0xae13d989daC2f0dEFF460aC112a837C12d6E4cAB)
     */
    constructor(
        address _pdxToken,
        address _predictionMarket,
        address _dexRouter,
        address _tbnb
    ) {
        require(_pdxToken != address(0), "Invalid PDX");
        require(_predictionMarket != address(0), "Invalid market");
        require(_dexRouter != address(0), "Invalid router");
        require(_tbnb != address(0), "Invalid TBNB");
        
        pdxToken = IPDX(_pdxToken);
        predictionMarket = IPredictionMarketCore(_predictionMarket);
        dexRouter = IUniswapV2Router(_dexRouter);
        TBNB = _tbnb;
        owner = msg.sender;
    }
    
    // ==================== MARKET CREATION ====================
    
    /**
     * @dev Create market with native BNB (pass-through)
     */
    function createMarketWithBNB(
        string calldata question,
        string calldata category,
        uint256 endTime,
        uint256 initialYes,
        uint256 initialNo
    ) external payable returns (uint256) {
        require(msg.value > 0, "Zero BNB");
        
        uint256 marketId = predictionMarket.createMarket{value: msg.value}(
            question,
            category,
            endTime,
            initialYes,
            initialNo
        );
        
        marketPaymentToken[marketId] = PaymentToken.BNB;
        
        emit MarketCreatedWithBNB(marketId, msg.sender, msg.value);
        return marketId;
    }
    
    /**
     * @dev Create market with PDX (converts to BNB via swap)
     */
    function createMarketWithPDX(
        string calldata question,
        string calldata category,
        uint256 endTime,
        uint256 initialYes,
        uint256 initialNo,
        uint256 pdxAmount
    ) external returns (uint256) {
        require(pdxAmount > 0, "Zero PDX");
        
        // 1. Receive PDX from user
        require(
            pdxToken.transferFrom(msg.sender, address(this), pdxAmount),
            "PDX transfer failed"
        );
        
        // 2. Convert PDX to BNB
        uint256 bnbAmount = _swapPDXToBNB(pdxAmount);
        require(bnbAmount > 0, "Swap failed");
        
        // 3. Create market with BNB
        uint256 marketId = predictionMarket.createMarket{value: bnbAmount}(
            question,
            category,
            endTime,
            initialYes,
            initialNo
        );
        
        marketPaymentToken[marketId] = PaymentToken.PDX;
        
        emit MarketCreatedWithPDX(marketId, msg.sender, pdxAmount);
        return marketId;
    }
    
    // ==================== BUYING FUNCTIONS ====================
    
    /**
     * @dev Buy YES with native BNB (pass-through)
     */
    function buyYesWithBNB(
        uint256 marketId,
        address beneficiary,
        uint256 minYesOut
    ) external payable {
        require(msg.value > 0, "Zero BNB");
        predictionMarket.buyYesWithBNBFor{value: msg.value}(marketId, beneficiary, minYesOut);
        emit BuyWithBNB(marketId, msg.sender, true, msg.value);
    }
    
    /**
     * @dev Buy NO with native BNB (pass-through)
     */
    function buyNoWithBNB(
        uint256 marketId,
        address beneficiary,
        uint256 minNoOut
    ) external payable {
        require(msg.value > 0, "Zero BNB");
        predictionMarket.buyNoWithBNBFor{value: msg.value}(marketId, beneficiary, minNoOut);
        emit BuyWithBNB(marketId, msg.sender, false, msg.value);
    }
    
    /**
     * @dev Buy YES with PDX (converts PDX to BNB, then buys)
     */
    function buyYesWithPDX(
        uint256 marketId,
        address beneficiary,
        uint256 pdxAmount,
        uint256 minBNBOut,
        uint256 minYesOut
    ) external {
        require(pdxAmount > 0, "Zero PDX");
        require(beneficiary != address(0), "Invalid beneficiary");
        
        // 1. Receive PDX from user
        require(
            pdxToken.transferFrom(msg.sender, address(this), pdxAmount),
            "PDX transfer failed"
        );
        
        // 2. Convert PDX to BNB
        uint256 bnbAmount = _swapPDXToBNB(pdxAmount);
        require(bnbAmount >= minBNBOut, "Slippage exceeded");
        
        // 3. Buy YES with BNB
        predictionMarket.buyYesWithBNBFor{value: bnbAmount}(marketId, beneficiary, minYesOut);
        
        emit BuyWithPDX(marketId, msg.sender, true, pdxAmount, bnbAmount);
    }
    
    /**
     * @dev Buy NO with PDX
     */
    function buyNoWithPDX(
        uint256 marketId,
        address beneficiary,
        uint256 pdxAmount,
        uint256 minBNBOut,
        uint256 minNoOut
    ) external {
        require(pdxAmount > 0, "Zero PDX");
        require(beneficiary != address(0), "Invalid beneficiary");
        
        // 1. Receive PDX from user
        require(
            pdxToken.transferFrom(msg.sender, address(this), pdxAmount),
            "PDX transfer failed"
        );
        
        // 2. Convert PDX to BNB
        uint256 bnbAmount = _swapPDXToBNB(pdxAmount);
        require(bnbAmount >= minBNBOut, "Slippage exceeded");
        
        // 3. Buy NO with BNB
        predictionMarket.buyNoWithBNBFor{value: bnbAmount}(marketId, beneficiary, minNoOut);
        
        emit BuyWithPDX(marketId, msg.sender, false, pdxAmount, bnbAmount);
    }
    
    // ==================== SELLING FUNCTIONS ====================
    
    /**
     * @dev Sell YES for BNB (pass-through)
     */
    function sellYesForBNB(
        uint256 marketId,
        uint256 tokenAmount,
        uint256 minBNBOut
    ) external {
        require(tokenAmount > 0, "Zero amount");
        predictionMarket.sellYesForBNB(marketId, tokenAmount, minBNBOut);
        
        // Transfer BNB to user
        uint256 bnbBalance = address(this).balance;
        if (bnbBalance > 0) {
            (bool success, ) = msg.sender.call{value: bnbBalance}("");
            require(success, "BNB transfer failed");
        }
        
        emit SellForBNB(marketId, msg.sender, true, tokenAmount, minBNBOut);
    }
    
    /**
     * @dev Sell NO for BNB (pass-through)
     */
    function sellNoForBNB(
        uint256 marketId,
        uint256 tokenAmount,
        uint256 minBNBOut
    ) external {
        require(tokenAmount > 0, "Zero amount");
        predictionMarket.sellNoForBNB(marketId, tokenAmount, minBNBOut);
        
        // Transfer BNB to user
        uint256 bnbBalance = address(this).balance;
        if (bnbBalance > 0) {
            (bool success, ) = msg.sender.call{value: bnbBalance}("");
            require(success, "BNB transfer failed");
        }
        
        emit SellForBNB(marketId, msg.sender, false, tokenAmount, minBNBOut);
    }
    
    /**
     * @dev Sell YES for PDX (sells for BNB, converts to PDX)
     */
    function sellYesForPDX(
        uint256 marketId,
        uint256 tokenAmount,
        uint256 minBNBOut,
        uint256 minPDXOut
    ) external {
        require(tokenAmount > 0, "Zero amount");
        
        // 1. Sell YES for BNB
        predictionMarket.sellYesForBNB(marketId, tokenAmount, minBNBOut);
        
        // 2. Get received BNB
        uint256 bnbBalance = address(this).balance;
        require(bnbBalance >= minBNBOut, "Insufficient BNB received");
        
        // 3. Convert BNB to PDX
        uint256 pdxAmount = _swapBNBToPDX(bnbBalance);
        require(pdxAmount >= minPDXOut, "Slippage exceeded");
        
        // 4. Transfer PDX to user
        require(pdxToken.transfer(msg.sender, pdxAmount), "PDX transfer failed");
        
        emit SellForPDX(marketId, msg.sender, true, tokenAmount, pdxAmount);
    }
    
    /**
     * @dev Sell NO for PDX
     */
    function sellNoForPDX(
        uint256 marketId,
        uint256 tokenAmount,
        uint256 minBNBOut,
        uint256 minPDXOut
    ) external {
        require(tokenAmount > 0, "Zero amount");
        
        // 1. Sell NO for BNB
        predictionMarket.sellNoForBNB(marketId, tokenAmount, minBNBOut);
        
        // 2. Get received BNB
        uint256 bnbBalance = address(this).balance;
        require(bnbBalance >= minBNBOut, "Insufficient BNB received");
        
        // 3. Convert BNB to PDX
        uint256 pdxAmount = _swapBNBToPDX(bnbBalance);
        require(pdxAmount >= minPDXOut, "Slippage exceeded");
        
        // 4. Transfer PDX to user
        require(pdxToken.transfer(msg.sender, pdxAmount), "PDX transfer failed");
        
        emit SellForPDX(marketId, msg.sender, false, tokenAmount, pdxAmount);
    }
    
    // ==================== LIQUIDITY FUNCTIONS ====================
    
    /**
     * @dev Add liquidity with outcome tokens
     */
    function addLiquidity(
        uint256 marketId,
        uint256 yesAmount,
        uint256 noAmount
    ) external {
        require(yesAmount > 0 && noAmount > 0, "Zero amount");
        predictionMarket.addLiquidity(marketId, yesAmount, noAmount);
    }
    
    /**
     * @dev Remove liquidity
     */
    function removeLiquidity(uint256 marketId, uint256 lpAmount) external {
        require(lpAmount > 0, "Zero amount");
        predictionMarket.removeLiquidity(marketId, lpAmount);
    }
    
    // ==================== ORDER FUNCTIONS ====================
    
    /**
     * @dev Create stop-loss order
     */
    function createStopLossOrder(
        uint256 marketId,
        bool isYes,
        uint256 tokenAmount,
        uint256 stopLossPrice
    ) external returns (uint256) {
        return predictionMarket.createStopLossOrder(marketId, isYes, tokenAmount, stopLossPrice);
    }
    
    /**
     * @dev Create take-profit order
     */
    function createTakeProfitOrder(
        uint256 marketId,
        bool isYes,
        uint256 tokenAmount,
        uint256 takeProfitPrice
    ) external returns (uint256) {
        return predictionMarket.createTakeProfitOrder(marketId, isYes, tokenAmount, takeProfitPrice);
    }
    
    /**
     * @dev Execute order
     */
    function executeOrder(uint256 orderId) external {
        predictionMarket.executeOrder(orderId);
    }
    
    /**
     * @dev Cancel order
     */
    function cancelOrder(uint256 orderId) external {
        predictionMarket.cancelOrder(orderId);
    }
    
    // ==================== REDEMPTION ====================
    
    /**
     * @dev Claim redemption
     */
    function claimRedemption(uint256 marketId) external {
        predictionMarket.claimRedemption(marketId);
    }
    
    // ==================== INTERNAL SWAP FUNCTIONS ====================
    
    /**
     * @dev Swap PDX to BNB via PancakeSwap
     */
    function _swapPDXToBNB(uint256 pdxAmount) internal returns (uint256) {
        // Approve DEX
        require(pdxToken.approve(address(dexRouter), pdxAmount), "Approval failed");
        
        address[] memory path = new address[](2);
        path[0] = address(pdxToken);
        path[1] = TBNB;
        
        // Get minimum output with slippage
        uint[] memory amounts = dexRouter.getAmountsOut(pdxAmount, path);
        uint256 minBNB = (amounts[1] * (100 - slippageTolerance)) / 100;
        
        // Execute swap
        uint[] memory swapAmounts = dexRouter.swapExactTokensForETH(
            pdxAmount,
            minBNB,
            path,
            address(this),
            block.timestamp + 300
        );
        
        emit PDXSwappedToBNB(pdxAmount, swapAmounts[1]);
        return swapAmounts[1];
    }
    
    /**
     * @dev Swap BNB to PDX via PancakeSwap
     */
    function _swapBNBToPDX(uint256 bnbAmount) internal returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = TBNB;
        path[1] = address(pdxToken);
        
        uint[] memory amounts = dexRouter.getAmountsOut(bnbAmount, path);
        uint256 minPDX = (amounts[1] * (100 - slippageTolerance)) / 100;
        
        uint[] memory swapAmounts = dexRouter.swapExactTokensForETH(
            bnbAmount,
            minPDX,
            path,
            address(this),
            block.timestamp + 300
        );
        
        emit BNBSwappedToPDX(bnbAmount, swapAmounts[1]);
        return swapAmounts[1];
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @dev Get market creation token type
     */
    function getMarketPaymentToken(uint256 marketId) external view returns (string memory) {
        return marketPaymentToken[marketId] == PaymentToken.BNB ? "BNB" : "PDX";
    }
    
    /**
     * @dev Get minimum BNB output for PDX swap
     */
    function getMinBNBForPDX(uint256 pdxAmount) external view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = address(pdxToken);
        path[1] = TBNB;
        
        uint[] memory amounts = dexRouter.getAmountsOut(pdxAmount, path);
        return (amounts[1] * (100 - slippageTolerance)) / 100;
    }
    
    /**
     * @dev Get minimum PDX output for BNB swap
     */
    function getMinPDXForBNB(uint256 bnbAmount) external view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = TBNB;
        path[1] = address(pdxToken);
        
        uint[] memory amounts = dexRouter.getAmountsOut(bnbAmount, path);
        return (amounts[1] * (100 - slippageTolerance)) / 100;
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @dev Update slippage tolerance
     */
    function setSlippageTolerance(uint256 _slippage) external onlyOwner {
        require(_slippage < 100, "Invalid slippage");
        slippageTolerance = _slippage;
        emit SlippageToleranceUpdated(_slippage);
    }
    
    /**
     * @dev Withdraw stuck PDX tokens
     */
    function withdrawPDX() external onlyOwner {
        uint256 balance = pdxToken.balanceOf(address(this));
        require(balance > 0, "Zero balance");
        require(pdxToken.transfer(owner, balance), "Transfer failed");
    }
    
    /**
     * @dev Withdraw stuck BNB
     */
    function withdrawBNB() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Zero balance");
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ==================== FALLBACK ====================
    
    receive() external payable {}
}
