// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BNB Native Marketplace
 * @notice Marketplace for buying and selling BNB prediction markets using native BNB
 * @dev Modified from BNBMarketMarketplace to accept BNB payments instead of PDX tokens
 */

// ==================== INTERFACES ====================

interface IPredictionMarket {
    function markets(
        uint256
    )
        external
        view
        returns (
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

    function transferMarketOwnership(uint256 id, address newOwner) external;
}

// ==================== MARKETPLACE CONTRACT ====================

contract BNBNativeMarketplace {
    enum MarketStatus {
        Open,
        Closed,
        ResolutionRequested,
        Resolved,
        Disputed
    }

    struct MarketListing {
        address seller;
        uint256 marketId;
        uint256 price; // Price in BNB (wei)
        uint256 listedAt;
        bool isActive;
    }

    struct Offer {
        address buyer;
        uint256 offerPrice; // Offer price in BNB (wei)
        uint256 offeredAt;
        bool isActive;
    }

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

    event MarketListed(
        uint256 indexed listingId,
        uint256 indexed marketId,
        address indexed seller,
        uint256 price,
        uint256 timestamp
    );
    event MarketBought(
        uint256 indexed listingId,
        uint256 indexed marketId,
        address indexed seller,
        address buyer,
        uint256 price,
        uint256 timestamp
    );
    event ListingCancelled(
        uint256 indexed listingId,
        uint256 indexed marketId,
        address indexed seller,
        uint256 timestamp
    );
    event ListingPriceUpdated(
        uint256 indexed listingId,
        uint256 indexed marketId,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );
    event OfferCreated(
        uint256 indexed marketId,
        address indexed buyer,
        uint256 offerPrice,
        uint256 timestamp
    );
    event OfferCancelled(
        uint256 indexed marketId,
        address indexed buyer,
        uint256 timestamp
    );
    event OfferAccepted(
        uint256 indexed marketId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 timestamp
    );
    event FeesWithdrawn(
        address indexed owner,
        uint256 amount,
        uint256 timestamp
    );
    event MarketOwnershipTransferred(
        uint256 indexed marketId,
        address indexed newOwner,
        uint256 timestamp
    );

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

    constructor(address _predictionMarket, uint32 _marketplaceFeeBps) {
        require(_predictionMarket != address(0), "invalid prediction market");
        require(_marketplaceFeeBps <= 1000, "fee too high"); // Max 10%

        predictionMarket = _predictionMarket;
        owner = msg.sender;
        marketplaceFeeBps = _marketplaceFeeBps;
    }

    // ==================== LISTING FUNCTIONS ====================

    /**
     * @notice Check if a market exists in the prediction market contract
     * @param marketId The ID of the market to check
     * @return exists True if market exists, false otherwise
     */
    function marketExists(uint256 marketId) public view returns (bool) {
        try IPredictionMarket(predictionMarket).markets(marketId) returns (
            address,
            string memory,
            uint256,
            uint8,
            uint8,
            address,
            address,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            address,
            bytes32,
            uint256,
            uint256,
            address
        ) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @notice Get the owner of a market
     * @param marketId The ID of the market
     * @return owner The address of the market owner, or address(0) if market doesn't exist
     */
    function getMarketOwner(uint256 marketId) public view returns (address) {
        // Check cached ownership first (if market was sold via this marketplace)
        address cachedOwner = marketOwners[marketId];
        if (cachedOwner != address(0)) {
            return cachedOwner;
        }

        // Query the prediction market contract with try-catch to handle non-existent markets
        try IPredictionMarket(predictionMarket).markets(marketId) returns (
            address creator,
            string memory,
            uint256,
            uint8,
            uint8,
            address,
            address,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            address,
            bytes32,
            uint256,
            uint256,
            address
        ) {
            return creator;
        } catch {
            // Market doesn't exist or query failed
            return address(0);
        }
    }

    /**
     * @notice List a market for sale
     * @param marketId The ID of the market to list
     * @param price The asking price in BNB (wei)
     */
    function listMarket(
        uint256 marketId,
        uint256 price
    ) external nonReentrant returns (uint256) {
        require(price > 0, "invalid price");
        require(marketToListing[marketId] == 0, "already listed");

        // Check if market exists first
        require(marketExists(marketId), "market does not exist");

        // Verify caller is the market owner
        address marketOwner = getMarketOwner(marketId);
        require(marketOwner != address(0), "market has no owner");
        require(marketOwner == msg.sender, "not market owner");

        // Verify market is Open
        (, , , uint8 status, , , , , , , , , , , , , , ) = IPredictionMarket(
            predictionMarket
        ).markets(marketId);
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

        emit MarketListed(
            listingId,
            marketId,
            msg.sender,
            price,
            block.timestamp
        );

        return listingId;
    }

    /**
     * @notice Update the price of a listed market
     * @param marketId The ID of the market
     * @param newPrice The new asking price in BNB (wei)
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

        emit ListingPriceUpdated(
            listingId,
            marketId,
            oldPrice,
            newPrice,
            block.timestamp
        );
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

        emit ListingCancelled(listingId, marketId, msg.sender, block.timestamp);
    }

    /**
     * @notice Buy a listed market at the asking price with BNB
     * @param marketId The ID of the market to buy
     */
    function buyMarket(uint256 marketId) external payable nonReentrant {
        uint256 listingId = marketToListing[marketId];
        require(listingId != 0, "not listed");

        MarketListing storage listing = listings[listingId];
        require(listing.isActive, "listing not active");
        require(msg.sender != listing.seller, "cannot buy own market");

        // Verify market is still in Open status
        (, , , uint8 status, , , , , , , , , , , , , , ) = IPredictionMarket(
            predictionMarket
        ).markets(marketId);
        require(status == uint8(MarketStatus.Open), "market not open");

        uint256 price = listing.price;
        require(msg.value == price, "incorrect BNB amount");

        uint256 marketplaceFee = (price * marketplaceFeeBps) / 10000;
        uint256 sellerAmount = price - marketplaceFee;

        // Transfer BNB to seller
        (bool sellerSuccess, ) = payable(listing.seller).call{
            value: sellerAmount
        }("");
        require(sellerSuccess, "seller payout failed");

        // Accumulate marketplace fees
        accumulatedFees += marketplaceFee;

        // Transfer market ownership on the BNB Prediction Market contract
        IPredictionMarket(predictionMarket).transferMarketOwnership(
            marketId,
            msg.sender
        );

        // Update ownership internally for cache
        marketOwners[marketId] = msg.sender;

        // Mark listing as inactive
        listing.isActive = false;

        emit MarketBought(
            listingId,
            marketId,
            listing.seller,
            msg.sender,
            price,
            block.timestamp
        );
        emit MarketOwnershipTransferred(marketId, msg.sender, block.timestamp);
    }

    // ==================== OFFER FUNCTIONS ====================

    /**
     * @notice Make an offer on a listed market with BNB deposit
     * @param marketId The ID of the market
     */
    function makeOffer(uint256 marketId) external payable nonReentrant {
        require(msg.value > 0, "invalid offer amount");
        uint256 listingId = marketToListing[marketId];
        require(listingId != 0, "not listed");

        MarketListing storage listing = listings[listingId];
        require(listing.isActive, "listing not active");
        require(msg.sender != listing.seller, "cannot offer on own market");

        // Cancel previous offer if exists and refund
        Offer storage existingOffer = offers[marketId][msg.sender];
        if (existingOffer.isActive && existingOffer.offerPrice > 0) {
            uint256 refundAmount = existingOffer.offerPrice;
            existingOffer.isActive = false;
            existingOffer.offerPrice = 0;

            (bool refundSuccess, ) = payable(msg.sender).call{
                value: refundAmount
            }("");
            require(refundSuccess, "refund failed");
        }

        // Create new offer with deposited BNB
        offers[marketId][msg.sender] = Offer({
            buyer: msg.sender,
            offerPrice: msg.value,
            offeredAt: block.timestamp,
            isActive: true
        });

        emit OfferCreated(marketId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Cancel an offer and get BNB refund
     * @param marketId The ID of the market
     */
    function cancelOffer(uint256 marketId) external nonReentrant {
        Offer storage offer = offers[marketId][msg.sender];
        require(offer.isActive, "no active offer");

        uint256 refundAmount = offer.offerPrice;
        offer.isActive = false;
        offer.offerPrice = 0;

        // Refund BNB to buyer
        (bool refundSuccess, ) = payable(msg.sender).call{value: refundAmount}(
            ""
        );
        require(refundSuccess, "refund failed");

        emit OfferCancelled(marketId, msg.sender, block.timestamp);
    }

    /**
     * @notice Accept an offer on your listed market
     * @param marketId The ID of the market
     * @param buyer The address of the buyer whose offer to accept
     */
    function acceptOffer(
        uint256 marketId,
        address buyer
    ) external nonReentrant {
        uint256 listingId = marketToListing[marketId];
        require(listingId != 0, "not listed");

        MarketListing storage listing = listings[listingId];
        require(listing.isActive, "listing not active");
        require(listing.seller == msg.sender, "not seller");

        Offer storage offer = offers[marketId][buyer];
        require(offer.isActive, "offer not active");

        // Verify market is still in Open status
        (, , , uint8 status, , , , , , , , , , , , , , ) = IPredictionMarket(
            predictionMarket
        ).markets(marketId);
        require(status == uint8(MarketStatus.Open), "market not open");

        uint256 price = offer.offerPrice;
        uint256 marketplaceFee = (price * marketplaceFeeBps) / 10000;
        uint256 sellerAmount = price - marketplaceFee;

        // BNB already held by contract from makeOffer
        // Transfer to seller
        (bool sellerSuccess, ) = payable(msg.sender).call{value: sellerAmount}(
            ""
        );
        require(sellerSuccess, "seller payout failed");

        // Accumulate marketplace fees
        accumulatedFees += marketplaceFee;

        // Transfer market ownership on the BNB Prediction Market contract
        IPredictionMarket(predictionMarket).transferMarketOwnership(
            marketId,
            buyer
        );

        // Update ownership internally for cache
        marketOwners[marketId] = buyer;

        // Mark listing and offer as inactive
        listing.isActive = false;
        offer.isActive = false;
        offer.offerPrice = 0;

        emit OfferAccepted(marketId, msg.sender, buyer, price, block.timestamp);
        emit MarketBought(
            listingId,
            marketId,
            msg.sender,
            buyer,
            price,
            block.timestamp
        );
        emit MarketOwnershipTransferred(marketId, buyer, block.timestamp);
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @notice Get listing information
     * @param listingId The ID of the listing
     */
    function getListing(
        uint256 listingId
    ) external view returns (MarketListing memory) {
        return listings[listingId];
    }

    /**
     * @notice Get listing ID for a market
     * @param marketId The ID of the market
     */
    function getListingByMarket(
        uint256 marketId
    ) external view returns (uint256) {
        return marketToListing[marketId];
    }

    /**
     * @notice Get offer information
     * @param marketId The ID of the market
     * @param buyer The address of the buyer
     */
    function getOffer(
        uint256 marketId,
        address buyer
    ) external view returns (Offer memory) {
        return offers[marketId][buyer];
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
     * @notice Withdraw accumulated marketplace fees in BNB
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 fees = accumulatedFees;
        require(fees > 0, "no fees");

        accumulatedFees = 0;
        (bool success, ) = payable(owner).call{value: fees}("");
        require(success, "withdrawal failed");

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

    /**
     * @notice Allow contract to receive BNB
     */
    receive() external payable {}
}
