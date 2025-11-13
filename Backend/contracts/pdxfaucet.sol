// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PDXFaucet
 * @notice Faucet for distributing PDX tokens to users
 * @dev Implements cooldown to prevent spam
 */
contract PDXFaucet is Ownable {
    
    IERC20 public pdxToken;
    
    // Faucet settings
    uint256 public claimAmount = 100 * 10**18; // 100 PDX per claim
    uint256 public cooldownTime = 24 hours; // 24 hour cooldown
    
    // Track user claims
    mapping(address => uint256) public lastClaimTime;
    mapping(address => uint256) public totalClaimed;
    
    // Stats
    uint256 public totalDistributed;
    uint256 public totalUsers;
    bool public faucetActive = true;
    
    // Events
    event TokensClaimed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event CooldownUpdated(uint256 newCooldown);
    event ClaimAmountUpdated(uint256 newAmount);
    event FaucetToggled(bool active);
    event TokensDeposited(address indexed depositor, uint256 amount);
    event TokensWithdrawn(address indexed recipient, uint256 amount);
    
    // ==================== CONSTRUCTOR ====================
    
    constructor(address _pdxToken) Ownable(msg.sender) {
        require(_pdxToken != address(0), "Invalid token address");
        pdxToken = IERC20(_pdxToken);
    }
    
    // ==================== CLAIM FUNCTION ====================
    
    /**
     * @notice Claim PDX tokens from faucet
     * @dev User can claim once per cooldown period
     */
    function claimTokens() external returns (bool) {
        require(faucetActive, "Faucet is inactive");
        require(
            block.timestamp >= lastClaimTime[msg.sender] + cooldownTime,
            "Cooldown not reached. Please wait."
        );
        
        // Check faucet has enough tokens
        uint256 balance = pdxToken.balanceOf(address(this));
        require(balance >= claimAmount, "Faucet is empty. Please try again later.");
        
        // Track new user
        if (lastClaimTime[msg.sender] == 0) {
            totalUsers++;
        }
        
        // Update claim info
        lastClaimTime[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += claimAmount;
        totalDistributed += claimAmount;
        
        // Transfer tokens
        require(pdxToken.transfer(msg.sender, claimAmount), "Transfer failed");
        
        emit TokensClaimed(msg.sender, claimAmount, block.timestamp);
        
        return true;
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @notice Check if user can claim
     * @param user User address
     */
    function canClaim(address user) external view returns (bool) {
        if (!faucetActive) return false;
        if (pdxToken.balanceOf(address(this)) < claimAmount) return false;
        return block.timestamp >= lastClaimTime[user] + cooldownTime;
    }
    
    /**
     * @notice Get time remaining until user can claim again
     * @param user User address
     * @return Time in seconds until next claim (0 if can claim now)
     */
    function getTimeUntilNextClaim(address user) 
        external 
        view 
        returns (uint256) 
    {
        uint256 nextClaimTime = lastClaimTime[user] + cooldownTime;
        if (block.timestamp >= nextClaimTime) return 0;
        return nextClaimTime - block.timestamp;
    }
    
    /**
     * @notice Get faucet statistics
     */
    function getFaucetStats() 
        external 
        view 
        returns (
            uint256 balance,
            uint256 distributed,
            uint256 users,
            bool active,
            uint256 claimSize,
            uint256 cooldown
        ) 
    {
        return (
            pdxToken.balanceOf(address(this)),
            totalDistributed,
            totalUsers,
            faucetActive,
            claimAmount,
            cooldownTime
        );
    }
    
    /**
     * @notice Get user claim information
     * @param user User address
     */
    function getUserClaimInfo(address user) 
        external 
        view 
        returns (
            uint256 lastClaim,
            uint256 totalClaimedByUser,
            uint256 timeUntilNext,
            bool canClaimNow
        ) 
    {
        uint256 nextClaimTime = lastClaimTime[user] + cooldownTime;
        uint256 timeRemaining = block.timestamp >= nextClaimTime 
            ? 0 
            : nextClaimTime - block.timestamp;
        
        bool eligible = faucetActive && 
            block.timestamp >= nextClaimTime && 
            pdxToken.balanceOf(address(this)) >= claimAmount;
        
        return (
            lastClaimTime[user],
            totalClaimed[user],
            timeRemaining,
            eligible
        );
    }
    
    /**
     * @notice Get faucet balance in PDX
     */
    function getFaucetBalance() external view returns (uint256) {
        return pdxToken.balanceOf(address(this));
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @notice Set claim amount (admin only)
     * @param newAmount New claim amount in wei (e.g., 100 * 10**18 for 100 PDX)
     */
    function setClaimAmount(uint256 newAmount) 
        external 
        onlyOwner 
    {
        require(newAmount > 0, "Invalid amount");
        claimAmount = newAmount;
        emit ClaimAmountUpdated(newAmount);
    }
    
    /**
     * @notice Set cooldown period (admin only)
     * @param newCooldown New cooldown in seconds (e.g., 86400 for 24 hours)
     */
    function setCooldownTime(uint256 newCooldown) 
        external 
        onlyOwner 
    {
        require(newCooldown > 0, "Invalid cooldown");
        cooldownTime = newCooldown;
        emit CooldownUpdated(newCooldown);
    }
    
    /**
     * @notice Toggle faucet on/off (admin only)
     */
    function toggleFaucet() 
        external 
        onlyOwner 
    {
        faucetActive = !faucetActive;
        emit FaucetToggled(faucetActive);
    }
    
    /**
     * @notice Withdraw tokens from faucet (admin only)
     * @param amount Amount to withdraw
     */
    function withdrawTokens(uint256 amount) 
        external 
        onlyOwner 
    {
        require(amount > 0, "Invalid amount");
        uint256 balance = pdxToken.balanceOf(address(this));
        require(balance >= amount, "Insufficient balance");
        require(pdxToken.transfer(owner(), amount), "Transfer failed");
        emit TokensWithdrawn(owner(), amount);
    }
    
    /**
     * @notice Deposit tokens to faucet (admin only)
     * @param amount Amount to deposit
     */
    function depositTokens(uint256 amount) 
        external 
        onlyOwner 
    {
        require(amount > 0, "Invalid amount");
        require(
            pdxToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        emit TokensDeposited(msg.sender, amount);
    }
    
    /**
     * @notice Manual claim for specific user (admin only)
     * @param user User address
     */
    function manualClaim(address user) 
        external 
        onlyOwner 
    {
        require(user != address(0), "Invalid address");
        uint256 balance = pdxToken.balanceOf(address(this));
        require(balance >= claimAmount, "Insufficient faucet balance");
        
        if (lastClaimTime[user] == 0) {
            totalUsers++;
        }
        
        lastClaimTime[user] = block.timestamp;
        totalClaimed[user] += claimAmount;
        totalDistributed += claimAmount;
        
        require(pdxToken.transfer(user, claimAmount), "Transfer failed");
        
        emit TokensClaimed(user, claimAmount, block.timestamp);
    }
    
    /**
     * @notice Batch airdrop to multiple users (admin only)
     * @param users Array of user addresses
     * @param amounts Array of amounts (should match users length)
     */
    function batchAirdrop(address[] calldata users, uint256[] calldata amounts) 
        external 
        onlyOwner 
    {
        require(users.length == amounts.length, "Array length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(
            pdxToken.balanceOf(address(this)) >= totalAmount,
            "Insufficient balance"
        );
        
        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid address");
            require(amounts[i] > 0, "Invalid amount");
            
            if (lastClaimTime[users[i]] == 0) {
                totalUsers++;
            }
            
            totalClaimed[users[i]] += amounts[i];
            totalDistributed += amounts[i];
            
            require(
                pdxToken.transfer(users[i], amounts[i]),
                "Transfer failed"
            );
            
            emit TokensClaimed(users[i], amounts[i], block.timestamp);
        }
    }
}
