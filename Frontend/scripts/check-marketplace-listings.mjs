import { ethers } from 'ethers';

const RPC_URL = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const BNB_MARKETPLACE = '0x2FC004d8d92Dee66FDF042BcE63C88E255b1237a';
const PDX_MARKETPLACE = '0x6D005d00f8aCA64013B5F8fbf0161Ab80aA42173';

const MARKETPLACE_ABI = [
    'function nextListingId() external view returns (uint256)',
    'function getListing(uint256 listingId) external view returns (tuple(address seller, uint256 marketId, uint256 price, uint256 listedAt, bool isActive, bool isTransferred))'
];

async function checkListings() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    console.log('🏪 Checking BNB Marketplace Listings...\n');
    const bnbMarketplace = new ethers.Contract(BNB_MARKETPLACE, MARKETPLACE_ABI, provider);

    try {
        const nextId = await bnbMarketplace.nextListingId();
        console.log(`Next Listing ID: ${nextId.toString()}`);
        console.log(`Total Listings: ${Number(nextId) - 1}\n`);

        if (Number(nextId) <= 1) {
            console.log('⚠️ No listings in BNB marketplace\n');
        } else {
            for (let i = 1; i < Number(nextId); i++) {
                try {
                    const listing = await bnbMarketplace.getListing(i);
                    console.log(`📋 Listing ${i}:`);
                    console.log(`   Market ID: ${listing.marketId.toString()}`);
                    console.log(`   Seller: ${listing.seller}`);
                    console.log(`   Price: ${ethers.formatEther(listing.price)} BNB`);
                    console.log(`   Active: ${listing.isActive}`);
                    console.log(`   Transferred: ${listing.isTransferred}\n`);
                } catch (err) {
                    console.log(`❌ Listing ${i}: Error - ${err.message}\n`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error checking BNB marketplace:', error.message);
    }

    console.log('\n🏪 Checking PDX Marketplace Listings...\n');
    const pdxMarketplace = new ethers.Contract(PDX_MARKETPLACE, MARKETPLACE_ABI, provider);

    try {
        const nextId = await pdxMarketplace.nextListingId();
        console.log(`Next Listing ID: ${nextId.toString()}`);
        console.log(`Total Listings: ${Number(nextId) - 1}\n`);

        if (Number(nextId) <= 1) {
            console.log('⚠️ No listings in PDX marketplace\n');
        } else {
            for (let i = 1; i < Number(nextId); i++) {
                try {
                    const listing = await pdxMarketplace.getListing(i);
                    console.log(`📋 Listing ${i}:`);
                    console.log(`   Market ID: ${listing.marketId.toString()}`);
                    console.log(`   Seller: ${listing.seller}`);
                    console.log(`   Price: ${ethers.formatEther(listing.price)} PDX`);
                    console.log(`   Active: ${listing.isActive}`);
                    console.log(`   Transferred: ${listing.isTransferred}\n`);
                } catch (err) {
                    console.log(`❌ Listing ${i}: Error - ${err.message}\n`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error checking PDX marketplace:', error.message);
    }
}

checkListings();
