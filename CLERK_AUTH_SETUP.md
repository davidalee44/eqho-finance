# 🔒 Setting Up Clerk Authentication

## IMMEDIATE PROTECTION (5 minutes)

### Option 1: Vercel Password Protection (Instant)

**For immediate protection while setting up Clerk:**

1. Go to: https://vercel.com/eqho/eqho-due-diligence/settings/general
2. Scroll to "Deployment Protection"
3. Enable "Password Protection"
4. Set a password (share only with investors)
5. Click "Save"

✅ **Done!** Your site is now password-protected immediately.

---

## Option 2: Clerk Authentication (Permanent Solution - 10 minutes)

### Step 1: Create Clerk Account

1. Go to: https://dashboard.clerk.com/sign-up
2. Create a new application
3. Name: "Eqho Investor Deck"
4. Choose authentication methods:
   - ✅ Email/Password
   - ✅ Google OAuth (optional)
   - ✅ Magic Links (optional)

### Step 2: Get API Keys

1. In Clerk Dashboard → API Keys
2. Copy **Publishable Key** (starts with `pk_`)
3. Add to Vercel environment variables

### Step 3: Configure Vercel Environment Variables

**In Vercel Dashboard:**

1. Go to: https://vercel.com/eqho/eqho-due-diligence/settings/environment-variables
2. Add new variable:
   ```
   Name: VITE_CLERK_PUBLISHABLE_KEY
   Value: pk_test_your_key_here (paste from Clerk)
   ```
3. Click "Save"
4. Redeploy: `vercel --prod`

### Step 4: Add Authorized Users

**In Clerk Dashboard:**

1. Go to "Users" section
2. Click "Create User"
3. Add investor emails:
   ```
   investor@example.com
   partner@vc-firm.com
   ```

### Step 5: Customize Sign-In Page (Optional)

**In Clerk Dashboard → Appearance:**

1. Upload Eqho logo
2. Customize colors to match brand
3. Add custom messaging

---

## Features Enabled:

✅ **Secure Access** - Only authorized users can view deck
✅ **Email/Password** - Traditional login
✅ **Social Login** - Google OAuth (if enabled)
✅ **Magic Links** - Passwordless email login
✅ **User Management** - Add/remove investors easily
✅ **Session Management** - Automatic logout after inactivity
✅ **Multi-Device** - Users can access from any device

---

## Testing Authentication:

### Local Development:

```bash
# Add your Clerk key to .env.local
echo "VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key" > .env.local

# Restart dev server
npm run dev
```

### Production:

1. Visit: https://eqho-due-diligence.vercel.app
2. You should see the sign-in screen
3. Create a test account or use authorized email
4. After signing in, you'll see the full investor deck

---

## Current Implementation:

The authentication is already integrated into the codebase:

- ✅ `@clerk/clerk-react` installed
- ✅ `ClerkProvider` wrapping the app
- ✅ Sign-in gate implemented
- ✅ Only authenticated users can access content
- ✅ Environment variables configured

**All you need to do is:**
1. Create Clerk account
2. Get publishable key
3. Add to Vercel environment variables
4. Redeploy

---

## Security Best Practices:

✅ **Never commit** `.env.local` to git (already in .gitignore)
✅ **Use separate keys** for development and production
✅ **Regularly audit** user access in Clerk Dashboard
✅ **Enable MFA** for sensitive investor accounts (optional)
✅ **Set session timeout** in Clerk settings (e.g., 7 days)

---

## Quick Commands:

```bash
# Local development with auth
npm run dev

# Deploy to production
vercel --prod

# View environment variables
vercel env ls

# Add environment variable
vercel env add VITE_CLERK_PUBLISHABLE_KEY
```

---

## Troubleshooting:

**Q: Seeing "Missing Publishable Key" error?**
A: Add `VITE_CLERK_PUBLISHABLE_KEY` to Vercel environment variables and redeploy

**Q: Sign-in screen not showing?**
A: Check that Clerk key is valid and application is active in Clerk Dashboard

**Q: Users can't access after signing in?**
A: Verify users are added in Clerk Dashboard → Users section

---

## Alternative: Vercel Password Protection

If you need **instant protection** before Clerk setup:

1. Vercel Dashboard → Settings → General
2. Enable "Password Protection"
3. Set password
4. Share password only with authorized investors

**Note:** This protects the entire site with a single password. Clerk provides proper user management.

---

## Next Steps:

1. ✅ Create Clerk account: https://dashboard.clerk.com
2. ✅ Get publishable key
3. ✅ Add to Vercel: `VITE_CLERK_PUBLISHABLE_KEY`
4. ✅ Redeploy: `vercel --prod`
5. ✅ Add investor emails in Clerk Dashboard
6. ✅ Test login at https://eqho-due-diligence.vercel.app

---

**⚠️ IMPORTANT:** Until you complete Clerk setup, use Vercel Password Protection for immediate security!

