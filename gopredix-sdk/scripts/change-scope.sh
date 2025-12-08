#!/bin/bash

# Script to change package scope from @gopredix to @yourusername

# Replace 'yourusername' with your actual NPM username
NEW_SCOPE="@ayushraj7849"

echo "Changing package scope to $NEW_SCOPE..."

# Update core package
sed -i 's/"@gopredix\/core"/"'"$NEW_SCOPE"'\/core"/g' packages/core/package.json
sed -i 's/"@gopredix\/react"/"'"$NEW_SCOPE"'\/react"/g' packages/react/package.json
sed -i 's/"@gopredix\/api"/"'"$NEW_SCOPE"'\/api"/g' packages/api/package.json

# Update dependencies in react package
sed -i 's/"@gopredix\/core"/"'"$NEW_SCOPE"'\/core"/g' packages/react/package.json

# Update dependencies in api package
sed -i 's/"@gopredix\/core"/"'"$NEW_SCOPE"'\/core"/g' packages/api/package.json

# Update in examples
sed -i 's/"@gopredix\/core"/"'"$NEW_SCOPE"'\/core"/g' examples/basic-usage/package.json

echo "✅ Scope changed to $NEW_SCOPE"
echo ""
echo "Updated packages:"
echo "  - $NEW_SCOPE/core"
echo "  - $NEW_SCOPE/react"
echo "  - $NEW_SCOPE/api"
