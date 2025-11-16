// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PredectionMarket.sol";
// PDX Token Interface

// Prediction Market Interface
interface IPredictionMarket {
    struct MarketInfo {
        address creator;
        string question;
        string category;
        uint256 endTime;
        uint8 status;
        uint8 outcome;
        uint256 yesPool;
        uint256 noPool;
        uint256 totalBacking;
        uint256 pdxBacking;
        uint256 bnbBacking;
        uint256 totalLiquidity;
    }
    
    function initializeWithPDX(uint256 pdxAmount) external;
    function initializeWithBNB() external payable;
    function getMarketInfo() external view returns (MarketInfo memory);
}


// Market Factory Contract
contract MarketFactory {
    IPDX public immutable pdxToken;
    address public owner;
    uint32 public feeBps;
    uint32 public lpFeeBps;
    address public resolutionServer;
    
    uint256 public nextMarketId;
    mapping(uint256 => address) public markets;
    mapping(address => uint256[]) public userMarkets;
    
    event MarketCreated(uint256 indexed id, address marketAddress, string question, string category, uint256 endTime, address creator);
    event FactoryConfigUpdated(uint32 feeBps, uint32 lpFeeBps, address resolutionServer);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }
    
    constructor(address _pdxToken, uint32 _feeBps, uint32 _lpFeeBps, address _resolutionServer) {
        require(_pdxToken != address(0), "invalid PDX token");
        require(_feeBps <= 500, "fee too high");
        require(_lpFeeBps <= 10000, "LP share invalid");
        
        pdxToken = IPDX(_pdxToken);
        owner = msg.sender;
        feeBps = _feeBps;
        lpFeeBps = _lpFeeBps;
        resolutionServer = _resolutionServer;
    }
    
    function createMarketWithPDX(
        string calldata question,
        string calldata category,
        uint256 endTime,
        uint256 initialYes,
        uint256 initialNo,
        uint256 pdxAmount
    ) external returns (uint256) {
        require(endTime > block.timestamp + 1 hours, "end time too soon");
        require(bytes(question).length > 0 && bytes(question).length <= 280, "invalid question");
        require(bytes(category).length > 0, "invalid category");
        require(initialYes > 0 && initialNo > 0, "invalid initial liquidity");
        require(pdxAmount >= initialYes + initialNo, "insufficient PDX");
        
        uint256 id = nextMarketId++;
        
        // Create new PredictionMarket contract
        PredictionMarket newMarket = new PredictionMarket(
            address(pdxToken),
            msg.sender,
            question,
            category,
            endTime,
            initialYes,
            initialNo,
            feeBps,
            lpFeeBps,
            resolutionServer
        );
        
        markets[id] = address(newMarket);
        userMarkets[msg.sender].push(id);
        
        // Transfer PDX to the new market for initial liquidity
        require(pdxToken.transferFrom(msg.sender, address(newMarket), pdxAmount), "PDX transfer failed");
        
        // Initialize the market
        newMarket.initializeWithPDX(pdxAmount);
        
        emit MarketCreated(id, address(newMarket), question, category, endTime, msg.sender);
        return id;
    }
    
    function createMarketWithBNB(
        string calldata question,
        string calldata category,
        uint256 endTime,
        uint256 initialYes,
        uint256 initialNo
    ) external payable returns (uint256) {
        require(endTime > block.timestamp + 1 hours, "end time too soon");
        require(bytes(question).length > 0 && bytes(question).length <= 280, "invalid question");
        require(bytes(category).length > 0, "invalid category");
        require(initialYes > 0 && initialNo > 0, "invalid initial liquidity");
        require(msg.value >= initialYes + initialNo, "insufficient BNB");
        
        uint256 id = nextMarketId++;
        
        // Create new PredictionMarket contract
        PredictionMarket newMarket = new PredictionMarket(
            address(pdxToken),
            msg.sender,
            question,
            category,
            endTime,
            initialYes,
            initialNo,
            feeBps,
            lpFeeBps,
            resolutionServer
        );
        
        markets[id] = address(newMarket);
        userMarkets[msg.sender].push(id);
        
        // Initialize the market with BNB
        newMarket.initializeWithBNB{value: msg.value}();
        
        emit MarketCreated(id, address(newMarket), question, category, endTime, msg.sender);
        return id;
    }
    
    function getMarketAddress(uint256 marketId) external view returns (address) {
        return markets[marketId];
    }
    
    function getUserMarkets(address user) external view returns (uint256[] memory) {
        return userMarkets[user];
    }
    
    function getMarketCount() external view returns (uint256) {
        return nextMarketId;
    }
    
    function updateFeeStructure(uint32 _feeBps, uint32 _lpFeeBps) external onlyOwner {
        require(_feeBps <= 500, "fee too high");
        require(_lpFeeBps <= 10000, "LP share invalid");
        feeBps = _feeBps;
        lpFeeBps = _lpFeeBps;
        emit FactoryConfigUpdated(_feeBps, _lpFeeBps, resolutionServer);
    }
    
    function updateResolutionServer(address _resolutionServer) external onlyOwner {
        require(_resolutionServer != address(0), "invalid address");
        resolutionServer = _resolutionServer;
        emit FactoryConfigUpdated(feeBps, lpFeeBps, _resolutionServer);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
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
}