#!/bin/bash

echo "📝 Adding Clerk Publishable Key to Vercel..."
echo ""
echo "Please paste your Clerk Publishable Key (starts with pk_):"
read CLERK_KEY

if [ -z "$CLERK_KEY" ]; then
    echo "❌ No key provided. Exiting."
    exit 1
fi

# Add to production environment
vercel env add VITE_CLERK_PUBLISHABLE_KEY production <<< "$CLERK_KEY"

echo ""
echo "✅ Clerk key added to production environment!"
echo ""
echo "Next step: Run ./redeploy-secure.sh to deploy with authentication"

