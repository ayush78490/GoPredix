// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Interface for the original PredictionMarket contract with explicit returns for userInvestments
interface IPredictionMarketOriginal {
    // Public mapping userInvestments returns struct with two uint256 fields
    function userInvestments(uint256 marketId, address user) external view returns (uint256 totalInvested, uint256 lastUpdated);
}

contract PredictionMarketViewer {
    IPredictionMarketOriginal public originalContract;

    constructor(address _originalContractAddress) {
        originalContract = IPredictionMarketOriginal(_originalContractAddress);
    }

    // Fetch total invested BNB in a market by a user from original contract
    function getUserTotalInvestment(uint256 marketId, address user) external view returns (uint256) {
        (uint256 totalInvested, ) = originalContract.userInvestments(marketId, user);
        return totalInvested;
    }
}
