#!/bin/bash

echo "🔐 Applying User Roles Migration..."
echo ""

# Get Supabase URL from .env
if [ -f .env ]; then
    source .env
else
    echo "❌ .env file not found"
    echo "Please create backend/.env with SUPABASE_URL"
    exit 1
fi

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL not set in .env"
    echo ""
    echo "Add to backend/.env:"
    echo "SUPABASE_URL=postgresql://postgres:[password]@db.yindsqbhygvskolbccqq.supabase.co:5432/postgres"
    exit 1
fi

echo "Supabase URL: ${SUPABASE_URL:0:50}..."
echo ""
echo "Applying migration..."
echo ""

psql "$SUPABASE_URL" -f migrations/add_user_roles.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Add users with roles in Supabase Dashboard"
    echo "2. Test role-based access"
    echo "3. Deploy: cd .. && vercel --prod"
    echo ""
    echo "See USER_MANAGEMENT.md for user management guide"
else
    echo ""
    echo "❌ Migration failed"
    echo ""
    echo "Alternative: Use Supabase Dashboard SQL Editor"
    echo "1. Go to: https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/sql"
    echo "2. Copy contents of migrations/add_user_roles.sql"
    echo "3. Paste and run"
fi

