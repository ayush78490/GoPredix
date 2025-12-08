# NPM Login Fix Guide

## Problem
The `npm login` command doesn't work in workspace directories due to the workspace configuration.

## Solution

### Method 1: Use npm adduser with legacy auth (Recommended)
```bash
npm adduser --auth-type=legacy
```

Follow the prompts to enter:
- Username
- Password
- Email

### Method 2: Login from a different directory
```bash
cd ~
npm login
cd ~/Documents/Predection-Market/gopredix-sdk
```

### Method 3: Use npm login with legacy flag
```bash
npm login --auth-type=legacy
```

## Verify Login
After logging in, verify with:
```bash
npm whoami
```

You should see your NPM username displayed.

## Then Continue with Publishing

Once logged in successfully, you can:

### Option 1: Use the publish script
```bash
./scripts/publish.sh
```

### Option 2: Manual publishing
```bash
# Build everything
npm run build

# Publish each package
cd packages/core && npm publish --access public
cd ../react && npm publish --access public
cd ../api && npm publish --access public
```

## Troubleshooting

### If you still get workspace errors:
Try publishing from each package directory individually:
```bash
cd packages/core
npm publish --access public
```

### If you get "403 Forbidden" or permission errors:
1. Make sure you're logged in: `npm whoami`
2. Check if the package name is available: `npm view @gopredix/core`
3. Make sure you own the `@gopredix` scope or change the package names

### If the scope doesn't exist:
You need to create the organization on NPM:
1. Go to https://www.npmjs.com/org/create
2. Create an organization named `gopredix`
3. Then try publishing again

Or change the scope in all package.json files from `@gopredix/` to `@yourusername/`
