# Environment Configuration for GoPredix

## Local Development (.env.local)

Create a `.env.local` file for local development:

```bash
# NextAuth Configuration - LOCAL
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# Twitter OAuth 2.0
TWITTER_CLIENT_ID=your_twitter_client_id_here
TWITTER_CLIENT_SECRET=your_twitter_client_secret_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Contract Addresses (same for dev and prod)
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x12FD6C9B618949d940806B0E59e3c65507eC37E8
NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS=0xC940106a30742F21daE111d41e8F41d482feda15
NEXT_PUBLIC_PDX_MARKET_ADDRESS=0x7d46139e1513571f19c9B87cE9A01D21cA9ef665
NEXT_PUBLIC_PDX_HELPER_ADDRESS=0x0CCaDd82A453075B8C0193809cC3693ef58E46D1
NEXT_PUBLIC_PDX_TOKEN_ADDRESS=0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8
```

## Production Environment (Vercel/Hosting Platform)

Set these environment variables in your hosting platform (e.g., Vercel dashboard):

```bash
# NextAuth Configuration - PRODUCTION
NEXTAUTH_URL=https://www.gopredix.xyz
NEXTAUTH_SECRET=<same secret as local, or generate a new one>

# Twitter OAuth 2.0 (same credentials)
TWITTER_CLIENT_ID=your_twitter_client_id_here
TWITTER_CLIENT_SECRET=your_twitter_client_secret_here

# Supabase (same as local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Contract Addresses (same as local)
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x12FD6C9B618949d940806B0E59e3c65507eC37E8
NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS=0xC940106a30742F21daE111d41e8F41d482feda15
NEXT_PUBLIC_PDX_MARKET_ADDRESS=0x7d46139e1513571f19c9B87cE9A01D21cA9ef665
NEXT_PUBLIC_PDX_HELPER_ADDRESS=0x0CCaDd82A453075B8C0193809cC3693ef58E46D1
NEXT_PUBLIC_PDX_TOKEN_ADDRESS=0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8
```

---

## Twitter Developer Portal Configuration

You need to add BOTH callback URLs to your Twitter app:

### Step-by-Step:

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Select your app → **Settings** → **User authentication settings**
3. Click **Edit**
4. Under **Callback URI / Redirect URL**, add BOTH:

```
http://localhost:3000/api/auth/callback/twitter
https://www.gopredix.xyz/api/auth/callback/twitter
```

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

## Quick Reference

| Environment | NEXTAUTH_URL | Callback URL |
|-------------|--------------|--------------|
| **Local** | `http://localhost:3000` | `http://localhost:3000/api/auth/callback/twitter` |
| **Production** | `https://www.gopredix.xyz` | `https://www.gopredix.xyz/api/auth/callback/twitter` |

Both callback URLs should be added to your Twitter Developer Portal settings.
