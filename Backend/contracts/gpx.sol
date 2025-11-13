// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title PDX Token
 * @notice GamePredix native token for BSC testnet
 * @dev Standard ERC20 with mint/burn capabilities for faucet integration
 */
contract GPXToken is ERC20, ERC20Burnable, Ownable {
    
    constructor() 
        ERC20("Predix Token", "PDX") 
        Ownable(msg.sender) 
    {
        // Mint initial supply: 1 billion tokens to deployer
        _mint(msg.sender, 1_000_000_000 * 10**decimals());
    }
    
    /**
     * @notice Mint new tokens (only owner - for faucet)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        _mint(to, amount);
    }
    
    /**
     * @notice Batch mint to multiple addresses (useful for airdrops)
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to mint
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        onlyOwner 
    {
        require(recipients.length == amounts.length, "Array length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Cannot mint to zero address");
            _mint(recipients[i], amounts[i]);
        }
    }
    
    /**
     * @notice Burn tokens from an account (only owner)
     * @param account Account to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) 
        public 
        override 
        onlyOwner 
    {
        _burn(account, amount);
    }
}
