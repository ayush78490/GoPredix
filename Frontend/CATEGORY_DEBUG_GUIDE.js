/**
 * DEBUGGING GUIDE FOR CATEGORY ISSUE
 * 
 * The AI validation API is working correctly and returning proper categories.
 * Follow these steps to find where the category is getting lost:
 * 
 * 1. Open browser console (F12)
 * 2. Create a crypto market with question like "Will Bitcoin reach $100k by end of 2025?"
 * 3. Click "Validate with AI"
 * 4. Look for these console logs:
 * 
 * Expected logs:
 * ✅ AI Validation Response: {valid: true, category: "CRYPTO", ...}
 *    Category returned: CRYPTO
 * ✅ Validation passed
 * 📊 Creating PDX market with category: CRYPTO
 *    validationResult: {valid: true, category: "CRYPTO", ...}
 * 🔧 PDX Hook - Creating market with category: CRYPTO
 *    validation.category: CRYPTO
 *    params.category: CRYPTO
 * 
 * 5. After market is created, check what category is stored:
 *    - Open browser dev tools
 *    - Go to Application > Local Storage
 *    - Or check the Supabase database directly
 * 
 * 6. If category is correct in logs but wrong in UI:
 *    - The issue is in how markets are fetched/displayed
 *    - Check the market detail page or market list component
 * 
 * 7. If category is wrong in logs:
 *    - The AI validation might be timing out
 *    - Check for error messages in console
 *    - The fallback basic validation should still work
 * 
 * COMMON ISSUES:
 * 
 * Issue 1: AI validation times out
 * - You'll see "AI validation unavailable, but question passes basic checks"
 * - Basic validation will use local category detection (should still work)
 * - Categories: CRYPTO, POLITICS, SPORTS, TECHNOLOGY, FINANCE, ENTERTAINMENT, SCIENCE, WORLD, OTHER
 * 
 * Issue 2: Category is correct on creation but wrong when fetched
 * - Check if there's a category mapping in the market display component
 * - Check if Supabase is overwriting the category
 * 
 * Issue 3: Category is "General" or "GENERAL" instead of "CRYPTO"
 * - This means validation.category is undefined/null
 * - Check if AI validation is actually being called
 * - Check if you clicked "Validate with AI" button before creating
 */

console.log('📖 Category Debugging Guide loaded. See comments in this file for instructions.')
