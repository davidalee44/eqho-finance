# Fix Supabase OAuth Redirects for Production

## Problem

After Google OAuth login, Supabase redirects to:
```
http://localhost:3000/#access_token=...
```

Should redirect to:
```
https://eqho-due-diligence-467vfz9v4-eqho.vercel.app/#access_token=...
```

---

## Root Cause

Supabase redirect URIs are configured for local development only.

**Current:** http://localhost:3000, http://localhost:5173  
**Needed:** Production Vercel URL added

---

## Fix (2 minutes)

### Step 1: Update Supabase Redirect URIs

1. **Go to Supabase Dashboard:**
   https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/auth/url-configuration

2. **Add Production URLs to "Redirect URLs":**
   ```
   https://eqho-due-diligence-467vfz9v4-eqho.vercel.app/*
   https://eqho-due-diligence-467vfz9v4-eqho.vercel.app/**
   http://localhost:5173/*
   http://localhost:3000/*
   ```

3. **Site URL:**
   ```
   https://eqho-due-diligence-467vfz9v4-eqho.vercel.app
   ```

4. **Click "Save"**

### Step 2: Update Google OAuth Redirect URIs

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/apis/credentials

2. **Select your OAuth 2.0 Client ID**

3. **Add Authorized Redirect URIs:**
   ```
   https://yindsqbhygvskolbccqq.supabase.co/auth/v1/callback
   ```
   (Should already be there, but verify)

4. **Add Authorized JavaScript Origins:**
   ```
   https://eqho-due-diligence-467vfz9v4-eqho.vercel.app
   https://eqho.ai
   ```

5. **Save**

### Step 3: Test

1. Visit: https://eqho-due-diligence-467vfz9v4-eqho.vercel.app
2. Click "Continue with Google"
3. Login
4. Should redirect back to Vercel (not localhost)

---

## Alternative: Use Custom Domain

Instead of the long Vercel URL, set up:

**Custom domain:** `app.eqho.ai` or `investor.eqho.ai`

### In Vercel:
1. Project Settings → Domains
2. Add: `app.eqho.ai`
3. Add DNS record (Vercel provides)

### In Supabase:
1. Update redirect URLs to use `app.eqho.ai`
2. Much cleaner URLs

### In Google OAuth:
1. Add `https://app.eqho.ai` to authorized origins

---

## Quick Fix Commands

### Update Supabase (via Dashboard)

**URL:** https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/auth/url-configuration

**Add to Redirect URLs list:**
```
https://eqho-due-diligence-467vfz9v4-eqho.vercel.app/*
https://eqho-due-diligence-467vfz9v4-eqho.vercel.app/**
```

**Update Site URL:**
```
https://eqho-due-diligence-467vfz9v4-eqho.vercel.app
```

---

## Why This Happens

**Local development:**
- Frontend runs on localhost:5173
- Supabase configured for localhost
- Works fine locally

**Production:**
- Frontend on Vercel
- But Supabase still redirects to localhost
- Need to add production URLs

**Fix:** Add production URL to Supabase allowed redirects

---

## After Fix

**Login flow:**
1. User visits Vercel production URL
2. Clicks "Continue with Google"
3. Google OAuth → Supabase
4. Supabase redirects back to **Vercel** (not localhost)
5. User logged in on production site ✅

---

## Current Vercel URL

**Production:**
```
https://eqho-due-diligence-467vfz9v4-eqho.vercel.app
```

**Add this exact URL to:**
- Supabase redirect URLs ✅
- Google OAuth authorized origins ✅

---

## Status

⏳ **Needs fix:** Supabase redirect URI configuration  
✅ **Code deployed:** Frontend on Vercel  
✅ **Backend ready:** Can deploy to Railway tomorrow  

**Quick fix:** 2 minutes in Supabase dashboard to add production URL

---

**Do this before bed (2 min) or tomorrow morning - then login will work on production!**

Good night! 😴

