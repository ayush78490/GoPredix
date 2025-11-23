// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PDX Prediction Market Helper
 * @notice Helper contract providing view functions for PDX prediction markets
 * @dev Read-only functions for market data, multipliers, and user positions
 */

// ==================== INTERFACES ====================

interface IOutcomeToken {
    function balanceOf(address account) external view returns (uint256);
}

interface IPDX {
    function balanceOf(address account) external view returns (uint256);
}

interface IPDXPredictionMarketCore {
    struct Market {
        address creator;
        string question;
        string category;
        uint256 endTime;
        uint8 status;
        uint8 outcome;
        address yesToken;
        address noToken;
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

    struct UserInvestment {
        uint256 totalInvested;
        uint256 lastUpdated;
    }

    function markets(uint256) external view returns (
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
        uint256 totalBacking,
        uint256 platformFees,
        uint256 resolutionRequestedAt,
        address resolutionRequester,
        string memory resolutionReason,
        uint256 resolutionConfidence,
        uint256 disputeDeadline,
        address disputer,
        string memory disputeReason
    );

    function userInvestments(uint256 marketId, address user) external view returns (
        uint256 totalInvested,
        uint256 lastUpdated
    );

    function nextMarketId() external view returns (uint256);
    function feeBps() external view returns (uint32);
    function lpFeeBps() external view returns (uint32);
}

// ==================== HELPER CONTRACT ====================

contract PDXPredictionMarketHelper {
    IPDXPredictionMarketCore public immutable predictionMarket;
    address public immutable pdxToken;

    // Enums matching the main contract
    enum MarketStatus { Open, Closed, ResolutionRequested, Resolved, Disputed }
    enum Outcome { Undecided, Yes, No }

    struct UserPosition {
        uint256 marketId;
        uint256 yesBalance;
        uint256 noBalance;
        uint256 totalInvested;
        uint256 pdxInvested;
    }

    struct MultiplierInfo {
        uint256 multiplier; // Scaled by 10000 (e.g., 15000 = 1.5x)
        uint256 totalOut;
        uint256 totalFee;
    }

    struct TradingInfo {
        uint256 yesMultiplier;
        uint256 noMultiplier;
        uint256 yesPrice;
        uint256 noPrice;
        uint256 totalLiquidity;
    }

    constructor(address _predictionMarket, address _pdxToken) {
        require(_predictionMarket != address(0) && _pdxToken != address(0), "Invalid addresses");
        predictionMarket = IPDXPredictionMarketCore(_predictionMarket);
        pdxToken = _pdxToken;
    }

    // ==================== USER INVESTMENT TRACKING ====================

    /**
     * @notice Get user's total PDX investment in a specific market
     * @param marketId The market ID
     * @param user The user address
     * @return Total PDX invested by user in this market
     */
    function getMarketInvestment(uint256 marketId, address user) 
        external 
        view 
        returns (uint256) 
    {
        (uint256 totalInvested, ) = predictionMarket.userInvestments(marketId, user);
        return totalInvested;
    }

    /**
     * @notice Get user's total PDX investment across all markets
     * @param user The user address
     * @return totalInvestment Total PDX invested across all markets
     */
    function getUserTotalInvestment(address user) 
        external 
        view 
        returns (uint256 totalInvestment) 
    {
        uint256 marketCount = predictionMarket.nextMarketId();
        
        for (uint256 i = 0; i < marketCount; i++) {
            (uint256 invested, ) = predictionMarket.userInvestments(i, user);
            totalInvestment += invested;
        }
        
        return totalInvestment;
    }

    /**
     * @notice Get all user positions across all markets
     * @param user The user address
     * @return positions Array of user positions
     */
    function getUserPositions(address user) 
        external 
        view 
        returns (UserPosition[] memory) 
    {
        uint256 marketCount = predictionMarket.nextMarketId();
        
        // First pass: count positions with balances
        uint256 positionCount = 0;
        for (uint256 i = 0; i < marketCount; i++) {
            try this._checkPosition(i, user) returns (bool hasPosition) {
                if (hasPosition) positionCount++;
            } catch {}
        }
        
        // Second pass: populate positions
        UserPosition[] memory positions = new UserPosition[](positionCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < marketCount; i++) {
            try this._getPosition(i, user) returns (UserPosition memory pos) {
                if (pos.yesBalance > 0 || pos.noBalance > 0) {
                    positions[index] = pos;
                    index++;
                }
            } catch {}
        }
        
        return positions;
    }

    /**
     * @dev Internal helper to check if user has position (external for try/catch)
     * @param marketId The market ID
     * @param user The user address
     * @return hasPosition True if user has YES or NO tokens
     */
    function _checkPosition(uint256 marketId, address user) 
        external 
        view 
        returns (bool hasPosition) 
    {
        (, , , , , , address yesToken, address noToken, , , , , , , , , , , ) = 
            predictionMarket.markets(marketId);
        
        uint256 yesBalance = IOutcomeToken(yesToken).balanceOf(user);
        uint256 noBalance = IOutcomeToken(noToken).balanceOf(user);
        
        return yesBalance > 0 || noBalance > 0;
    }

    /**
     * @dev Internal helper to get position details (external for try/catch)
     * @param marketId The market ID
     * @param user The user address
     * @return position UserPosition struct with balance and investment details
     */
    function _getPosition(uint256 marketId, address user) 
        external 
        view 
        returns (UserPosition memory position) 
    {
        (, , , , , , address yesToken, address noToken, , , , , , , , , , , ) = 
            predictionMarket.markets(marketId);
        
        uint256 yesBalance = IOutcomeToken(yesToken).balanceOf(user);
        uint256 noBalance = IOutcomeToken(noToken).balanceOf(user);
        (uint256 pdxInvested, ) = predictionMarket.userInvestments(marketId, user);
        
        return UserPosition({
            marketId: marketId,
            yesBalance: yesBalance,
            noBalance: noBalance,
            totalInvested: yesBalance + noBalance,
            pdxInvested: pdxInvested
        });
    }

    // ==================== MULTIPLIER CALCULATIONS ====================

    /**
     * @notice Calculate multiplier and output for buying YES tokens with PDX
     * @param marketId The market ID
     * @param pdxAmount Amount of PDX to spend
     * @return multiplier The effective multiplier (scaled by 10000)
     * @return totalOut Total YES tokens received
     * @return totalFee Total fees paid
     */
    function getBuyYesMultiplier(uint256 marketId, uint256 pdxAmount) 
        external 
        view 
        returns (uint256 multiplier, uint256 totalOut, uint256 totalFee) 
    {
        require(pdxAmount > 0, "Zero amount");
        
        (, , , , , , , , uint256 yesPool, uint256 noPool, , , , , , , , , ) = 
            predictionMarket.markets(marketId);
        
        uint32 feeBps = predictionMarket.feeBps();
        
        // Calculate fees
        uint256 platformFee = (pdxAmount * feeBps) / 10000;
        uint256 amountAfterFee = pdxAmount - platformFee;
        
        // Calculate swap output
        uint256 swapOut = _getAmountOut(amountAfterFee, noPool, yesPool);
        
        // Total YES tokens = direct mint + swap output
        totalOut = pdxAmount + swapOut;
        totalFee = platformFee;
        
        // Multiplier = (total tokens received / PDX spent) * 10000
        multiplier = (totalOut * 10000) / pdxAmount;
        
        return (multiplier, totalOut, totalFee);
    }

    /**
     * @notice Calculate multiplier and output for buying NO tokens with PDX
     * @param marketId The market ID
     * @param pdxAmount Amount of PDX to spend
     * @return multiplier The effective multiplier (scaled by 10000)
     * @return totalOut Total NO tokens received
     * @return totalFee Total fees paid
     */
    function getBuyNoMultiplier(uint256 marketId, uint256 pdxAmount) 
        external 
        view 
        returns (uint256 multiplier, uint256 totalOut, uint256 totalFee) 
    {
        require(pdxAmount > 0, "Zero amount");
        
        (, , , , , , , , uint256 yesPool, uint256 noPool, , , , , , , , , ) = 
            predictionMarket.markets(marketId);
        
        uint32 feeBps = predictionMarket.feeBps();
        
        // Calculate fees
        uint256 platformFee = (pdxAmount * feeBps) / 10000;
        uint256 amountAfterFee = pdxAmount - platformFee;
        
        // Calculate swap output
        uint256 swapOut = _getAmountOut(amountAfterFee, yesPool, noPool);
        
        // Total NO tokens = direct mint + swap output
        totalOut = pdxAmount + swapOut;
        totalFee = platformFee;
        
        // Multiplier = (total tokens received / PDX spent) * 10000
        multiplier = (totalOut * 10000) / pdxAmount;
        
        return (multiplier, totalOut, totalFee);
    }

    /**
     * @notice Calculate multiplier for swapping between YES and NO tokens
     * @param marketId The market ID
     * @param amountIn Amount of tokens to swap
     * @param isYesIn True if swapping YES for NO, false for NO to YES
     * @return multiplier The swap multiplier (scaled by 10000)
     * @return amountOut Tokens received from swap
     * @return fee Fee paid
     */
    function getSwapMultiplier(uint256 marketId, uint256 amountIn, bool isYesIn) 
        external 
        view 
        returns (uint256 multiplier, uint256 amountOut, uint256 fee) 
    {
        require(amountIn > 0, "Zero amount");
        
        (, , , , , , , , uint256 yesPool, uint256 noPool, , , , , , , , , ) = 
            predictionMarket.markets(marketId);
        
        uint32 feeBps = predictionMarket.feeBps();
        
        // Calculate fees
        uint256 platformFee = (amountIn * feeBps) / 10000;
        uint256 amountAfterFee = amountIn - platformFee;
        
        // Calculate swap output
        if (isYesIn) {
            amountOut = _getAmountOut(amountAfterFee, yesPool, noPool);
        } else {
            amountOut = _getAmountOut(amountAfterFee, noPool, yesPool);
        }
        
        fee = platformFee;
        
        // Multiplier = (tokens received / tokens spent) * 10000
        multiplier = (amountOut * 10000) / amountIn;
        
        return (multiplier, amountOut, fee);
    }

    // ==================== PRICE & TRADING INFO ====================

    /**
     * @notice Get current YES token price as percentage (0-10000 basis points)
     * @param marketId The market ID
     * @return price YES price in basis points (e.g., 6500 = 65%)
     */
    function getYesPrice(uint256 marketId) 
        external 
        view 
        returns (uint256 price) 
    {
        (, , , , , , , , uint256 yesPool, uint256 noPool, , , , , , , , , ) = 
            predictionMarket.markets(marketId);
        
        uint256 totalPool = yesPool + noPool;
        if (totalPool == 0) return 5000; // 50% default
        
        return (yesPool * 10000) / totalPool;
    }

    /**
     * @notice Get current NO token price as percentage (0-10000 basis points)
     * @param marketId The market ID
     * @return price NO price in basis points (e.g., 3500 = 35%)
     */
    function getNoPrice(uint256 marketId) 
        external 
        view 
        returns (uint256 price) 
    {
        (, , , , , , , , uint256 yesPool, uint256 noPool, , , , , , , , , ) = 
            predictionMarket.markets(marketId);
        
        uint256 totalPool = yesPool + noPool;
        if (totalPool == 0) return 5000; // 50% default
        
        return (noPool * 10000) / totalPool;
    }

    /**
     * @notice Get comprehensive trading information for a market
     * @param marketId The market ID
     * @return info TradingInfo struct with multipliers, prices, and liquidity
     */
    function getTradingInfo(uint256 marketId) 
        external 
        view 
        returns (TradingInfo memory info) 
    {
        (, , , , , , , , uint256 yesPool, uint256 noPool, , , , , , , , , ) = 
            predictionMarket.markets(marketId);
        
        uint256 totalPool = yesPool + noPool;
        
        if (totalPool == 0) {
            return TradingInfo({
                yesMultiplier: 10000,
                noMultiplier: 10000,
                yesPrice: 5000,
                noPrice: 5000,
                totalLiquidity: 0
            });
        }
        
        uint256 yesPrice = (yesPool * 10000) / totalPool;
        uint256 noPrice = (noPool * 10000) / totalPool;
        
        // Multiplier = 1 / price (scaled by 1e6 for precision, then normalized to 10000)
        uint256 yesMultiplier = yesPrice > 0 ? (1e10) / yesPrice : type(uint256).max;
        uint256 noMultiplier = noPrice > 0 ? (1e10) / noPrice : type(uint256).max;
        
        return TradingInfo({
            yesMultiplier: yesMultiplier,
            noMultiplier: noMultiplier,
            yesPrice: yesPrice,
            noPrice: noPrice,
            totalLiquidity: totalPool
        });
    }

    /**
     * @notice Get current multipliers for both sides (matches main contract function)
     * @param marketId The market ID
     * @return yesMultiplier YES multiplier (scaled by 10000)
     * @return noMultiplier NO multiplier (scaled by 10000)
     * @return yesPrice YES price in basis points
     * @return noPrice NO price in basis points
     */
    function getCurrentMultipliers(uint256 marketId) 
        external 
        view 
        returns (
            uint256 yesMultiplier, 
            uint256 noMultiplier, 
            uint256 yesPrice, 
            uint256 noPrice
        ) 
    {
        (, , , , , , , , uint256 yesPoolVal, uint256 noPoolVal, , , , , , , , , ) = 
            predictionMarket.markets(marketId);
        
        uint256 totalPool = yesPoolVal + noPoolVal;
        
        if (totalPool == 0) {
            return (10000, 10000, 5000, 5000);
        }
        
        yesPrice = (yesPoolVal * 10000) / totalPool;
        noPrice = (noPoolVal * 10000) / totalPool;
        
        yesMultiplier = yesPrice > 0 ? (1e10) / yesPrice : type(uint256).max;
        noMultiplier = noPrice > 0 ? (1e10) / noPrice : type(uint256).max;
        
        return (yesMultiplier, noMultiplier, yesPrice, noPrice);
    }

    // ==================== RESOLUTION STATUS CHECKS ====================

    /**
     * @notice Check if a market can request resolution
     * @param marketId The market ID
     * @return canRequest True if resolution can be requested
     */
    function canRequestResolution(uint256 marketId) 
        external 
        view 
        returns (bool canRequest) 
    {
        (, , , uint256 endTime, uint8 status, , , , , , , , , , , , , , ) = 
            predictionMarket.markets(marketId);
        
        // Can request if market is Open and past end time
        return status == uint8(MarketStatus.Open) && block.timestamp >= endTime;
    }

    /**
     * @notice Get all pending payouts for a user across resolved markets
     * @param user The user address
     * @return marketIds Array of market IDs with claimable winnings
     * @return claimable Array of claimable amounts (in PDX)
     */
    function getPendingPayouts(address user) external view returns (
        uint256[] memory marketIds,
        uint256[] memory claimable
    ) {
        uint256 marketCount = predictionMarket.nextMarketId();
        uint256 count = 0;

        // First, count how many claimables there are (for array sizing)
        for (uint256 i = 0; i < marketCount; i++) {
            // Pull needed fields from the market
            (
                , , , , // creator, question, category, endTime
                uint8 status,
                uint8 outcome,
                address yesToken,
                address noToken,
                , , , , , , , , , , // skip rest
            ) = predictionMarket.markets(i);

            // Only care about resolved markets!
            if (status != 3) continue; // 3 = Resolved

            uint256 winBalance = 0;
            if (outcome == 1) {
                // YES won
                winBalance = IOutcomeToken(yesToken).balanceOf(user);
            } else if (outcome == 2) {
                // NO won
                winBalance = IOutcomeToken(noToken).balanceOf(user);
            }
            if (winBalance > 0) count++;
        }

        // Prepare result arrays
        marketIds = new uint256[](count);
        claimable = new uint256[](count);

        // Second pass: fill them in
        uint256 j = 0;
        for (uint256 i = 0; i < marketCount; i++) {
            (
                , , , , // creator, question, category, endTime
                uint8 status,
                uint8 outcome,
                address yesToken,
                address noToken,
                , , , , , , , , , , // skip rest
            ) = predictionMarket.markets(i);
            if (status != 3) continue;

            uint256 winBalance = 0;
            if (outcome == 1) {
                winBalance = IOutcomeToken(yesToken).balanceOf(user);
            } else if (outcome == 2) {
                winBalance = IOutcomeToken(noToken).balanceOf(user);
            }
            if (winBalance > 0) {
                marketIds[j] = i;
                claimable[j] = winBalance;
                j++;
            }
        }
    }

    /**
     * @notice Check if a market can be disputed
     * @param marketId The market ID
     * @return canDisputeMarket True if market can be disputed
     */
    function canDispute(uint256 marketId) 
        external 
        view 
        returns (bool canDisputeMarket) 
    {
        (, , , , uint8 status, , , , , , , , , , , , uint256 disputeDeadline, , ) = 
            predictionMarket.markets(marketId);
        
        // Can dispute if in ResolutionRequested status and within dispute period
        return status == uint8(MarketStatus.ResolutionRequested) && 
               block.timestamp <= disputeDeadline;
    }

    // ==================== PDX BALANCE CHECKS ====================

    /**
     * @notice Get user's PDX token balance
     * @param user The user address
     * @return balance User's PDX balance
     */
    function getUserPDXBalance(address user) 
        external 
        view 
        returns (uint256 balance) 
    {
        return IPDX(pdxToken).balanceOf(user);
    }

    /**
     * @notice Get contract's PDX token balance
     * @return balance Contract's PDX balance
     */
    function getContractPDXBalance() 
        external 
        view 
        returns (uint256 balance) 
    {
        return IPDX(pdxToken).balanceOf(address(predictionMarket));
    }

    /**
     * @notice Check if user has enough PDX to create a market
     * @param user The user address
     * @param initialYes Initial YES pool amount
     * @param initialNo Initial NO pool amount
     * @return hasEnough True if user has sufficient PDX
     */
    function canCreateMarket(address user, uint256 initialYes, uint256 initialNo) 
        external 
        view 
        returns (bool hasEnough) 
    {
        uint256 totalRequired = initialYes + initialNo;
        return IPDX(pdxToken).balanceOf(user) >= totalRequired;
    }

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * @dev Calculate output amount for constant product AMM
     * @param amountIn Input amount
     * @param reserveIn Input reserve
     * @param reserveOut Output reserve
     * @return amountOut Output amount
     */
    function _getAmountOut(
        uint256 amountIn, 
        uint256 reserveIn, 
        uint256 reserveOut
    ) 
        internal 
        pure 
        returns (uint256 amountOut) 
    {
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0, "Invalid amounts");
        return (amountIn * reserveOut) / (reserveIn + amountIn);
    }

    /**
     * @notice Batch get market investments for multiple users
     * @param marketId The market ID
     * @param users Array of user addresses
     * @return investments Array of investment amounts
     */
    function batchGetMarketInvestments(uint256 marketId, address[] calldata users) 
        external 
        view 
        returns (uint256[] memory investments) 
    {
        investments = new uint256[](users.length);
        
        for (uint256 i = 0; i < users.length; i++) {
            (uint256 invested, ) = predictionMarket.userInvestments(marketId, users[i]);
            investments[i] = invested;
        }
        
        return investments;
    }

    /**
     * @notice Batch get trading info for multiple markets
     * @param marketIds Array of market IDs
     * @return infos Array of TradingInfo structs
     */
    function batchGetTradingInfo(uint256[] calldata marketIds) 
        external 
        view 
        returns (TradingInfo[] memory infos) 
    {
        infos = new TradingInfo[](marketIds.length);
        
        for (uint256 i = 0; i < marketIds.length; i++) {
            try this._getTradingInfoSafe(marketIds[i]) returns (TradingInfo memory info) {
                infos[i] = info;
            } catch {
                // Return default values if market doesn't exist
                infos[i] = TradingInfo({
                    yesMultiplier: 10000,
                    noMultiplier: 10000,
                    yesPrice: 5000,
                    noPrice: 5000,
                    totalLiquidity: 0
                });
            }
        }
        
        return infos;
    }

    /**
     * @dev Safe wrapper for getting trading info (external for try/catch)
     * @param marketId The market ID
     * @return info TradingInfo struct with market data
     */
    function _getTradingInfoSafe(uint256 marketId) 
        external 
        view 
        returns (TradingInfo memory info) 
    {
        (, , , , , , , , uint256 yesPool, uint256 noPool, , , , , , , , , ) = 
            predictionMarket.markets(marketId);
        
        uint256 totalPool = yesPool + noPool;
        
        if (totalPool == 0) {
            return TradingInfo({
                yesMultiplier: 10000,
                noMultiplier: 10000,
                yesPrice: 5000,
                noPrice: 5000,
                totalLiquidity: 0
            });
        }
        
        uint256 yesPrice = (yesPool * 10000) / totalPool;
        uint256 noPrice = (noPool * 10000) / totalPool;
        
        uint256 yesMultiplier = yesPrice > 0 ? (1e10) / yesPrice : type(uint256).max;
        uint256 noMultiplier = noPrice > 0 ? (1e10) / noPrice : type(uint256).max;
        
        return TradingInfo({
            yesMultiplier: yesMultiplier,
            noMultiplier: noMultiplier,
            yesPrice: yesPrice,
            noPrice: noPrice,
            totalLiquidity: totalPool
        });
    }

    /**
     * @notice Batch get YES/NO balances for a user across multiple markets
     * @param user The user address
     * @param marketIds Array of market IDs
     * @return yesBalances Array of YES token balances
     * @return noBalances Array of NO token balances
     */
    function batchGetUserBalances(address user, uint256[] calldata marketIds) 
        external 
        view 
        returns (uint256[] memory yesBalances, uint256[] memory noBalances) 
    {
        yesBalances = new uint256[](marketIds.length);
        noBalances = new uint256[](marketIds.length);
        
        for (uint256 i = 0; i < marketIds.length; i++) {
            try this._getBalancesSafe(marketIds[i], user) returns (uint256 yesBalance, uint256 noBalance) {
                yesBalances[i] = yesBalance;
                noBalances[i] = noBalance;
            } catch {
                yesBalances[i] = 0;
                noBalances[i] = 0;
            }
        }
        
        return (yesBalances, noBalances);
    }

    /**
     * @dev Safe wrapper for getting user balances (external for try/catch)
     */
    function _getBalancesSafe(uint256 marketId, address user) 
        external 
        view 
        returns (uint256 yesBalance, uint256 noBalance) 
    {
        (, , , , , , address yesToken, address noToken, , , , , , , , , , , ) = 
            predictionMarket.markets(marketId);
        
        yesBalance = IOutcomeToken(yesToken).balanceOf(user);
        noBalance = IOutcomeToken(noToken).balanceOf(user);
        
        return (yesBalance, noBalance);
    }
}