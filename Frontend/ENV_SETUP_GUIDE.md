# Environment Configuration for GoPredix

## Local Development (.env.local)

Create a `.env.local` file for local development:



## Production Environment (Vercel/Hosting Platform)

Set these environment variables in your hosting platform (e.g., Vercel dashboard):



## Twitter Developer Portal Configuration

You need to add BOTH callback URLs to your Twitter app:

### Step-by-Step:

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Select your app → **Settings** → **User authentication settings**
3. Click **Edit**
4. Under **Callback URI / Redirect URL**, add BOTH:



5. Under **Website URL**, add:
```
https://www.gopredix.xyz
```

6. Click **Save**

> [!IMPORTANT]
> Twitter allows multiple callback URLs. You can have both localhost and production URLs active at the same time.

---

## Vercel Deployment Setup

If you're using Vercel:

### 1. Set Environment Variables

Go to your Vercel project → **Settings** → **Environment Variables**

Add each variable:
- Variable name: `NEXTAUTH_URL`
- Value: `https://www.gopredix.xyz`
- Environment: **Production** (and optionally Preview)

Repeat for all other variables.

### 2. Redeploy

After adding environment variables:
```bash
git push
```

Or manually trigger a redeploy in Vercel dashboard.

---

## Testing

### Local Testing
```bash
# Start dev server
npm run dev

# Navigate to http://localhost:3000/profile
# Click "Connect Twitter"
# Should redirect to Twitter and back successfully
```

### Production Testing
```bash
# After deployment
# Navigate to https://www.gopredix.xyz/profile
# Click "Connect Twitter"
# Should redirect to Twitter and back successfully
```

---



Both callback URLs should be added to your Twitter Developer Portal settings.
