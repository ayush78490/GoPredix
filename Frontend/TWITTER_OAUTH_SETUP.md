# Twitter OAuth Setup Guide

## 🚨 Critical: Fix the "Something went wrong" Error

If users are seeing the Twitter OAuth error, follow these steps to fix it:

## 1. Update Environment Variables

Create or update your `.env.local` file with the following:



### Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Copy the output and paste it as your `NEXTAUTH_SECRET`.

---

## 2. Configure Twitter Developer Portal

> [!IMPORTANT]
> **This is the most common cause of the "Something went wrong" error!**

### Step-by-Step Instructions:

1. **Go to Twitter Developer Portal**
   - Visit: https://developer.twitter.com/en/portal/dashboard
   - Sign in with your Twitter account

2. **Select Your App**
   - Click on your app name
   - Go to **Settings** tab

3. **Configure User Authentication Settings**
   - Click **"Set up"** or **"Edit"** under "User authentication settings"
   
4. **OAuth 2.0 Settings**
   
   **App permissions:**
   - ✅ Read (required)
   - ⬜ Write (optional)
   - ⬜ Direct Messages (optional)
   
   **Type of App:**
   - ✅ Web App, Automated App or Bot
   
   **App info:**
   - **Callback URI / Redirect URL** (CRITICAL - must be exact):
     ```
     http://localhost:3000/api/auth/callback/twitter
     ```
     For production, add:
     ```
     https://yourdomain.com/api/auth/callback/twitter
     ```
   
   - **Website URL:**
     ```
     http://localhost:3000
     ```
     For production:
     ```
     https://yourdomain.com
     ```

5. **Save Changes**
   - Click **"Save"** at the bottom
   - Copy your **Client ID** and **Client Secret**
   - Add them to your `.env.local` file

---

## 3. Verify Configuration

### Check Callback URL Format

The callback URL MUST be exactly:
```
http://localhost:3000/api/auth/callback/twitter
```

**Common mistakes:**
- ❌ `http://localhost:3000/api/auth/callback` (missing `/twitter`)
- ❌ `http://localhost:3000/auth/callback/twitter` (missing `/api`)
- ❌ `https://localhost:3000/...` (using https for localhost)
- ❌ `http://127.0.0.1:3000/...` (using IP instead of localhost)

### Test the OAuth Flow

1. **Restart your development server:**
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

2. **Clear browser cache and cookies**
   - Open DevTools (F12)
   - Go to Application → Storage → Clear site data

3. **Test authentication:**
   - Navigate to `/profile`
   - Click "Connect Twitter"
   - You should be redirected to Twitter
   - Authorize the app
   - You should be redirected back successfully

4. **Check console logs:**
   - Open browser DevTools → Console
   - Look for: `✅ Twitter sign-in successful`
   - Server logs should show: `✅ Twitter data stored in JWT`

---

## 4. Troubleshooting

### Error: "Something went wrong"

**Cause:** Callback URL mismatch

**Solution:**
1. Double-check the callback URL in Twitter Developer Portal
2. Ensure it matches exactly: `http://localhost:3000/api/auth/callback/twitter`
3. Save changes and wait 1-2 minutes for Twitter to update
4. Clear browser cache and try again

### Error: "OAuthCallback"

**Cause:** Invalid OAuth configuration

**Solution:**
1. Verify `NEXTAUTH_URL` is set in `.env.local`
2. Ensure `NEXTAUTH_SECRET` is set and not empty
3. Check that Twitter app has "Read" permissions enabled
4. Restart your development server

### Error: "Configuration"

**Cause:** Missing environment variables

**Solution:**
1. Check that all required env vars are set:
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `TWITTER_CLIENT_ID`
   - `TWITTER_CLIENT_SECRET`
2. Restart your dev server after adding env vars

### Users still seeing errors?

**For production deployments:**
1. Update callback URL to use your production domain
2. Add production URL to Twitter Developer Portal
3. Set `NEXTAUTH_URL` to your production URL
4. Redeploy your application

---

## 5. Production Deployment

When deploying to production (e.g., Vercel):

### Environment Variables

Set these in your hosting platform:



### Twitter Developer Portal

Add production callback URL:
```
https://yourdomain.com/api/auth/callback/twitter
```

**Important:** Keep both localhost and production URLs in the callback list for testing.

---

## 6. Verify Everything Works

✅ **Checklist:**
- [ ] `.env.local` file created with all required variables
- [ ] `NEXTAUTH_SECRET` generated and set
- [ ] Twitter Developer Portal callback URL matches exactly
- [ ] Twitter app has "Read" permissions
- [ ] Development server restarted
- [ ] Browser cache cleared
- [ ] Test authentication flow works
- [ ] No errors in browser console
- [ ] No errors in server logs

---

## Need Help?

If you're still experiencing issues:

1. **Check server logs** for detailed error messages
2. **Enable debug mode** - it's already enabled in development
3. **Review Twitter Developer Portal** - ensure all settings are correct
4. **Test with a different browser** - rule out browser-specific issues
5. **Check Twitter API status** - https://api.twitterstat.us/

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Something went wrong" | Callback URL mismatch | Fix callback URL in Twitter Portal |
| "OAuthCallback" | OAuth flow failed | Check NEXTAUTH_URL and callback URL |
| "Configuration" | Missing env vars | Add all required environment variables |
| "OAuthSignin" | Can't start OAuth | Verify Twitter app credentials |
| "SessionRequired" | No active session | User needs to sign in first |
