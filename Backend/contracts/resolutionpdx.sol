// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TestnetDualTokenAdapterResolution
 * @dev Market resolution and dispute handling
 * CORRECTED - Proper tuple unpacking with 16 values
 */

interface IMainAdapter {
    struct PDXMarket {
        uint256 id;
        string  question;
        address yesToken;
        address noToken;
        uint256 yesPool;
        uint256 noPool;
        uint256 pdxLiquidity;
        uint256 totalYesShares;
        uint256 totalNoShares;
        uint256 createdAt;
        uint256 endTime;
        bool resolved;
        bool outcome;
        uint256 resolutionTime;
        address creator;
        uint256 k;
    }
    
    function markets(uint256 marketId) external view returns (
        uint256 id,
        string memory question,
        address yesToken,
        address noToken,
        uint256 yesPool,
        uint256 noPool,
        uint256 pdxLiquidity,
        uint256 totalYesShares,
        uint256 totalNoShares,
        uint256 createdAt,
        uint256 endTime,
        bool resolved,
        bool outcome,
        uint256 resolutionTime,
        address creator,
        uint256 k
    );
    
    function owner() external view returns (address);
    function resolutionServer() external view returns (address);
    function nextMarketId() external view returns (uint256);
    function pdxToken() external view returns (address);
}

interface IOutcomeToken {
    function balanceOf(address account) external view returns (uint256);
    function burn(address from, uint256 amount) external;
}

interface IPDX {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract TestnetDualTokenAdapterResolution {
    address public mainAdapter;
    
    mapping(uint256 => ResolutionState) public resolutionStates;
    
    struct ResolutionState {
        bool requested;
        uint256 requestTime;
        address requester;
        bool disputed;
        uint256 disputeTime;
        address disputer;
        bool resolved;
        bool outcome;
    }
    
    event ResolutionRequested(uint256 indexed marketId, address indexed requester, uint256 timestamp);
    event MarketResolved(uint256 indexed marketId, bool outcome, uint256 timestamp);
    event ResolutionDisputed(uint256 indexed marketId, address indexed disputer, uint256 timestamp);
    event DisputeResolved(uint256 indexed marketId, bool finalOutcome, uint256 timestamp);
    event RedemptionClaimed(uint256 indexed marketId, address indexed user, uint256 amount, uint256 timestamp);
    
    modifier onlyOwner() {
        require(msg.sender == IMainAdapter(mainAdapter).owner(), "Only owner");
        _;
    }
    
    modifier onlyResolutionServer() {
        require(msg.sender == IMainAdapter(mainAdapter).resolutionServer(), "Only resolution server");
        _;
    }
    
    modifier validMarket(uint256 marketId) {
        require(marketId < IMainAdapter(mainAdapter).nextMarketId(), "Invalid market");
        _;
    }
    
    constructor(address _mainAdapter) {
        require(_mainAdapter != address(0), "Invalid adapter");
        mainAdapter = _mainAdapter;
    }
    
    // ==================== RESOLUTION FUNCTIONS ====================
    
    function requestResolution(uint256 marketId) 
        external 
        validMarket(marketId) 
    {
        // CORRECT: Unpack all 16 values
        (
            uint256 id,
            string memory question,
            address yesToken,
            address noToken,
            uint256 yesPool,
            uint256 noPool,
            uint256 pdxLiquidity,
            uint256 totalYesShares,
            uint256 totalNoShares,
            uint256 createdAt,
            uint256 endTime,
            bool resolved,
            bool outcome,
            uint256 resolutionTime,
            address creator,
            uint256 k
        ) = IMainAdapter(mainAdapter).markets(marketId);
        
        require(!resolved, "Already resolved");
        require(block.timestamp >= endTime, "Market not ended");
        
        ResolutionState storage state = resolutionStates[marketId];
        require(!state.requested, "Already requested");
        
        state.requested = true;
        state.requestTime = block.timestamp;
        state.requester = msg.sender;
        
        emit ResolutionRequested(marketId, msg.sender, block.timestamp);
    }
    
    function resolveMarket(uint256 marketId, bool outcome) 
        external 
        onlyResolutionServer 
        validMarket(marketId)
    {
        // CORRECT: Unpack all 16 values
        (
            uint256 id,
            string memory question,
            address yesToken,
            address noToken,
            uint256 yesPool,
            uint256 noPool,
            uint256 pdxLiquidity,
            uint256 totalYesShares,
            uint256 totalNoShares,
            uint256 createdAt,
            uint256 endTime,
            bool resolved,
            bool prevOutcome,
            uint256 resolutionTime,
            address creator,
            uint256 k
        ) = IMainAdapter(mainAdapter).markets(marketId);
        
        ResolutionState storage state = resolutionStates[marketId];
        require(state.requested, "Not requested");
        require(!state.resolved, "Already resolved");
        require(!state.disputed || block.timestamp >= state.disputeTime + 7 days, "Dispute period active");
        require(!resolved, "Already resolved in main");
        require(block.timestamp >= endTime, "Market not ended");
        
        state.resolved = true;
        state.outcome = outcome;
        
        emit MarketResolved(marketId, outcome, block.timestamp);
    }
    
    function claimPDXRedemption(uint256 marketId) 
        external 
        validMarket(marketId)
    {
        ResolutionState storage state = resolutionStates[marketId];
        require(state.resolved, "Not resolved");
        
        // CORRECT: Unpack all 16 values
        (
            uint256 id,
            string memory question,
            address yesTokenAddr,
            address noTokenAddr,
            uint256 yesPool,
            uint256 noPool,
            uint256 pdxLiquidity,
            uint256 totalYesShares,
            uint256 totalNoShares,
            uint256 createdAt,
            uint256 endTime,
            bool resolved,
            bool outcome,
            uint256 resolutionTime,
            address creator,
            uint256 k
        ) = IMainAdapter(mainAdapter).markets(marketId);
        
        IOutcomeToken winningToken = state.outcome 
            ? IOutcomeToken(yesTokenAddr) 
            : IOutcomeToken(noTokenAddr);
        
        uint256 userShares = winningToken.balanceOf(msg.sender);
        require(userShares > 0, "No shares");
        
        uint256 totalWinningShares = state.outcome ? totalYesShares : totalNoShares;
        require(totalWinningShares > 0, "No total shares");
        
        uint256 redemptionAmount = (userShares * pdxLiquidity) / totalWinningShares;
        require(redemptionAmount > 0, "No amount");
        
        winningToken.burn(msg.sender, userShares);
        
        IPDX pdxToken = IPDX(IMainAdapter(mainAdapter).pdxToken());
        require(pdxToken.transfer(msg.sender, redemptionAmount), "Transfer failed");
        
        emit RedemptionClaimed(marketId, msg.sender, redemptionAmount, block.timestamp);
    }
    
    // ==================== QUERY FUNCTIONS ====================
    
    function canRequestResolution(uint256 marketId) 
        external 
        view 
        validMarket(marketId)
        returns (bool)
    {
        // CORRECT: Unpack all 16 values
        (
            uint256 id,
            string memory question,
            address yesToken,
            address noToken,
            uint256 yesPool,
            uint256 noPool,
            uint256 pdxLiquidity,
            uint256 totalYesShares,
            uint256 totalNoShares,
            uint256 createdAt,
            uint256 endTime,
            bool resolved,
            bool outcome,
            uint256 resolutionTime,
            address creator,
            uint256 k
        ) = IMainAdapter(mainAdapter).markets(marketId);
        
        if (resolved) return false;
        if (block.timestamp < endTime) return false;
        
        ResolutionState storage state = resolutionStates[marketId];
        return !state.requested;
    }
    
    function canDispute(uint256 marketId) 
        external 
        view 
        validMarket(marketId)
        returns (bool)
    {
        ResolutionState storage state = resolutionStates[marketId];
        
        if (!state.resolved) return false;
        if (state.disputed) return false;
        if (block.timestamp >= state.requestTime + 7 days) return false;
        
        return true;
    }
    
    function disputeResolution(uint256 marketId) 
        external 
        validMarket(marketId)
    {
        ResolutionState storage state = resolutionStates[marketId];
        require(state.resolved, "Not resolved");
        require(!state.disputed, "Already disputed");
        require(block.timestamp < state.requestTime + 7 days, "Dispute period ended");
        
        state.disputed = true;
        state.disputeTime = block.timestamp;
        state.disputer = msg.sender;
        
        emit ResolutionDisputed(marketId, msg.sender, block.timestamp);
    }
    
    function resolveDisputedMarket(uint256 marketId, bool finalOutcome) 
        external 
        onlyOwner 
        validMarket(marketId)
    {
        ResolutionState storage state = resolutionStates[marketId];
        require(state.disputed, "Not disputed");
        require(state.resolved, "Not resolved");
        
        state.outcome = finalOutcome;
        
        emit DisputeResolved(marketId, finalOutcome, block.timestamp);
    }
    
    function getResolution(uint256 marketId) 
        external 
        view 
        validMarket(marketId)
        returns (
            bool requested,
            uint256 requestTime,
            address requester,
            bool disputed,
            uint256 disputeTime,
            address disputer,
            bool resolved,
            bool outcome
        )
    {
        ResolutionState storage state = resolutionStates[marketId];
        return (
            state.requested,
            state.requestTime,
            state.requester,
            state.disputed,
            state.disputeTime,
            state.disputer,
            state.resolved,
            state.outcome
        );
    }
    
    function getResolutionStatus(uint256 marketId) 
        external 
        view 
        validMarket(marketId)
        returns (string memory)
    {
        ResolutionState storage state = resolutionStates[marketId];
        
        if (!state.requested) return "Not Requested";
        if (state.disputed) return "Disputed";
        if (state.resolved) return "Resolved";
        return "Pending Resolution";
    }
    
    function getDisputeDeadline(uint256 marketId)
        external
        view
        validMarket(marketId)
        returns (uint256)
    {
        ResolutionState storage state = resolutionStates[marketId];
        if (!state.requested) return 0;
        return state.requestTime + 7 days;
    }
    
    function getMarketOutcome(uint256 marketId)
        external
        view
        validMarket(marketId)
        returns (bool)
    {
        return resolutionStates[marketId].outcome;
    }
}
