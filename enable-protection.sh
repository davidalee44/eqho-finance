#!/bin/bash

# This script enables Vercel password protection
# You need to set a password when prompted

echo "🔒 Enabling Vercel Password Protection..."
echo ""
echo "This requires manual action in Vercel Dashboard:"
echo ""
echo "1. Go to: https://vercel.com/eqho/eqho-due-diligence/settings/general"
echo "2. Scroll to 'Deployment Protection'"
echo "3. Enable 'Password Protection'"
echo "4. Set a strong password"
echo "5. Click 'Save'"
echo ""
echo "⚠️  IMPORTANT: Share password ONLY with authorized investors!"
echo ""
echo "Opening Vercel Dashboard in browser..."

# Try to open the URL in default browser
if command -v open &> /dev/null; then
    open "https://vercel.com/eqho/eqho-due-diligence/settings/general"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://vercel.com/eqho/eqho-due-diligence/settings/general"
else
    echo "Please manually open: https://vercel.com/eqho/eqho-due-diligence/settings/general"
fi

