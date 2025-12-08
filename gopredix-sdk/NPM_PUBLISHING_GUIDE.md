# NPM Publishing Guide for GoPredix SDK

## Prerequisites

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com/signup)
2. **Login to NPM**: Run `npm login` in your terminal
3. **Organization Setup** (Optional but recommended for scoped packages):
   - Create an organization at `https://www.npmjs.com/org/create`
   - Name it `gopredix` to match the package scope `@gopredix/`

## Pre-Publishing Checklist

### 1. Verify All Packages Build Successfully
```bash
# From the root directory
npm run build

# This should build all three packages:
# - @gopredix/core
# - @gopredix/react
# - @gopredix/api
```

### 2. Test TypeScript Compilation
```bash
# Test each package
cd packages/core && npx tsc --noEmit
cd ../react && npx tsc --noEmit
cd ../api && npx tsc --noEmit
```

### 3. Run Tests (if available)
```bash
npm test
```

### 4. Update Version Numbers (if needed)
Choose your versioning strategy based on [Semantic Versioning](https://semver.org/):
- **Patch** (1.0.0 → 1.0.1): Bug fixes
- **Minor** (1.0.0 → 1.1.0): New features (backward compatible)
- **Major** (1.0.0 → 2.0.0): Breaking changes

```bash
# Update all packages to the same version
npm version patch --workspaces

# Or update individually
cd packages/core && npm version patch
cd ../react && npm version patch
cd ../api && npm version patch
```

### 5. Create a LICENSE File
```bash
# Create an MIT license (recommended)
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 GoPredix Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

## Publishing to NPM

### Option 1: Publish All Packages at Once
```bash
# From the root directory
npm publish --workspaces
```

### Option 2: Publish Individual Packages

#### Step 1: Publish Core Package First
```bash
cd packages/core
npm publish
```

#### Step 2: Update React Package to Use Published Core
Edit `packages/react/package.json` and change:
```json
"dependencies": {
  "@gopredix/core": "^1.0.0"  // Change from "file:../core"
}
```

Then publish:
```bash
cd packages/react
npm install  # Install the published @gopredix/core
npm publish
```

#### Step 3: Update and Publish API Package
Edit `packages/api/package.json` and change:
```json
"dependencies": {
  "@gopredix/core": "^1.0.0"  // Change from "file:../core"
}
```

Then publish:
```bash
cd packages/api
npm install  # Install the published @gopredix/core
npm publish
```

## Post-Publishing

### 1. Verify Published Packages
```bash
# Check if packages are published
npm view @gopredix/core
npm view @gopredix/react
npm view @gopredix/api
```

### 2. Test Installation
```bash
# Create a test directory
mkdir test-gopredix && cd test-gopredix
npm init -y

# Install packages
npm install @gopredix/core
npm install @gopredix/react
```

### 3. Create a Git Tag
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Important Notes

1. **Package Scope**: The packages use `@gopredix/` scope. You need to own the `gopredix` organization on NPM or change the scope to your username.

2. **Public vs Private**: All packages are configured with `"publishConfig": { "access": "public" }` to ensure they're publicly available.

3. **File Dependencies**: Before publishing, update all `"file:../core"` dependencies to proper version numbers like `"^1.0.0"`.

4. **Build Before Publish**: Always run `npm run build` before publishing to ensure the `dist` folder is up to date.

5. **.npmignore**: The `files` field in package.json ensures only necessary files are published (dist, README, LICENSE).

## Updating After First Publish

```bash
# 1. Make your changes
# 2. Update version
npm version patch --workspaces

# 3. Build
npm run build

# 4. Publish
npm publish --workspaces
```

## Troubleshooting

### "You do not have permission to publish"
- Make sure you're logged in: `npm whoami`
- Ensure you own the `@gopredix` scope or change to `@yourusername/packagename`
- Check if the package name is already taken: `npm view @gopredix/core`

### "Package not found after publishing"
- Wait a few minutes for NPM's CDN to update
- Check package visibility settings on npmjs.com
- Verify you published with `--access public` for scoped packages

### "Missing LICENSE file"
- Create a LICENSE file in the root directory
- The package.json `files` field includes it automatically

## Best Practices

1. ✅ Always test locally before publishing
2. ✅ Use semantic versioning
3. ✅ Keep a CHANGELOG.md
4. ✅ Update README.md with installation and usage instructions
5. ✅ Tag releases in Git
6. ✅ Consider using `npm publish --dry-run` first to see what will be published
