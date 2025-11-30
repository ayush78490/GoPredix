// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Custodial Market Marketplace
 * @notice Marketplace for buying and selling prediction markets using a custodial model.
 * @dev Solves the issue where the Marketplace cannot transfer ownership on behalf of the seller.
 *      Here, the Seller transfers ownership to this contract, which then holds it until sold or cancelled.
 */

interface IPDX {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPredictionMarket {
    function transferMarketOwnership(uint256 id, address newOwner) external;
    
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
    }
    
    function getMarketInfo(uint256 marketId) external view returns (MarketInfo memory);
}

contract CustodialMarketplace {
    enum MarketStatus { Open, Closed, ResolutionRequested, Resolved, Disputed }

    struct Listing {
        address seller;
        uint256 marketId;
        uint256 price;
        uint256 listedAt;
        bool isActive;
        bool isTransferred; // True if ownership has been transferred to this contract
    }

    address public immutable pdxToken;
    address public immutable predictionMarket;
    address public owner;
    uint32 public marketplaceFeeBps; // e.g., 250 = 2.5%
    
    uint256 public nextListingId;
    mapping(uint256 => Listing) public listings; // listingId => Listing
    mapping(uint256 => uint256) public marketToListing; // marketId => listingId
    
    uint256 public accumulatedFees;
    uint256 private _lock = 1;

    event MarketListed(uint256 indexed listingId, uint256 indexed marketId, address indexed seller, uint256 price, uint256 timestamp);
    event MarketOwnershipConfirmed(uint256 indexed listingId, uint256 indexed marketId, uint256 timestamp);
    event MarketSold(uint256 indexed listingId, uint256 indexed marketId, address indexed seller, address buyer, uint256 price, uint256 timestamp);
    event ListingCancelled(uint256 indexed listingId, uint256 indexed marketId, address indexed seller, uint256 timestamp);
    event PriceUpdated(uint256 indexed listingId, uint256 indexed marketId, uint256 newPrice);

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
        nextListingId = 1;
    }

    // 1. Seller initiates listing
    function listMarket(uint256 marketId, uint256 price) external nonReentrant returns (uint256) {
        require(price > 0, "invalid price");
        require(marketToListing[marketId] == 0, "already listed");
        
        // Verify caller is the CURRENT market creator
        IPredictionMarket.MarketInfo memory info = IPredictionMarket(predictionMarket).getMarketInfo(marketId);
        
        require(info.creator == msg.sender, "not market creator");
        require(info.status == uint8(MarketStatus.Open), "market not open");
        
        uint256 listingId = nextListingId++;
        listings[listingId] = Listing({
            seller: msg.sender,
            marketId: marketId,
            price: price,
            listedAt: block.timestamp,
            isActive: true,
            isTransferred: false
        });
        
        marketToListing[marketId] = listingId;
        
        emit MarketListed(listingId, marketId, msg.sender, price, block.timestamp);
        
        return listingId;
    }

    // 2. Seller transfers ownership manually (UI handles this call to PredictionMarket)
    
    // 3. Seller confirms transfer to activate listing
    function confirmTransfer(uint256 marketId) external nonReentrant {
        uint256 listingId = marketToListing[marketId];
        require(listingId != 0, "not listed");
        
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "not seller");
        require(listing.isActive, "not active");
        require(!listing.isTransferred, "already transferred");
        
        // Check if we are now the owner
        IPredictionMarket.MarketInfo memory info = IPredictionMarket(predictionMarket).getMarketInfo(marketId);
        require(info.creator == address(this), "ownership not transferred");
        
        listing.isTransferred = true;
        
        emit MarketOwnershipConfirmed(listingId, marketId, block.timestamp);
    }

    // 4. Buyer buys market
    function buyMarket(uint256 marketId) external nonReentrant {
        uint256 listingId = marketToListing[marketId];
        require(listingId != 0, "not listed");
        
        Listing storage listing = listings[listingId];
        require(listing.isActive, "listing not active");
        require(listing.isTransferred, "waiting for transfer");
        require(msg.sender != listing.seller, "cannot buy own market");
        
        // Verify market is still open
        IPredictionMarket.MarketInfo memory info = IPredictionMarket(predictionMarket).getMarketInfo(marketId);
        require(info.status == uint8(MarketStatus.Open), "market not open");
        
        uint256 price = listing.price;
        uint256 marketplaceFee = (price * marketplaceFeeBps) / 10000;
        uint256 sellerAmount = price - marketplaceFee;
        
        // Transfer PDX from buyer
        require(IPDX(pdxToken).transferFrom(msg.sender, address(this), price), "PDX transfer failed");
        
        // Transfer to seller
        require(IPDX(pdxToken).transfer(listing.seller, sellerAmount), "seller payout failed");
        
        // Accumulate fees
        accumulatedFees += marketplaceFee;
        
        // Transfer market ownership to buyer
        // Since we are now the creator, we can call this
        IPredictionMarket(predictionMarket).transferMarketOwnership(marketId, msg.sender);
        
        // Close listing
        listing.isActive = false;
        delete marketToListing[marketId];
        
        emit MarketSold(listingId, marketId, listing.seller, msg.sender, price, block.timestamp);
    }

    // Cancel listing
    function cancelListing(uint256 marketId) external nonReentrant {
        uint256 listingId = marketToListing[marketId];
        require(listingId != 0, "not listed");
        
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "not seller");
        require(listing.isActive, "not active");
        
        // If we hold ownership, return it
        if (listing.isTransferred) {
            IPredictionMarket.MarketInfo memory info = IPredictionMarket(predictionMarket).getMarketInfo(marketId);
            if (info.creator == address(this)) {
                IPredictionMarket(predictionMarket).transferMarketOwnership(marketId, listing.seller);
            }
        }
        
        listing.isActive = false;
        delete marketToListing[marketId];
        
        emit ListingCancelled(listingId, marketId, msg.sender, block.timestamp);
    }

    function updatePrice(uint256 marketId, uint256 newPrice) external {
        require(newPrice > 0, "invalid price");
        uint256 listingId = marketToListing[marketId];
        require(listingId != 0, "not listed");
        
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "not seller");
        require(listing.isActive, "not active");
        
        listing.price = newPrice;
        emit PriceUpdated(listingId, marketId, newPrice);
    }

    function withdrawFees() external onlyOwner {
        uint256 fees = accumulatedFees;
        require(fees > 0, "no fees");
        accumulatedFees = 0;
        require(IPDX(pdxToken).transfer(owner, fees), "transfer failed");
    }

    // ==================== VIEWS ====================

    function getListingByMarket(uint256 marketId) external view returns (uint256) {
        return marketToListing[marketId];
    }

    function isMarketListed(uint256 marketId) external view returns (bool) {
        return marketToListing[marketId] != 0;
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }
}