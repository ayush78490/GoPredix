# Quick Setup Checklist for GoPredix

## ✅ Local Development Setup

1. **Create `.env.local` file:**
   ```bash
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<run: openssl rand -base64 32>
   TWITTER_CLIENT_ID=<from Twitter Portal>
   TWITTER_CLIENT_SECRET=<from Twitter Portal>
   ```

2. **Twitter Developer Portal - Add callback URL:**
   ```
   http://localhost:3000/api/auth/callback/twitter
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

---

## ✅ Production Setup (gopredix.xyz)

1. **Vercel Environment Variables:**
   - `NEXTAUTH_URL` = `https://www.gopredix.xyz`
   - `NEXTAUTH_SECRET` = (same as local or new)
   - `TWITTER_CLIENT_ID` = (same as local)
   - `TWITTER_CLIENT_SECRET` = (same as local)
   - Plus all other env vars from `.env.local`

2. **Twitter Developer Portal - Add production callback:**
   ```
   https://www.gopredix.xyz/api/auth/callback/twitter
   ```
   
   **Note:** Keep both localhost AND production URLs in the list!

3. **Deploy:**
   ```bash
   git push
   ```

---

## 🔧 Twitter Developer Portal Settings

**Your app should have BOTH callback URLs:**
- ✅ `http://localhost:3000/api/auth/callback/twitter`
- ✅ `https://www.gopredix.xyz/api/auth/callback/twitter`

**Website URL:**
- `https://www.gopredix.xyz`

**App permissions:**
- ✅ Read

---

## 🧪 Test Both Environments

**Local:**
1. Go to `http://localhost:3000/profile`
2. Click "Connect Twitter"
3. Should work ✅

**Production:**
1. Go to `https://www.gopredix.xyz/profile`
2. Click "Connect Twitter"
3. Should work ✅

---

## 📝 Important Notes

- Same Twitter app credentials work for both environments
- Twitter allows multiple callback URLs
- `NEXTAUTH_URL` must match the environment (localhost vs production)
- Always restart dev server after changing `.env.local`
- Vercel auto-deploys on git push
