// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BNB Custodial Marketplace
 * @notice Marketplace for buying and selling BNB prediction markets using a custodial model with BNB payments.
 * @dev Uses the same 3-step listing process as the PDX Custodial Marketplace:
 *      Step 1: Seller calls listMarket() to create a listing
 *      Step 2: Seller manually transfers market ownership to this contract via PredictionMarket.transferMarketOwnership()
 *      Step 3: Seller calls confirmTransfer() to verify and activate the listing
 *
 *      This solves the issue where the Marketplace cannot transfer ownership on behalf of the seller.
 *      The seller transfers ownership to this contract, which holds it until sold or cancelled.
 */

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

    function getMarketInfo(
        uint256 marketId
    ) external view returns (MarketInfo memory);
}

contract BNBCustodialMarketplace {
    enum MarketStatus {
        Open,
        Closed,
        ResolutionRequested,
        Resolved,
        Disputed
    }

    struct Listing {
        address seller;
        uint256 marketId;
        uint256 price; // Price in BNB (wei)
        uint256 listedAt;
        bool isActive;
        bool isTransferred; // True if ownership has been transferred to this contract
    }

    address public immutable predictionMarket;
    address public owner;
    uint32 public marketplaceFeeBps; // e.g., 250 = 2.5%

    uint256 public nextListingId;
    mapping(uint256 => Listing) public listings; // listingId => Listing
    mapping(uint256 => uint256) public marketToListing; // marketId => listingId

    uint256 public accumulatedFees;
    uint256 private _lock = 1;

    event MarketListed(
        uint256 indexed listingId,
        uint256 indexed marketId,
        address indexed seller,
        uint256 price,
        uint256 timestamp
    );
    event MarketOwnershipConfirmed(
        uint256 indexed listingId,
        uint256 indexed marketId,
        uint256 timestamp
    );
    event MarketSold(
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
    event PriceUpdated(
        uint256 indexed listingId,
        uint256 indexed marketId,
        uint256 newPrice
    );
    event FeesWithdrawn(
        address indexed owner,
        uint256 amount,
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
        nextListingId = 1;
    }

    // ==================== 3-STEP LISTING PROCESS ====================

    /**
     * @notice Step 1: Seller initiates listing
     * @dev Creates a listing entry. Seller must then transfer ownership and confirm.
     * @param marketId The ID of the market to list
     * @param price The asking price in BNB (wei)
     * @return listingId The ID of the created listing
     */
    function listMarket(
        uint256 marketId,
        uint256 price
    ) external nonReentrant returns (uint256) {
        require(price > 0, "invalid price");
        require(marketToListing[marketId] == 0, "already listed");

        // Verify caller is the CURRENT market creator
        IPredictionMarket.MarketInfo memory info = IPredictionMarket(
            predictionMarket
        ).getMarketInfo(marketId);

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
     * @notice Step 2: Seller transfers ownership manually
     * @dev Seller must call predictionMarket.transferMarketOwnership(marketId, address(this))
     *      This is done through the UI, not via this contract
     */

    /**
     * @notice Step 3: Seller confirms transfer to activate listing
     * @dev Verifies that ownership has been transferred to this contract and activates the listing
     * @param marketId The ID of the market
     */
    function confirmTransfer(uint256 marketId) external nonReentrant {
        uint256 listingId = marketToListing[marketId];
        require(listingId != 0, "not listed");

        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "not seller");
        require(listing.isActive, "not active");
        require(!listing.isTransferred, "already transferred");

        // Check if we are now the owner
        IPredictionMarket.MarketInfo memory info = IPredictionMarket(
            predictionMarket
        ).getMarketInfo(marketId);
        require(info.creator == address(this), "ownership not transferred");

        listing.isTransferred = true;

        emit MarketOwnershipConfirmed(listingId, marketId, block.timestamp);
    }

    // ==================== BUYING ====================

    /**
     * @notice Buy a listed market with BNB
     * @dev Buyer sends BNB, marketplace takes fee and pays seller, then transfers market ownership to buyer
     * @param marketId The ID of the market to buy
     */
    function buyMarket(uint256 marketId) external payable nonReentrant {
        uint256 listingId = marketToListing[marketId];
        require(listingId != 0, "not listed");

        Listing storage listing = listings[listingId];
        require(listing.isActive, "listing not active");
        require(listing.isTransferred, "waiting for transfer");
        require(msg.sender != listing.seller, "cannot buy own market");

        // Verify market is still open
        IPredictionMarket.MarketInfo memory info = IPredictionMarket(
            predictionMarket
        ).getMarketInfo(marketId);
        require(info.status == uint8(MarketStatus.Open), "market not open");

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

        // Transfer market ownership to buyer
        // Since we are now the creator, we can call this
        IPredictionMarket(predictionMarket).transferMarketOwnership(
            marketId,
            msg.sender
        );

        // Close listing
        listing.isActive = false;
        delete marketToListing[marketId];

        emit MarketSold(
            listingId,
            marketId,
            listing.seller,
            msg.sender,
            price,
            block.timestamp
        );
    }

    // ==================== LISTING MANAGEMENT ====================

    /**
     * @notice Cancel a listing and return ownership to seller
     * @dev If ownership was transferred to this contract, it will be returned to the seller
     * @param marketId The ID of the market to delist
     */
    function cancelListing(uint256 marketId) external nonReentrant {
        uint256 listingId = marketToListing[marketId];
        require(listingId != 0, "not listed");

        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "not seller");
        require(listing.isActive, "not active");

        // If we hold ownership, return it
        if (listing.isTransferred) {
            IPredictionMarket.MarketInfo memory info = IPredictionMarket(
                predictionMarket
            ).getMarketInfo(marketId);
            if (info.creator == address(this)) {
                IPredictionMarket(predictionMarket).transferMarketOwnership(
                    marketId,
                    listing.seller
                );
            }
        }

        listing.isActive = false;
        delete marketToListing[marketId];

        emit ListingCancelled(listingId, marketId, msg.sender, block.timestamp);
    }

    /**
     * @notice Update the price of a listing
     * @param marketId The ID of the market
     * @param newPrice The new price in BNB (wei)
     */
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

    // ==================== ADMIN ====================

    /**
     * @notice Withdraw accumulated marketplace fees
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

    // ==================== VIEWS ====================

    /**
     * @notice Get listing ID for a market
     * @param marketId The ID of the market
     * @return The listing ID, or 0 if not listed
     */
    function getListingByMarket(
        uint256 marketId
    ) external view returns (uint256) {
        return marketToListing[marketId];
    }

    /**
     * @notice Check if a market is listed
     * @param marketId The ID of the market
     * @return True if market has an active listing
     */
    function isMarketListed(uint256 marketId) external view returns (bool) {
        return marketToListing[marketId] != 0;
    }

    /**
     * @notice Check if ownership has been transferred for a listing
     * @param marketId The ID of the market
     * @return True if ownership has been transferred to this contract
     */
    function isOwnershipTransferred(
        uint256 marketId
    ) external view returns (bool) {
        uint256 listingId = marketToListing[marketId];
        if (listingId == 0) return false;
        return listings[listingId].isTransferred;
    }

    /**
     * @notice Get listing information
     * @param listingId The ID of the listing
     * @return The listing struct
     */
    function getListing(
        uint256 listingId
    ) external view returns (Listing memory) {
        return listings[listingId];
    }

    /**
     * @notice Allow contract to receive BNB
     */
    receive() external payable {}
}
