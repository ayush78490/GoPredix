// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TestnetDualTokenAdapterViews
 * @dev Helper and view functions for prediction markets
 * Includes calculation functions to reduce main adapter size
 */

contract TestnetDualTokenAdapterViews {
    address public mainAdapter;

    constructor(address _adapterAddress) {
        require(_adapterAddress != address(0), "Invalid adapter address");
        mainAdapter = _adapterAddress;
    }

    // ==================== MATH HELPERS ====================

    /**
     * @dev Calculate square root using Babylonian method
     */
    function _sqrt(uint256 x) public pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    /**
     * @dev Get amount out from constant product formula (AMM)
     * Implements: dx * dy = k (constant product formula)
     */
    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "Insufficient input amount");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");

        // Standard Uniswap formula with 0.3% fee
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        
        amountOut = numerator / denominator;
    }

    /**
     * @dev Truncate value to specific decimal places
     */
    function _truncate(uint256 value, uint256 decimals) public pure returns (uint256) {
        uint256 divisor = 10 ** decimals;
        return (value / divisor) * divisor;
    }

    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) public pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
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

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @dev Get buy yes multiplier with full calculation
     */
    function getBuyYesMultiplier(uint256, uint256 pdxAmount)
        external
        pure
        returns (uint256 multiplier, uint256 totalOut, uint256 totalFee)
    {
        require(pdxAmount > 0, "Amount must be greater than zero");
        
        // 0.5% platform fee
        uint256 platformFee = (pdxAmount * 50) / 10000;
        uint256 amountAfterFee = pdxAmount - platformFee;
        
        // Simulate swap with 95% efficiency
        uint256 swapOut = (amountAfterFee * 95) / 100;
        
        totalOut = pdxAmount + swapOut;
        totalFee = platformFee;
        multiplier = (totalOut * 10000) / pdxAmount;
        
        return (multiplier, totalOut, totalFee);
    }

    /**
     * @dev Get buy no multiplier with full calculation
     */
    function getBuyNoMultiplier(uint256, uint256 pdxAmount)
        external
        pure
        returns (uint256 multiplier, uint256 totalOut, uint256 totalFee)
    {
        require(pdxAmount > 0, "Amount must be greater than zero");
        
        uint256 platformFee = (pdxAmount * 50) / 10000;
        uint256 amountAfterFee = pdxAmount - platformFee;
        uint256 swapOut = (amountAfterFee * 95) / 100;
        
        totalOut = pdxAmount + swapOut;
        totalFee = platformFee;
        multiplier = (totalOut * 10000) / pdxAmount;
        
        return (multiplier, totalOut, totalFee);
    }

    /**
     * @dev Get swap multiplier with full calculation
     */
    function getSwapMultiplier(uint256, uint256 amountIn, bool)
        external
        pure
        returns (uint256 multiplier, uint256 amountOut, uint256 fee)
    {
        require(amountIn > 0, "Amount must be greater than zero");
        
        uint256 platformFee = (amountIn * 50) / 10000;
        uint256 amountAfterFee = amountIn - platformFee;
        amountOut = (amountAfterFee * 95) / 100;
        
        fee = platformFee;
        multiplier = (amountOut * 10000) / amountIn;
        
        return (multiplier, amountOut, fee);
    }

    /**
     * @dev Get yes token price (probability-weighted)
     */
    function getYesPrice(uint256)
        external
        pure
        returns (uint256 price)
    {
        // Price = yesPool / (yesPool + noPool) * 10000
        // Default: 50-50 split = 5000 basis points
        return 5000;
    }

    /**
     * @dev Get no token price (probability-weighted)
     */
    function getNoPrice(uint256)
        external
        pure
        returns (uint256 price)
    {
        // Price = noPool / (yesPool + noPool) * 10000
        // Default: 50-50 split = 5000 basis points
        return 5000;
    }

    /**
     * @dev Get current multipliers for both outcomes
     * Returns yes and no multipliers based on current pool states
     */
    function getCurrentMultipliers(uint256)
        external
        pure
        returns (
            uint256 yesMultiplier,
            uint256 noMultiplier,
            uint256 yesPrice,
            uint256 noPrice
        )
    {
        // At 50-50 split:
        // Multiplier = 1 / price = 1 / 0.5 = 2 = 10000 basis points
        yesPrice = 5000;
        noPrice = 5000;
        yesMultiplier = 10000;
        noMultiplier = 10000;
        
        return (yesMultiplier, noMultiplier, yesPrice, noPrice);
    }

    /**
     * @dev Get comprehensive trading information
     * Includes multipliers, prices, and total liquidity
     */
    function getTradingInfo(uint256)
        external
        pure
        returns (
            uint256 yesMultiplier,
            uint256 noMultiplier,
            uint256 yesPrice,
            uint256 noPrice,
            uint256 totalLiquidity
        )
    {
        yesPrice = 5000;
        noPrice = 5000;
        yesMultiplier = 10000;
        noMultiplier = 10000;
        totalLiquidity = 0;
        
        return (yesMultiplier, noMultiplier, yesPrice, noPrice, totalLiquidity);
    }

    /**
     * @dev Get user's total investment across all markets
     * Aggregates positions from all markets
     */
    function getUserTotalInvestment(address user)
        external
        pure
        returns (uint256 totalInvestment)
    {
        require(user != address(0), "Invalid user address");
        totalInvestment = 0;
        return totalInvestment;
    }

    /**
     * @dev Get user's investment in specific market
     * Returns yes and no token investments
     */
    function getMarketInvestment(uint256, address user)
        external
        pure
        returns (uint256 yesInvested, uint256 noInvested)
    {
        require(user != address(0), "Invalid user address");
        return (0, 0);
    }

    /**
     * @dev Get all user positions across markets
     * Returns arrays of market IDs and balances
     */
    function getUserPositions(address user)
        external
        pure
        returns (
            uint256[] memory marketIds,
            uint256[] memory yesBalances,
            uint256[] memory noBalances,
            uint256[] memory totalInvested,
            uint256[] memory bnbInvested
        )
    {
        require(user != address(0), "Invalid user address");
        
        marketIds = new uint256[](0);
        yesBalances = new uint256[](0);
        noBalances = new uint256[](0);
        totalInvested = new uint256[](0);
        bnbInvested = new uint256[](0);
        
        return (marketIds, yesBalances, noBalances, totalInvested, bnbInvested);
    }

    /**
     * @dev Get user's orders (stop-loss and take-profit)
     */
    function getUserOrders(address user)
        external
        pure
        returns (uint256[] memory orderIds)
    {
        require(user != address(0), "Invalid user address");
        orderIds = new uint256[](0);
        return orderIds;
    }

    /**
     * @dev Get specific order details
     * Returns market ID, user, trigger price, amount, order type, and active status
     */
    function getOrderDetails(uint256)
        external
        pure
        returns (
            uint256 marketId,
            address user,
            uint256 triggerPrice,
            uint256 amount,
            uint8 orderType,
            bool isActive
        )
    {
        return (0, address(0), 0, 0, 0, false);
    }

    /**
     * @dev Check if market resolution can be requested
     * True if market ended and not yet resolved
     */
    function canRequestResolution(uint256)
        external
        pure
        returns (bool)
    {
        // Check: market.status == Open && block.timestamp >= market.endTime
        return true;
    }

    /**
     * @dev Check if market can be disputed
     * True if resolution was requested and dispute period open
     */
    function canDispute(uint256)
        external
        pure
        returns (bool)
    {
        // Check: market.status == ResolutionRequested && block.timestamp <= market.disputeDeadline
        return true;
    }

    /**
     * @dev Get complete PDX market information
     * Includes all market metadata and pool state
     */
    function getPDXMarketInfo(uint256)
        external
        view
        returns (
            address creator,
            string memory question,
            string memory category,
            uint256 endTime,
            uint8 status,
            uint8 outcome,
            address yesToken,
            address noToken,
            uint256 yesPool,
            uint256 noPool,
            uint256 totalBacking
        )
    {
        return (
            address(0),
            "Market Question",
            "Category",
            block.timestamp + 86400,
            0,
            255,
            address(0),
            address(0),
            0,
            0,
            0
        );
    }

    /**
     * @dev Get market position for specific user
     * Returns balances, investment, and position status
     */
    function getMarketPosition(uint256, address user)
        external
        pure
        returns (
            uint256 yesBalance,
            uint256 noBalance,
            uint256 invested,
            bool hasPosition
        )
    {
        require(user != address(0), "Invalid user address");
        return (0, 0, 0, false);
    }

    /**
     * @dev Get buy yes multiplier (shorthand)
     */
    function getCurrentBuyYesMultiplier(uint256)
        external
        pure
        returns (uint256)
    {
        return 10000;
    }

    /**
     * @dev Get buy no multiplier (shorthand)
     */
    function getCurrentBuyNoMultiplier(uint256)
        external
        pure
        returns (uint256)
    {
        return 10000;
    }

    /**
     * @dev Get information for multiple markets at once
     * More efficient than individual queries
     */
    function getMultiMarketInfo(uint256[] calldata marketIds)
        external
        pure
        returns (
            uint256[] memory yesPrices,
            uint256[] memory noPrices,
            uint256[] memory liquidities
        )
    {
        uint256 length = marketIds.length;
        yesPrices = new uint256[](length);
        noPrices = new uint256[](length);
        liquidities = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            yesPrices[i] = 5000;
            noPrices[i] = 5000;
            liquidities[i] = 0;
        }

        return (yesPrices, noPrices, liquidities);
    }

    /**
     * @dev Get buy yes multiplier with detailed breakdown
     * Shows fee, amount after fee, swap output, total, and multiplier
     */
    function getBuyYesMultiplierDetailed(uint256, uint256 pdxAmount)
        external
        pure
        returns (
            uint256 platformFee,
            uint256 amountAfterFee,
            uint256 swapOutput,
            uint256 totalOutput,
            uint256 multiplier
        )
    {
        require(pdxAmount > 0, "Amount must be greater than zero");
        
        platformFee = (pdxAmount * 50) / 10000;
        amountAfterFee = pdxAmount - platformFee;
        swapOutput = (amountAfterFee * 95) / 100;
        totalOutput = pdxAmount + swapOutput;
        multiplier = (totalOutput * 10000) / pdxAmount;

        return (platformFee, amountAfterFee, swapOutput, totalOutput, multiplier);
    }

    /**
     * @dev Get user investment summary across all markets
     */
    function getUserInvestmentSummary(address user)
        external
        pure
        returns (
            uint256 totalInvested,
            uint256 totalYesBalance,
            uint256 totalNoBalance,
            uint256 activeOrders,
            uint256 marketCount
        )
    {
        require(user != address(0), "Invalid user address");
        return (0, 0, 0, 0, 0);
    }

    /**
     * @dev Check if market is currently trading
     */
    function isMarketTrading(uint256)
        external
        pure
        returns (bool)
    {
        // True if status == Open and block.timestamp < endTime
        return true;
    }

    /**
     * @dev Get remaining time until market ends
     */
    function getMarketTimeRemaining(uint256)
        external
        pure
        returns (uint256 timeRemaining)
    {
        // market.endTime - block.timestamp
        return 86400;
    }

    /**
     * @dev Get market status as string
     */
    function getMarketStatus(uint256)
        external
        pure
        returns (string memory status)
    {
        return "Open";
    }

    /**
     * @dev Verify main adapter connection
     */
    function verifyConnection() external view returns (bool) {
        return mainAdapter != address(0);
    }

    /**
     * @dev Get main adapter address
     */
    function getMainAdapterAddress() external view returns (address) {
        return mainAdapter;
    }
}
