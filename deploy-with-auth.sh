#!/bin/bash

echo "🔒 Deploying Investor Deck with Supabase Authentication..."
echo ""
echo "Step 1: Checking Vercel environment variables..."
echo ""

# Check if Supabase keys are set
if ! vercel env ls production | grep -q "VITE_SUPABASE_URL"; then
    echo "Adding VITE_SUPABASE_URL to production..."
    echo "https://yindsqbhygvskolbccqq.supabase.co" | vercel env add VITE_SUPABASE_URL production
fi

if ! vercel env ls production | grep -q "VITE_SUPABASE_ANON_KEY"; then
    echo "Adding VITE_SUPABASE_ANON_KEY to production..."
    echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmRzcWJoeWd2c2tvbGJjY3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NTM1NjksImV4cCI6MjA3ODMyOTU2OX0.y9uuFjCDVLWsSgZkt8YkccT4X66s9bmBaajGmdrJmP8" | vercel env add VITE_SUPABASE_ANON_KEY production
fi

echo ""
echo "✅ Environment variables configured"
echo ""
echo "Step 2: Deploying to production..."
echo ""

vercel --prod --yes

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔒 Your investor deck is now protected with Supabase Authentication!"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/auth/users"
echo "2. Click 'Add user' to invite investors"
echo "3. Test login at: https://eqho-due-diligence.vercel.app"
echo ""
echo "📖 Full setup guide: SUPABASE_AUTH_SETUP.md"

