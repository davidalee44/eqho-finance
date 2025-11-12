#!/bin/bash

echo "🚀 Redeploying with Authentication..."
echo ""
echo "This will deploy your investor deck with Clerk authentication enabled."
echo ""

# Check if Clerk key is set
if ! vercel env ls production | grep -q "VITE_CLERK_PUBLISHABLE_KEY"; then
    echo "❌ VITE_CLERK_PUBLISHABLE_KEY not found in production environment"
    echo ""
    echo "Please run ./add-clerk-key.sh first to add your Clerk key"
    exit 1
fi

echo "✅ Clerk key found in production environment"
echo ""
echo "Deploying to production..."
echo ""

vercel --prod --yes

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔒 Your site is now protected with Clerk authentication"
echo ""
echo "Next steps:"
echo "1. Go to https://dashboard.clerk.com"
echo "2. Add investor emails under 'Users'"
echo "3. Test login at https://eqho-due-diligence.vercel.app"

