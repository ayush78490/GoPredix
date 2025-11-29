// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BNB Market Marketplace
 * @notice Marketplace for buying and selling BNB prediction markets
 * @dev Compatible with PredictionMarketWithMultipliers contract structure
 */

// ==================== INTERFACES ====================

interface IPDX {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPredictionMarket {
    // transferMarketOwnership removed as it doesn't exist on the deployed contract
    
    function markets(uint256) external view returns (
        address creator,
        string memory question,
        uint256 endTime,
        uint8 status,
        uint8 outcome,
        address yesToken,
        address noToken,
        uint256 yesPool,
        uint256 noPool,
        uint256 lpTotalSupply,
        uint256 totalBacking,
        uint256 platformFees,
        uint256 resolutionRequestedAt,
        address resolutionRequester,
        bytes32 resolutionReason,
        uint256 resolutionConfidence,
        uint256 disputeDeadline,
        address disputer
    );
}

// ==================== MARKETPLACE CONTRACT ====================

contract BNBMarketMarketplace {
    enum MarketStatus { Open, Closed, ResolutionRequested, Resolved, Disputed }

    struct MarketListing {
        address seller;
        uint256 marketId;
        uint256 price;
        uint256 listedAt;
        bool isActive;
    }

    struct Offer {
        address buyer;
        uint256 offerPrice;
        uint256 offeredAt;
        bool isActive;
    }

    address public immutable pdxToken;
    address public immutable predictionMarket;
    address public owner;
    uint32 public marketplaceFeeBps; // Marketplace fee in basis points (e.g., 250 = 2.5%)
    
    uint256 public nextListingId = 1; // Start from 1, 0 means unlisted
    mapping(uint256 => MarketListing) public listings; // listingId => MarketListing
    mapping(uint256 => uint256) public marketToListing; // marketId => listingId
    mapping(uint256 => mapping(address => Offer)) public offers; // marketId => buyer => Offer
    mapping(uint256 => address) public marketOwners; // marketId => owner (internal tracking)
    
    uint256 public accumulatedFees;
    uint256 private _lock = 1;

    event MarketListed(uint256 indexed listingId, uint256 indexed marketId, address indexed seller, uint256 price, uint256 timestamp);
    event MarketBought(uint256 indexed listingId, uint256 indexed marketId, address indexed seller, address buyer, uint256 price, uint256 timestamp);
    event ListingCancelled(uint256 indexed listingId, uint256 indexed marketId, address indexed seller, uint256 timestamp);
    event ListingPriceUpdated(uint256 indexed listingId, uint256 indexed marketId, uint256 oldPrice, uint256 newPrice, uint256 timestamp);
    event OfferCreated(uint256 indexed marketId, address indexed buyer, uint256 offerPrice, uint256 timestamp);
    event OfferCancelled(uint256 indexed marketId, address indexed buyer, uint256 timestamp);
    event OfferAccepted(uint256 indexed marketId, address indexed seller, address indexed buyer, uint256 price, uint256 timestamp);
    event FeesWithdrawn(address indexed owner, uint256 amount, uint256 timestamp);
    event MarketOwnershipTransferred(uint256 indexed marketId, address indexed newOwner, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier nonReentrant() {
        require(_lock == 1, "reentrancy");
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor(
        address _pdxToken,
        address _predictionMarket,
        uint32 _marketplaceFeeBps
    ) {
        require(_pdxToken != address(0), "invalid PDX token");
        require(_predictionMarket != address(0), "invalid prediction market");
        require(_marketplaceFeeBps <= 1000, "fee too high"); // Max 10%
        
        pdxToken = _pdxToken;
        predictionMarket = _predictionMarket;
        owner = msg.sender;
        marketplaceFeeBps = _marketplaceFeeBps;
    }

    // ==================== LISTING FUNCTIONS ====================

    function getMarketOwner(uint256 marketId) public view returns (address) {
        address currentOwner = marketOwners[marketId];
        if (currentOwner != address(0)) {
            return currentOwner;
        }
        (address creator,,,,,,,,,,,,,,,,,) = IPredictionMarket(predictionMarket).markets(marketId);
        return creator;
    }

    /**
     * @notice List a market for sale
     * @param marketId The ID of the market to list
     * @param price The asking price in PDX tokens
     */
    function listMarket(uint256 marketId, uint256 price) external nonReentrant returns (uint256) {
        require(price > 0, "invalid price");
        require(marketToListing[marketId] == 0, "already listed");
        
        // Verify caller is the market owner
        require(getMarketOwner(marketId) == msg.sender, "not market owner");
        
        // Verify market is Open
        (,,, uint8 status,,,,,,,,,,,,,,) = IPredictionMarket(predictionMarket).markets(marketId);
        require(status == uint8(MarketStatus.Open), "market not open");
        
        uint256 listingId = nextListingId++;
        listings[listingId] = MarketListing({
            seller: msg.sender,
            marketId: marketId,
            price: price,
            listedAt: block.timestamp,
            isActive: true
        });
        
        marketToListing[marketId] = listingId;
        
        emit MarketListed(listingId, marketId, msg.sender, price, block.timestamp);
        
        return listingId;
    }

    /**
     * @notice Update the price of a listed market
     * @param marketId The ID of the market
     * @param newPrice The new asking price
     */
    function updatePrice(uint256 marketId, uint256 newPrice) external {
        require(newPrice > 0, "invalid price");
        uint256 listingId = marketToListing[marketId];
        require(listingId != 0, "not listed");
        
        MarketListing storage listing = listings[listingId];
        require(listing.isActive, "listing not active");
        require(listing.seller == msg.sender, "not seller");
        
        uint256 oldPrice = listing.price;
        listing.price = newPrice;
        
        emit ListingPriceUpdated(listingId, marketId, oldPrice, newPrice, block.timestamp);
    }

    /**
     * @notice Cancel a market listing
     * @param marketId The ID of the market to delist
     */
    function cancelListing(uint256 marketId) external {
        uint256 listingId = marketToListing[marketId];
        require(listingId != 0, "not listed");
        
        MarketListing storage listing = listings[listingId];
        require(listing.isActive, "listing not active");
        require(listing.seller == msg.sender, "not seller");
        
        listing.isActive = false;
        // No need to delete from marketToListing, as isActive handles it.
        // delete marketToListing[marketId]; 
        
        emit ListingCancelled(listingId, marketId, msg.sender, block.timestamp);
    }

    /**
     * @notice Buy a listed market at the asking price
     * @param marketId The ID of the market to buy
     */
    function buyMarket(uint256 marketId) external nonReentrant {
        uint256 listingId = marketToListing[marketId];
        require(listingId != 0, "not listed");
        
        MarketListing storage listing = listings[listingId];
        require(listing.isActive, "listing not active");
        require(msg.sender != listing.seller, "cannot buy own market");
        
        // Verify market is still in Open status
        (,,, uint8 status,,,,,,,,,,,,,,) = IPredictionMarket(predictionMarket).markets(marketId);
        require(status == uint8(MarketStatus.Open), "market not open");
        
        uint256 price = listing.price;
        uint256 marketplaceFee = (price * marketplaceFeeBps) / 10000;
        uint256 sellerAmount = price - marketplaceFee;
        
        // Transfer PDX from buyer
        require(IPDX(pdxToken).transferFrom(msg.sender, address(this), price), "PDX transfer failed");
        
        // Transfer to seller
        require(IPDX(pdxToken).transfer(listing.seller, sellerAmount), "seller payout failed");
        
        // Accumulate marketplace fees
        accumulatedFees += marketplaceFee;
        
        // Update ownership internally
        marketOwners[marketId] = msg.sender;
        
        // Mark listing as inactive
        listing.isActive = false;
        // No need to delete from marketToListing, as isActive handles it.
        // delete marketToListing[marketId];
        
        emit MarketBought(listingId, marketId, listing.seller, msg.sender, price, block.timestamp);
        emit MarketOwnershipTransferred(marketId, msg.sender, block.timestamp);
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @notice Get listing information
     * @param listingId The ID of the listing
     */
    function getListing(uint256 listingId) external view returns (MarketListing memory) {
        return listings[listingId];
    }

    /**
     * @notice Get listing ID for a market
     * @param marketId The ID of the market
     */
    function getListingByMarket(uint256 marketId) external view returns (uint256) {
        return marketToListing[marketId];
    }

    /**
     * @notice Check if a market is listed
     * @param marketId The ID of the market
     */
    function isMarketListed(uint256 marketId) external view returns (bool) {
        uint256 listingId = marketToListing[marketId];
        if (listingId == 0) return false;
        return listings[listingId].isActive;
    }

    // ==================== ADMIN FUNCTIONS ====================

    /**
     * @notice Withdraw accumulated marketplace fees
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 fees = accumulatedFees;
        require(fees > 0, "no fees");
        
        accumulatedFees = 0;
        require(IPDX(pdxToken).transfer(owner, fees), "PDX transfer failed");
        
        emit FeesWithdrawn(owner, fees, block.timestamp);
    }

    /**
     * @notice Update marketplace fee
     * @param _marketplaceFeeBps New fee in basis points
     */
    function setMarketplaceFee(uint32 _marketplaceFeeBps) external onlyOwner {
        require(_marketplaceFeeBps <= 1000, "fee too high"); // Max 10%
        marketplaceFeeBps = _marketplaceFeeBps;
    }

    /**
     * @notice Transfer ownership of the marketplace contract
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "zero address");
        owner = _newOwner;
    }
}
