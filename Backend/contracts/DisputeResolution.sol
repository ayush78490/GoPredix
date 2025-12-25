// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DisputeResolution
 * @notice Handles disputes for prediction markets with stake-based resolution
 * @dev Works alongside existing PredictionMarketWithMultipliers contract
 */
contract DisputeResolution {
    enum DisputeStatus {
        None,
        Active,
        VotingInProgress,
        Resolved,
        Rejected
    }
    enum DisputeOutcome {
        Pending,
        AcceptDispute,
        RejectDispute
    }

    struct Dispute {
        uint256 disputeId;
        address marketContract;
        uint256 marketId;
        address disputer;
        string reason;
        uint256 stakeAmount;
        uint256 createdAt;
        uint256 votingEndTime;
        DisputeStatus status;
        DisputeOutcome outcome;
        uint256 totalVotesAccept;
        uint256 totalVotesReject;
        uint256 totalStakeAccept;
        uint256 totalStakeReject;
    }

    struct Vote {
        bool hasVoted;
        bool votedToAccept; // true = accept dispute, false = reject dispute
        uint256 stakeAmount;
        bool claimed;
    }

    // State variables
    uint256 public nextDisputeId;
    uint256 public minimumDisputeStake = 0.01 ether; // Minimum BNB to stake when creating dispute
    uint256 public minimumVoteStake = 0.001 ether; // Minimum BNB to stake when voting
    uint256 public votingPeriod = 3 minutes; // Voting period for disputes (TESTING: 3 minutes instead of 3 days)
    uint256 public platformFeePercent = 5; // 5% platform fee on stakes

    address public owner;
    address public resolutionAuthority; // Can be multi-sig or DAO

    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => mapping(address => Vote)) public votes; // disputeId => voter => Vote
    mapping(uint256 => address[]) public disputeVoters; // Track all voters for a dispute
    mapping(address => mapping(uint256 => uint256)) public marketDisputes; // marketContract => marketId => disputeId

    uint256 public totalPlatformFees;

    // Events
    event DisputeCreated(
        uint256 indexed disputeId,
        address indexed marketContract,
        uint256 indexed marketId,
        address disputer,
        uint256 stakeAmount,
        string reason
    );

    event VoteCast(
        uint256 indexed disputeId,
        address indexed voter,
        bool votedToAccept,
        uint256 stakeAmount
    );

    event DisputeResolved(
        uint256 indexed disputeId,
        DisputeOutcome outcome,
        uint256 totalStakeAccept,
        uint256 totalStakeReject
    );

    event StakeClaimed(
        uint256 indexed disputeId,
        address indexed claimer,
        uint256 amount,
        bool isWinner
    );

    event DisputeRejectedByAuthority(
        uint256 indexed disputeId,
        address indexed authority,
        string reason
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyResolutionAuthority() {
        require(msg.sender == resolutionAuthority, "not resolution authority");
        _;
    }

    constructor(address _resolutionAuthority) {
        owner = msg.sender;
        resolutionAuthority = _resolutionAuthority;
    }

    /**
     * @notice Create a new dispute for a market
     * @param marketContract Address of the prediction market contract
     * @param marketId ID of the market being disputed
     * @param reason Reason for the dispute
     */
    function createDispute(
        address marketContract,
        uint256 marketId,
        string calldata reason
    ) external payable returns (uint256) {
        require(msg.value >= minimumDisputeStake, "insufficient stake");
        require(bytes(reason).length > 0, "reason required");
        require(bytes(reason).length <= 500, "reason too long");
        require(marketContract != address(0), "invalid market contract");

        // Check if dispute already exists for this market
        uint256 existingDisputeId = marketDisputes[marketContract][marketId];
        if (existingDisputeId > 0) {
            Dispute storage existingDispute = disputes[existingDisputeId];
            require(
                existingDispute.status == DisputeStatus.Resolved ||
                    existingDispute.status == DisputeStatus.Rejected,
                "active dispute exists"
            );
        }

        uint256 disputeId = nextDisputeId++;
        uint256 votingEndTime = block.timestamp + votingPeriod;

        disputes[disputeId] = Dispute({
            disputeId: disputeId,
            marketContract: marketContract,
            marketId: marketId,
            disputer: msg.sender,
            reason: reason,
            stakeAmount: msg.value,
            createdAt: block.timestamp,
            votingEndTime: votingEndTime,
            status: DisputeStatus.Active,
            outcome: DisputeOutcome.Pending,
            totalVotesAccept: 0,
            totalVotesReject: 0,
            totalStakeAccept: 0,
            totalStakeReject: 0
        });

        marketDisputes[marketContract][marketId] = disputeId;

        emit DisputeCreated(
            disputeId,
            marketContract,
            marketId,
            msg.sender,
            msg.value,
            reason
        );

        return disputeId;
    }

    /**
     * @notice Vote on an active dispute
     * @param disputeId ID of the dispute
     * @param acceptDispute true to accept dispute, false to reject
     */
    function voteOnDispute(
        uint256 disputeId,
        bool acceptDispute
    ) external payable {
        require(disputeId < nextDisputeId, "dispute does not exist");
        require(msg.value >= minimumVoteStake, "insufficient vote stake");

        Dispute storage dispute = disputes[disputeId];
        require(dispute.status == DisputeStatus.Active, "dispute not active");
        require(block.timestamp < dispute.votingEndTime, "voting period ended");
        require(!votes[disputeId][msg.sender].hasVoted, "already voted");

        // Record vote
        votes[disputeId][msg.sender] = Vote({
            hasVoted: true,
            votedToAccept: acceptDispute,
            stakeAmount: msg.value,
            claimed: false
        });

        disputeVoters[disputeId].push(msg.sender);

        // Update vote counts
        if (acceptDispute) {
            dispute.totalVotesAccept++;
            dispute.totalStakeAccept += msg.value;
        } else {
            dispute.totalVotesReject++;
            dispute.totalStakeReject += msg.value;
        }

        emit VoteCast(disputeId, msg.sender, acceptDispute, msg.value);
    }

    /**
     * @notice Finalize dispute after voting period ends
     * @param disputeId ID of the dispute to finalize
     */
    function finalizeDispute(uint256 disputeId) external {
        require(disputeId < nextDisputeId, "dispute does not exist");

        Dispute storage dispute = disputes[disputeId];
        require(dispute.status == DisputeStatus.Active, "dispute not active");
        require(
            block.timestamp >= dispute.votingEndTime,
            "voting period not ended"
        );

        dispute.status = DisputeStatus.VotingInProgress;

        // Determine outcome based on stake-weighted voting
        uint256 totalStake = dispute.totalStakeAccept +
            dispute.totalStakeReject +
            dispute.stakeAmount;

        // Disputer's stake automatically counts as "accept dispute" vote
        uint256 totalAcceptStake = dispute.totalStakeAccept +
            dispute.stakeAmount;
        uint256 totalRejectStake = dispute.totalStakeReject;

        if (totalAcceptStake > totalRejectStake) {
            dispute.outcome = DisputeOutcome.AcceptDispute;
        } else {
            dispute.outcome = DisputeOutcome.RejectDispute;
        }

        dispute.status = DisputeStatus.Resolved;

        emit DisputeResolved(
            disputeId,
            dispute.outcome,
            totalAcceptStake,
            totalRejectStake
        );
    }

    /**
     * @notice Resolution authority can override the voting outcome if needed
     * @param disputeId ID of the dispute
     * @param acceptDispute true to accept, false to reject
     * @param reason Reason for the override
     */
    function authorityResolveDispute(
        uint256 disputeId,
        bool acceptDispute,
        string calldata reason
    ) external onlyResolutionAuthority {
        require(disputeId < nextDisputeId, "dispute does not exist");

        Dispute storage dispute = disputes[disputeId];
        require(
            dispute.status == DisputeStatus.Active ||
                dispute.status == DisputeStatus.VotingInProgress,
            "invalid status"
        );

        dispute.status = DisputeStatus.Resolved;
        dispute.outcome = acceptDispute
            ? DisputeOutcome.AcceptDispute
            : DisputeOutcome.RejectDispute;

        emit DisputeResolved(
            disputeId,
            dispute.outcome,
            dispute.totalStakeAccept + dispute.stakeAmount,
            dispute.totalStakeReject
        );
    }

    /**
     * @notice Authority can reject frivolous disputes
     * @param disputeId ID of the dispute
     * @param reason Reason for rejection
     */
    function rejectDisputeByAuthority(
        uint256 disputeId,
        string calldata reason
    ) external onlyResolutionAuthority {
        require(disputeId < nextDisputeId, "dispute does not exist");

        Dispute storage dispute = disputes[disputeId];
        require(dispute.status == DisputeStatus.Active, "dispute not active");

        dispute.status = DisputeStatus.Rejected;

        emit DisputeRejectedByAuthority(disputeId, msg.sender, reason);
    }

    /**
     * @notice Claim stake after dispute is resolved
     * @param disputeId ID of the dispute
     */
    function claimStake(uint256 disputeId) external {
        require(disputeId < nextDisputeId, "dispute does not exist");

        Dispute storage dispute = disputes[disputeId];
        require(
            dispute.status == DisputeStatus.Resolved,
            "dispute not resolved"
        );

        uint256 claimAmount = 0;
        bool isWinner = false;

        // Check if caller is the disputer
        if (msg.sender == dispute.disputer) {
            require(dispute.stakeAmount > 0, "already claimed");

            if (dispute.outcome == DisputeOutcome.AcceptDispute) {
                // Disputer wins - gets stake back + share of losing side
                uint256 totalWinStake = dispute.totalStakeAccept +
                    dispute.stakeAmount;
                uint256 totalLoseStake = dispute.totalStakeReject;

                if (totalWinStake > 0) {
                    uint256 disputerShare = (dispute.stakeAmount * 1e18) /
                        totalWinStake;
                    uint256 winnings = (totalLoseStake * disputerShare) / 1e18;

                    // Take platform fee
                    uint256 fee = (winnings * platformFeePercent) / 100;
                    totalPlatformFees += fee;

                    claimAmount = dispute.stakeAmount + winnings - fee;
                    isWinner = true;
                }
            } else {
                // Disputer loses - stake is forfeited
                claimAmount = 0;
            }

            dispute.stakeAmount = 0;
        } else {
            // Check if caller is a voter
            Vote storage vote = votes[disputeId][msg.sender];
            require(vote.hasVoted, "did not vote");
            require(!vote.claimed, "already claimed");

            bool voterWon = (dispute.outcome == DisputeOutcome.AcceptDispute) ==
                vote.votedToAccept;

            if (voterWon) {
                uint256 totalWinStake = vote.votedToAccept
                    ? (dispute.totalStakeAccept + dispute.stakeAmount)
                    : dispute.totalStakeReject;
                uint256 totalLoseStake = vote.votedToAccept
                    ? dispute.totalStakeReject
                    : (dispute.totalStakeAccept + dispute.stakeAmount);

                if (totalWinStake > 0) {
                    uint256 voterShare = (vote.stakeAmount * 1e18) /
                        totalWinStake;
                    uint256 winnings = (totalLoseStake * voterShare) / 1e18;

                    // Take platform fee
                    uint256 fee = (winnings * platformFeePercent) / 100;
                    totalPlatformFees += fee;

                    claimAmount = vote.stakeAmount + winnings - fee;
                    isWinner = true;
                }
            } else {
                // Voter lost - stake is forfeited
                claimAmount = 0;
            }

            vote.claimed = true;
        }

        if (claimAmount > 0) {
            _transferBNB(msg.sender, claimAmount);
        }

        emit StakeClaimed(disputeId, msg.sender, claimAmount, isWinner);
    }

    /**
     * @notice Claim stake for rejected disputes (by authority)
     * @param disputeId ID of the dispute
     */
    function claimRejectedDisputeStake(uint256 disputeId) external {
        require(disputeId < nextDisputeId, "dispute does not exist");

        Dispute storage dispute = disputes[disputeId];
        require(
            dispute.status == DisputeStatus.Rejected,
            "not rejected by authority"
        );

        // For rejected disputes, voters get their stakes back
        if (msg.sender == dispute.disputer) {
            uint256 refund = dispute.stakeAmount;
            require(refund > 0, "already claimed");
            dispute.stakeAmount = 0;
            _transferBNB(msg.sender, refund);
            emit StakeClaimed(disputeId, msg.sender, refund, false);
        } else {
            Vote storage vote = votes[disputeId][msg.sender];
            require(vote.hasVoted, "did not vote");
            require(!vote.claimed, "already claimed");

            uint256 refund = vote.stakeAmount;
            vote.claimed = true;
            _transferBNB(msg.sender, refund);
            emit StakeClaimed(disputeId, msg.sender, refund, false);
        }
    }

    /**
     * @notice Get dispute details
     */
    function getDisputeInfo(
        uint256 disputeId
    )
        external
        view
        returns (
            address marketContract,
            uint256 marketId,
            address disputer,
            string memory reason,
            uint256 stakeAmount,
            DisputeStatus status,
            DisputeOutcome outcome,
            uint256 totalStakeAccept,
            uint256 totalStakeReject,
            uint256 votingEndTime
        )
    {
        require(disputeId < nextDisputeId, "dispute does not exist");
        Dispute storage dispute = disputes[disputeId];

        return (
            dispute.marketContract,
            dispute.marketId,
            dispute.disputer,
            dispute.reason,
            dispute.stakeAmount,
            dispute.status,
            dispute.outcome,
            dispute.totalStakeAccept + dispute.stakeAmount,
            dispute.totalStakeReject,
            dispute.votingEndTime
        );
    }

    /**
     * @notice Get voter information for a dispute
     */
    function getVoteInfo(
        uint256 disputeId,
        address voter
    )
        external
        view
        returns (
            bool hasVoted,
            bool votedToAccept,
            uint256 stakeAmount,
            bool claimed
        )
    {
        Vote storage vote = votes[disputeId][voter];
        return (
            vote.hasVoted,
            vote.votedToAccept,
            vote.stakeAmount,
            vote.claimed
        );
    }

    /**
     * @notice Get all voters for a dispute
     */
    function getDisputeVoters(
        uint256 disputeId
    ) external view returns (address[] memory) {
        require(disputeId < nextDisputeId, "dispute does not exist");
        return disputeVoters[disputeId];
    }

    /**
     * @notice Get dispute ID for a specific market
     */
    function getMarketDispute(
        address marketContract,
        uint256 marketId
    ) external view returns (uint256) {
        return marketDisputes[marketContract][marketId];
    }

    /**
     * @notice Calculate potential winnings for a voter
     */
    function calculatePotentialWinnings(
        uint256 disputeId,
        address voter
    ) external view returns (uint256 potentialWinnings, bool isWinning) {
        require(disputeId < nextDisputeId, "dispute does not exist");

        Dispute storage dispute = disputes[disputeId];
        Vote storage vote = votes[disputeId][voter];

        if (!vote.hasVoted) {
            return (0, false);
        }

        // Calculate current winning side
        uint256 totalAcceptStake = dispute.totalStakeAccept +
            dispute.stakeAmount;
        uint256 totalRejectStake = dispute.totalStakeReject;
        bool acceptWinning = totalAcceptStake > totalRejectStake;

        isWinning = (acceptWinning == vote.votedToAccept);

        if (isWinning) {
            uint256 totalWinStake = vote.votedToAccept
                ? totalAcceptStake
                : totalRejectStake;
            uint256 totalLoseStake = vote.votedToAccept
                ? totalRejectStake
                : totalAcceptStake;

            if (totalWinStake > 0) {
                uint256 voterShare = (vote.stakeAmount * 1e18) / totalWinStake;
                uint256 winnings = (totalLoseStake * voterShare) / 1e18;
                uint256 fee = (winnings * platformFeePercent) / 100;
                potentialWinnings = vote.stakeAmount + winnings - fee;
            }
        }
    }

    // Admin functions

    function setMinimumDisputeStake(uint256 newStake) external onlyOwner {
        minimumDisputeStake = newStake;
    }

    function setMinimumVoteStake(uint256 newStake) external onlyOwner {
        minimumVoteStake = newStake;
    }

    function setVotingPeriod(uint256 newPeriod) external onlyOwner {
        require(newPeriod >= 1 days && newPeriod <= 14 days, "invalid period");
        votingPeriod = newPeriod;
    }

    function setPlatformFeePercent(uint256 newFee) external onlyOwner {
        require(newFee <= 10, "fee too high");
        platformFeePercent = newFee;
    }

    function setResolutionAuthority(address newAuthority) external onlyOwner {
        require(newAuthority != address(0), "invalid address");
        resolutionAuthority = newAuthority;
    }

    function withdrawPlatformFees() external onlyOwner {
        uint256 amount = totalPlatformFees;
        require(amount > 0, "no fees");
        totalPlatformFees = 0;
        _transferBNB(owner, amount);
    }

    function _transferBNB(address to, uint256 amount) internal {
        (bool success, ) = to.call{value: amount}("");
        require(success, "transfer failed");
    }

    receive() external payable {}
}
