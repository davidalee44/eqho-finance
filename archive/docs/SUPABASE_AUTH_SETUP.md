# 🔒 Supabase Authentication Setup

## ✅ What's Already Done:

- ✅ Supabase Auth UI installed
- ✅ Authentication code integrated
- ✅ Sign-in gate implemented
- ✅ Supabase client configured
- ✅ Environment variables set

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Enable Email Authentication in Supabase

1. Go to: https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/auth/providers
2. Under "Email" section, make sure:
   - ✅ "Enable Email provider" is ON
   - ✅ "Confirm email" is ON (recommended)
3. Click "Save"

### Step 2: Add Authorized Users

**Option A: Self-Registration (Easiest)**
1. Go to: https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/auth/users
2. Click "Add user"
3. Add investor emails:
   ```
   investor@example.com
   partner@vc-firm.com
   ```
4. They'll receive confirmation email

**Option B: Manual Creation**
1. Click "Add user"
2. Enter email and password
3. Share credentials with investors

### Step 3: Configure Vercel Environment Variables

Add to Vercel production:

```bash
vercel env add VITE_SUPABASE_URL production
# Paste: https://yindsqbhygvskolbccqq.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbmRzcWJoeWd2c2tvbGJjY3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NTM1NjksImV4cCI6MjA3ODMyOTU2OX0.y9uuFjCDVLWsSgZkt8YkccT4X66s9bmBaajGmdrJmP8
```

### Step 4: Deploy

```bash
vercel --prod
```

---

## 🎯 Features Enabled:

✅ **Email/Password Login** - Traditional authentication
✅ **Magic Links** - Passwordless email login
✅ **Google OAuth** - Sign in with Google (if configured)
✅ **User Management** - Add/remove investors in Supabase Dashboard
✅ **Session Management** - Automatic logout after inactivity
✅ **Row Level Security** - Database-level security
✅ **Email Confirmation** - Verify user emails (optional)

---

## 📧 Email Configuration (Optional - Better UX)

**Configure SMTP for custom emails:**

1. Go to: https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/settings/auth
2. Scroll to "SMTP Settings"
3. Configure your email provider (Gmail, SendGrid, etc.)
4. Customize email templates

**Benefits:**
- Professional branded emails
- Custom confirmation links
- Better deliverability

---

## 🎨 Customize Auth UI (Optional)

Edit `src/main.jsx` to customize:

```jsx
<Auth
  supabaseClient={supabase}
  appearance={{
    theme: ThemeSupa,
    variables: {
      default: {
        colors: {
          brand: '#3b82f6',        // Your brand color
          brandAccent: '#2563eb',  // Hover/active color
        },
      },
    },
  }}
  providers={['google']}  // Add more: 'github', 'linkedin', etc.
/>
```

---

## 🔐 Security Best Practices:

### 1. Enable Email Confirmation
- Supabase Dashboard → Authentication → Settings
- Enable "Confirm email"
- Users must verify email before accessing

### 2. Set Up Row Level Security (RLS)
Already configured! Our backend uses RLS to ensure:
- Users can only see their own data
- Database-level security
- No data leaks

### 3. Configure Session Timeout
- Supabase Dashboard → Authentication → Settings
- Set "JWT expiry" (default: 3600s = 1 hour)
- Adjust based on security needs

### 4. Restrict Sign-ups (Optional)
If you want invite-only access:
- Disable "Enable email signups"
- Manually add each investor
- More control over access

---

## 🧪 Testing Authentication:

### Local:
```bash
npm run dev
# Open http://localhost:5173
# You should see login screen
```

### Production:
1. Deploy: `vercel --prod`
2. Visit: https://eqho-due-diligence.vercel.app
3. Should see Supabase login screen
4. Sign up with your email
5. Check email for confirmation link
6. After confirming, you'll see the deck

---

## 👥 Managing Users:

### Add User:
1. https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/auth/users
2. Click "Add user"
3. Enter email
4. User receives invitation

### Remove User:
1. Find user in list
2. Click ⋮ menu
3. Click "Delete user"

### View Active Sessions:
- See who's currently logged in
- Revoke sessions if needed
- Monitor access logs

---

## 🚀 Deployment Commands:

```bash
# Test locally with auth
npm run dev

# Deploy with auth enabled
vercel --prod

# Check environment variables
vercel env ls

# Add Supabase URL
vercel env add VITE_SUPABASE_URL production

# Add Supabase Anon Key
vercel env add VITE_SUPABASE_ANON_KEY production
```

---

## 📊 What's Protected:

Once deployed with Supabase Auth, EVERYTHING is protected:

- ✅ Executive Summary
- ✅ Financial Performance Analysis
- ✅ Market Position & Benchmarking
- ✅ Growth Strategy & Projections
- ✅ Product Roadmap
- ✅ Investment Terms & Structure
- ✅ All 6 slides
- ✅ All financial data
- ✅ All metrics and projections

**No one can access without authentication.**

---

## 🔍 Troubleshooting:

**Q: Login screen not showing?**
A: Check that Supabase keys are set in Vercel environment variables

**Q: Can't sign up?**
A: Verify Email provider is enabled in Supabase Dashboard

**Q: Confirmation email not arriving?**
A: Check spam folder or configure custom SMTP

**Q: Users can't access after signing in?**
A: Ensure email is confirmed in Supabase Dashboard

---

## 🎯 Next Steps:

1. ✅ Enable Email authentication in Supabase
2. ✅ Add Vercel environment variables
3. ✅ Deploy: `vercel --prod`
4. ✅ Add investor emails
5. ✅ Test login yourself
6. ✅ Share URL with investors

---

## 📱 Mobile Access:

Supabase Auth works seamlessly on mobile:
- ✅ Responsive login screen
- ✅ Touch-friendly interface
- ✅ Same login on all devices
- ✅ Session persists across devices

---

## 🔗 Important Links:

- **Supabase Dashboard:** https://supabase.com/dashboard/project/yindsqbhygvskolbccqq
- **User Management:** https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/auth/users
- **Auth Settings:** https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/settings/auth
- **Vercel Settings:** https://vercel.com/eqho/eqho-due-diligence/settings/environment-variables

---

## ✅ Ready to Deploy!

Your authentication is fully configured. Just:
1. Add Supabase keys to Vercel
2. Run `vercel --prod`
3. Add investor emails
4. Test and share!

**Your investor deck will be secure and professional.**

