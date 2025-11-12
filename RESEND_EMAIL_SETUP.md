# 📧 Resend Email System Setup

## ✅ What's Been Implemented:

**Backend:**
- ✅ Email service with Resend API integration
- ✅ API endpoints for all email types
- ✅ Professional HTML email templates
- ✅ Error handling and logging

**Email Types:**
- ✅ Investor invitations
- ✅ Welcome emails
- ✅ Deal updates
- ✅ Access notifications

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Verify Resend Domain

1. Go to: https://resend.com/domains
2. Add your domain: `eqho.ai`
3. Add DNS records (provided by Resend):
   ```
   TXT @ resend-verify-xxx
   MX @ route.resend.com (priority 10)
   ```
4. Wait for verification (usually 5-10 minutes)

### Step 2: Configure From Address

Once domain is verified, you can send from:
- `investors@eqho.ai`
- `team@eqho.ai`
- `updates@eqho.ai`

Current setup uses: `investors@eqho.ai`

To change, edit `backend/app/services/email_service.py`:
```python
FROM_EMAIL = 'Eqho Investor Relations <your-email@eqho.ai>'
```

### Step 3: Test Email Service

```bash
# Start backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Test endpoint
curl http://localhost:8000/api/v1/emails/test
```

Should return:
```json
{
  "resend_configured": true,
  "from_email": "Eqho Investor Relations <investors@eqho.ai>",
  "status": "Email service ready"
}
```

---

## 📬 Email Templates

### 1. Investor Invitation

**Purpose:** Invite investors to view the deck

**Includes:**
- 🎯 $500K seed round details
- 📊 Key metrics (CAC, LTV, margins)
- 🔗 Access link to create account
- 💼 Professional branding

**API Call:**
```bash
curl -X POST http://localhost:8000/api/v1/emails/invite-investor \
  -H "Content-Type: application/json" \
  -d '{
    "to_email": "investor@vc-firm.com",
    "investor_name": "John Smith",
    "invite_url": "https://eqho-due-diligence.vercel.app"
  }'
```

**Frontend (React):**
```javascript
async function sendInvestorInvite(email, name) {
  const response = await fetch('http://localhost:8000/api/v1/emails/invite-investor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to_email: email,
      investor_name: name,
      invite_url: 'https://eqho-due-diligence.vercel.app'
    })
  })
  return response.json()
}
```

### 2. Welcome Email

**Purpose:** Welcome new users after signup

**Includes:**
- 👋 Personalized greeting
- 📋 Deck contents overview
- 🔗 Quick access link
- 📧 Support contact

**API Call:**
```bash
curl -X POST http://localhost:8000/api/v1/emails/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "to_email": "investor@vc-firm.com",
    "user_name": "John Smith"
  }'
```

### 3. Deal Updates

**Purpose:** Send quarterly updates to investors

**Includes:**
- 📈 Custom update content
- 🔗 Link to view latest deck
- 💬 Call-to-action

**API Call:**
```bash
curl -X POST http://localhost:8000/api/v1/emails/deal-update \
  -H "Content-Type": application/json" \
  -d '{
    "to_email": "investor@vc-firm.com",
    "update_title": "Q4 2024 Growth Metrics",
    "update_content": "<p>We hit <strong>15% M/M growth</strong> in Q4...</p>"
  }'
```

### 4. Access Notifications

**Purpose:** Notify you when investors view the deck

**Includes:**
- 👤 User name and email
- 🕒 Access timestamp
- 🎯 User role
- 🔗 Link to Supabase dashboard

**API Call:**
```bash
curl -X POST http://localhost:8000/api/v1/emails/access-notification \
  -H "Content-Type: application/json" \
  -d '{
    "admin_email": "david@eqho.ai",
    "user_email": "investor@vc-firm.com",
    "user_name": "John Smith",
    "user_role": "investor"
  }'
```

---

## 🔧 API Endpoints

**Base URL (Local):** http://localhost:8000/api/v1/emails
**Base URL (Production):** https://api.eqho.ai/api/v1/emails

**Endpoints:**
```
POST /invite-investor    - Send investor invitation
POST /welcome            - Send welcome email
POST /deal-update        - Send deal update
POST /access-notification - Notify admin of access
GET  /test              - Test email service status
```

**Full API docs:** http://localhost:8000/docs

---

## 🎯 Common Use Cases

### Use Case 1: Invite New Investor

```javascript
// In your admin dashboard or script
async function inviteInvestor(email, name) {
  const response = await fetch('/api/v1/emails/invite-investor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to_email: email,
      investor_name: name,
      invite_url: 'https://eqho-due-diligence.vercel.app'
    })
  })
  
  const result = await response.json()
  console.log(`✅ Invitation sent to ${email}`)
  return result
}

// Use it
await inviteInvestor('investor@vc-firm.com', 'John Smith')
```

### Use Case 2: Auto-Welcome on Signup

**Add to Supabase Webhook:**

1. Supabase Dashboard → Database → Webhooks
2. Create webhook for `auth.users` INSERT
3. URL: `https://api.eqho.ai/api/v1/emails/welcome`
4. Payload:
```json
{
  "to_email": "{{record.email}}",
  "user_name": "{{record.raw_user_meta_data.full_name}}"
}
```

### Use Case 3: Quarterly Updates

```javascript
// Send update to all investors
async function sendQuarterlyUpdate() {
  // Get all investors from Supabase
  const { data: investors } = await supabase
    .from('user_profiles')
    .select('id, email, full_name')
    .eq('role', 'investor')
  
  // Send email to each
  for (const investor of investors) {
    await fetch('/api/v1/emails/deal-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_email: investor.email,
        update_title: 'Q4 2024 Growth Update',
        update_content: `
          <h3>Key Highlights:</h3>
          <ul>
            <li>15% M/M revenue growth</li>
            <li>Gross margins improved to 72%</li>
            <li>CAC reduced to $750</li>
          </ul>
        `
      })
    })
  }
}
```

### Use Case 4: Track Access

**Add to AppRouter.jsx:**

```javascript
useEffect(() => {
  if (userProfile) {
    // Log access and notify admin
    fetch('/api/v1/emails/access-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_email: 'david@eqho.ai',
        user_email: user.email,
        user_name: userProfile.full_name,
        user_role: userProfile.role
      })
    })
  }
}, [userProfile])
```

---

## 🎨 Customizing Email Templates

All templates are in `backend/app/services/email_service.py`

**Example: Customize Investor Invite:**

```python
def send_investor_invite(cls, to_email, investor_name, invite_url):
    subject = "You're Invited: Eqho $500K Seed Round"  # Edit this
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body>
        <!-- Edit HTML here -->
        <h1>Hi {investor_name}!</h1>
        <!-- Your custom content -->
    </body>
    </html>
    """
    
    return cls._send_email(to_email, subject, html_content)
```

**Tips:**
- Use inline CSS (email clients don't support external stylesheets)
- Test with multiple email clients
- Keep under 102KB for best deliverability
- Use `{variable}` for dynamic content

---

## 📊 Monitoring Emails

### Resend Dashboard:

1. **View Sent Emails:**
   https://resend.com/emails

2. **Check Delivery Status:**
   - Delivered
   - Opened
   - Clicked
   - Bounced

3. **View Analytics:**
   - Open rates
   - Click rates
   - Delivery rates

### API Logs:

```bash
# Backend logs
cd backend
tail -f logs/email.log

# Or check FastAPI response
curl http://localhost:8000/api/v1/emails/test
```

---

## 🔒 Security Best Practices

### 1. Verify Sender Domain

Always send from verified domain:
- ✅ `investors@eqho.ai` (once verified)
- ❌ `noreply@gmail.com` (will be rejected)

### 2. Rate Limiting

**Resend Free Tier:**
- 100 emails/day
- 3,000 emails/month

**Upgrade if needed:**
- $20/month for 50k emails

### 3. Unsubscribe Links

For marketing emails (not invites), add unsubscribe:
```html
<a href="{{unsubscribe_url}}">Unsubscribe</a>
```

---

## 🧪 Testing Emails

### Test Locally:

```bash
# Start backend
cd backend
source .venv/bin/activate
pip install requests  # If not already installed
uvicorn app.main:app --reload --port 8000

# Test endpoint
curl -X POST http://localhost:8000/api/v1/emails/invite-investor \
  -H "Content-Type: application/json" \
  -d '{
    "to_email": "your-email@gmail.com",
    "investor_name": "Test User",
    "invite_url": "http://localhost:5173"
  }'
```

### Check Your Inbox:

- Should receive professional branded email
- Click the link to test the flow
- Verify all content looks good

---

## 🎯 Automation Ideas

### Auto-Welcome on Signup:

**Use Supabase Database Webhook:**

1. Database → Webhooks → Create
2. Table: `auth.users`
3. Event: INSERT
4. URL: `https://api.eqho.ai/api/v1/emails/welcome`
5. Payload:
```json
{
  "to_email": "{{record.email}}",
  "user_name": "{{record.raw_user_meta_data.full_name}}"
}
```

### Weekly Digest to Admins:

**Cron job to send weekly summaries:**

```python
# backend/app/tasks/weekly_digest.py
async def send_weekly_digest():
    # Get user signups this week
    # Get access logs
    # Send summary to admin
    pass
```

### Deal Close Notifications:

**When term sheet is signed:**

```javascript
// Frontend trigger
async function notifyDealClosed(investorEmail) {
  await fetch('/api/v1/emails/deal-update', {
    method: 'POST',
    body: JSON.stringify({
      to_email: investorEmail,
      update_title: 'Thank You - Investment Confirmed',
      update_content: 'Your investment has been confirmed...'
    })
  })
}
```

---

## 📁 File Structure:

```
backend/
├── app/
│   ├── api/v1/
│   │   └── emails.py          ← API endpoints
│   └── services/
│       └── email_service.py   ← Email logic & templates
├── .env                        ← Resend API key
└── requirements.txt            ← Added 'requests'

frontend/
├── .env.local                  ← Resend key (for reference)
└── src/lib/
    └── emailUtils.js           ← (Create this for frontend triggers)
```

---

## 🔗 Quick Links:

- **Resend Dashboard:** https://resend.com/emails
- **Domain Setup:** https://resend.com/domains
- **API Docs:** https://resend.com/docs
- **Backend API Docs:** http://localhost:8000/docs

---

## ✅ Next Steps:

1. **Verify Domain** on Resend (5 min)
2. **Test Email Endpoint** (2 min):
   ```bash
   cd backend
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```
3. **Send Test Invite** (1 min):
   ```bash
   curl -X POST http://localhost:8000/api/v1/emails/invite-investor \
     -H "Content-Type: application/json" \
     -d '{
       "to_email": "your-email@gmail.com",
       "investor_name": "Test User",
       "invite_url": "http://localhost:5173"
     }'
   ```

4. **Check Inbox** - You should receive a beautiful branded email!

---

## 🎉 You're All Set!

Your email system is ready:
- ✅ Professional templates
- ✅ API endpoints
- ✅ Resend integration
- ✅ Error handling
- ✅ Logging

**Start sending invites!**

