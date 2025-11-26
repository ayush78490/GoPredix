# Setup Instructions - Rate Limit Fix

## 🚀 Quick Start

Follow these steps to complete the setup:

### 1. Run Database Migration

### 2. Verify Environment Variables

Ensure these environment variables are set in your `.env` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Test the Implementation

#### Create a New Market
1. Run your development server: `npm run dev`
2. Connect your wallet
3. Create a new test market
4. Check browser console for: `✅ Stored market creation date for BNB-{id}`



#### Test Graph Loading
1. Navigate to the market detail page
2. Check browser console for: `✅ Using stored creation date: {timestamp}`
3. Verify the graph loads without errors
4. **Most importantly**: Confirm NO `eth_getLogs` rate limit errors appear

### 4. Monitor for Issues

Watch the browser console for these success indicators:

✅ **On Market Creation:**
```
✅ BNB Market created with ID: X
✅ Stored market creation date for BNB-X
```

✅ **On Graph Loading:**
```
✅ Using stored creation date: 2025-11-26T...
Found X BNB buy events
Found X BNB sell events
```

❌ **What you should NOT see:**
```
Failed to fetch chunk 73183050-73232050 Error: missing response
method eth_getLogs in batch triggered rate limit
```

## 🔧 Troubleshooting

### Issue: Migration fails
**Solution**: Check if the `markets` table already exists. If so, drop it first:
```sql
DROP TABLE IF EXISTS markets CASCADE;
```
Then run the migration again.

### Issue: API endpoints return 500 errors
**Solution**: Verify your Supabase environment variables are correct and the table was created successfully.

### Issue: Graph still not loading
**Solution**: 
1. Check browser console for specific errors
2. Verify the market was created after running the migration
3. For old markets (created before migration), the graph will start from the first trade event (this is expected)

## 📊 Expected Behavior

### New Markets (Created After Migration)
- Creation date stored in Supabase ✅
- Graph starts from creation time at 50% ✅
- No block scanning for creation event ✅
- Significantly faster loading ✅

### Old Markets (Created Before Migration)
- No creation date in database (expected)
- Graph starts from first trade event ✅
- Still works, just missing the initial 50% point ✅
- No errors ✅

## 🎯 Success Criteria

You'll know everything is working when:
1. ✅ New markets appear in the `markets` table
2. ✅ Graph loads without rate limit errors
3. ✅ Console shows "Using stored creation date" message
4. ✅ Graph displays correctly with price history

## 📝 Optional: Backfill Old Markets

If you want to add creation dates for existing markets, you can manually query the blockchain once and insert the data:


This is optional and only needed if you want complete historical data for old markets.
