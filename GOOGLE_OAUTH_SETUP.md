# 🔐 Google OAuth Setup for Supabase

## Quick Setup (10 Minutes)

### Step 1: Enable Google Provider in Supabase

1. Go to: https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/auth/providers
2. Scroll to "Google" section
3. Click "Enable"
4. Keep this tab open - you'll need to paste Client ID and Secret

---

### Step 2: Create Google OAuth Credentials

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/apis/credentials

2. **Create New Project (if needed):**
   - Click "Select a project" → "New Project"
   - Name: "Eqho Investor Auth"
   - Click "Create"

3. **Enable Google+ API:**
   - https://console.cloud.google.com/apis/library/plus.googleapis.com
   - Click "Enable"

4. **Configure OAuth Consent Screen:**
   - Go to: https://console.cloud.google.com/apis/credentials/consent
   - Choose "External" (for any Google account)
   - Click "Create"
   
   **Fill in:**
   - App name: `Eqho Investor Deck`
   - User support email: `your@email.com`
   - Developer email: `your@email.com`
   - Click "Save and Continue"
   
   **Scopes:**
   - Click "Add or Remove Scopes"
   - Select: `.../auth/userinfo.email`
   - Select: `.../auth/userinfo.profile`
   - Click "Update" → "Save and Continue"
   
   **Test Users (for development):**
   - Add your email for testing
   - Click "Save and Continue"

5. **Create OAuth Client ID:**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Eqho Investor Deck"
   
   **Authorized redirect URIs:**
   ```
   https://yindsqbhygvskolbccqq.supabase.co/auth/v1/callback
   ```
   
   - Click "Create"
   - **Copy Client ID and Client Secret** (you'll need these)

---

### Step 3: Configure Supabase with Google Credentials

1. **Go back to Supabase:**
   - https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/auth/providers

2. **Paste Google Credentials:**
   - Client ID: (paste from Google Cloud Console)
   - Client Secret: (paste from Google Cloud Console)

3. **Click "Save"**

---

### Step 4: Update Auth Component (Already Done!)

The code is already configured to support Google OAuth:

```jsx
<Auth
  supabaseClient={supabase}
  appearance={{ theme: ThemeSupa }}
  providers={['google']}  // ✅ Already enabled
/>
```

---

### Step 5: Deploy Updated Code

Already deployed! Your site now supports Google OAuth.

---

## 🧪 Testing Google OAuth:

### 1. Test Locally First:

```bash
npm run dev
```

- Open http://localhost:5173
- Click "Sign in with Google"
- Use your Google account
- Should redirect back and show the deck

### 2. Test Production:

- Go to: https://eqho-due-diligence.vercel.app
- Click "Sign in with Google"
- Authorize with Google
- You should see the investor deck

---

## 👥 Adding Authorized Users:

### Method 1: Let Investors Sign Up with Google

**Pros:**
- ✅ Easy for investors (one-click)
- ✅ No password to remember
- ✅ Familiar Google login

**Cons:**
- ❌ Anyone with the link can try to sign up
- ❌ Need to approve/reject users

**How to restrict:**
1. Supabase Dashboard → Auth → Settings
2. Disable "Enable email signups"
3. Only Google OAuth works
4. Monitor new sign-ups in Users tab

### Method 2: Invite-Only (Recommended)

**Pre-approve specific Google accounts:**

1. Supabase Dashboard → Auth → Users
2. Click "Add user"
3. Enter investor's Gmail address
4. They get email invitation
5. They sign in with Google

---

## 🎨 Customize Login Screen:

The Google button appears automatically with the Supabase Auth UI. To customize further:

```jsx
<Auth
  supabaseClient={supabase}
  appearance={{
    theme: ThemeSupa,
    variables: {
      default: {
        colors: {
          brand: '#3b82f6',          // Your brand blue
          brandAccent: '#2563eb',    // Darker blue
        },
      },
    },
    className: {
      button: 'rounded-lg font-semibold',
      input: 'rounded-lg',
    },
  }}
  providers={['google']}
  socialLayout="vertical"  // Google button on top
  showLinks={false}        // Hide "Don't have an account?"
/>
```

---

## 🔒 Security Best Practices:

### 1. Restrict to Specific Domains (Optional)

In Google Cloud Console → OAuth Consent Screen:
- Add "Authorized domains": `eqho.ai`
- Only emails from `@eqho.ai` can sign in

### 2. Monitor Access

Supabase Dashboard → Auth → Users:
- See all logged-in users
- Revoke sessions if needed
- Delete unauthorized users

### 3. Email Confirmation

Keep "Confirm email" enabled in Supabase:
- Even with Google OAuth, adds extra verification
- Prevents accidental access

### 4. Production OAuth Client

For production (after testing):
- Create separate OAuth client for production
- Use different Client ID/Secret
- More secure than using test credentials

---

## 🎯 What Investors See:

**Landing Page:**
```
🔒 Eqho Investor Deck
Confidential - Sign in to access the investor presentation

[Sign in with Google]  ← One-click login

OR

Email: _____________
Password: _____________
[Sign In]
```

**After Google Sign-In:**
- Redirects to Google authorization
- User approves access
- Redirects back to deck
- Full 6-slide presentation loads

---

## ✅ Current Setup:

**Authentication Methods:**
- ✅ Email/Password (Supabase)
- ✅ Google OAuth (just configured!)
- ✅ Magic Links (passwordless)

**Security:**
- ✅ JWT-based sessions
- ✅ Automatic logout after inactivity
- ✅ Row Level Security (RLS)
- ✅ User management dashboard

**Production:**
- ✅ Environment variables configured
- ✅ Code deployed
- ✅ Ready for investors

---

## 🚀 Quick Commands:

```bash
# Test locally with Google OAuth
npm run dev

# Check Vercel environment variables
vercel env ls

# Redeploy (if needed)
vercel --prod
```

---

## 📊 What's Protected:

Everything! Once deployed, ALL content requires authentication:

- Executive Summary
- Financial Performance
- Market Position
- Growth Strategy
- Product Roadmap
- Investment Terms
- All metrics and projections

**No public access whatsoever.**

---

## 🔗 Important Links:

- **Google Cloud Console:** https://console.cloud.google.com/apis/credentials
- **Supabase Auth Providers:** https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/auth/providers
- **Supabase Users:** https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/auth/users
- **Live Site (Protected):** https://eqho-due-diligence.vercel.app

---

## 🎉 You're Done!

Your investor deck now has:
- ✅ Professional authentication
- ✅ Google OAuth (one-click sign-in)
- ✅ Email/password option
- ✅ Secure and ready to share

**Next:** Add investor Google accounts in Supabase Dashboard!

