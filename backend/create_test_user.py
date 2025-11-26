#!/usr/bin/env python3
"""
Create Test User in Supabase

Creates a test investor user that can be used to login and test the portal.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from supabase import create_client

from app.core.config import settings

# Create Supabase admin client
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

def create_test_user():
    print("Creating test investor user...")
    print()

    email = "investor.test@eqho.ai"
    password = "TestInvestor2025!"

    try:
        # Try to sign up the user
        response = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "role": "investor",
                    "app_access": ["investor-deck"],
                    "full_name": "Test Investor",
                    "company": "Test Capital Partners"
                }
            }
        })

        if response.user:
            print("✓ Test user created successfully!")
            print()
            print(f"Email:    {email}")
            print(f"Password: {password}")
            print("Role:     investor")
            print(f"User ID:  {response.user.id}")
            print()
            print("You can now login at: http://localhost:5173")
            print()
            return True
        else:
            print("⚠️  User might already exist or email confirmation required")
            print()
            print("Try logging in with:")
            print(f"Email:    {email}")
            print(f"Password: {password}")
            return False

    except Exception as e:
        error_str = str(e)
        if "already registered" in error_str.lower() or "already exists" in error_str.lower():
            print("✓ User already exists!")
            print()
            print("Login credentials:")
            print(f"Email:    {email}")
            print(f"Password: {password}")
            print()
            return True
        else:
            print(f"✗ Error creating user: {e}")
            print()
            print("Alternative: Create user in Supabase Dashboard:")
            print("https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/auth/users")
            return False


if __name__ == "__main__":
    success = create_test_user()
    sys.exit(0 if success else 1)

