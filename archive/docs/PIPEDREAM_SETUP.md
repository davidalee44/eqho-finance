# Pipedream Connect Integration Guide

Complete guide to integrate Pipedream Connect for API connections in your investor deck.

---

## 🎯 Overview

Pipedream Connect lets you integrate Stripe and other APIs directly into your app, allowing users to connect their accounts securely.

**Use Cases:**
- Connect investor Stripe accounts to view their metrics
- Sync financial data automatically
- Real-time updates from connected services

---

## Step 1: Create Pipedream Project

1. Go to [pipedream.com](https://pipedream.com)
2. Create account / Sign in
3. Go to **"Projects"** → **"Create Project"**
4. Name: `eqho-investor-deck`

---

## Step 2: Set Up Connect Component

### From Pipedream Dashboard:

1. Go to **"Connect"** tab
2. Click **"New Connection"**
3. Select **"Stripe"** as the app to connect

### Configuration (from your screenshot):

```yaml
External User ID: investor-{{user_id}}
Environment: production
Show optional fields: ✓

Webhook URI: https://api.eqho.ai/api/v1/webhooks/pipedream
Success Redirect URI: https://financis.eqho.ai/connect/success
Error Redirect URI: https://financis.eqho.ai/connect/error
```

### Get Connect Token:

1. After creating connection, copy the **Connect Token**
2. Save for environment variables

---

## Step 3: Backend Integration

### Update Backend Environment

Add to `backend/.env`:

```bash
# Pipedream Configuration
PIPEDREAM_CONNECT_TOKEN=pc_xxx_your_token_here
PIPEDREAM_PROJECT_ID=proj_xxx
PIPEDREAM_ENVIRONMENT=production

# Webhook Configuration
PIPEDREAM_WEBHOOK_SECRET=whsec_xxx_your_secret
```

### Create Webhook Endpoint

Create `backend/app/api/v1/webhooks.py`:

```python
from fastapi import APIRouter, HTTPException, Header, Request
from app.core.config import settings
import hmac
import hashlib

router = APIRouter()


@router.post("/pipedream")
async def pipedream_webhook(
    request: Request,
    x_pipedream_signature: str = Header(None)
):
    """
    Receive Pipedream Connect webhook events
    
    Events:
    - account.connected
    - account.disconnected
    - account.error
    """
    body = await request.body()
    
    # Verify signature
    if not verify_signature(body, x_pipedream_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    data = await request.json()
    event_type = data.get("type")
    
    if event_type == "account.connected":
        # Handle successful connection
        user_id = data.get("external_user_id")
        account_id = data.get("account_id")
        
        # Store connection in database
        await store_connection(user_id, account_id, data)
        
        return {"status": "success", "message": "Account connected"}
    
    elif event_type == "account.disconnected":
        # Handle disconnection
        user_id = data.get("external_user_id")
        await remove_connection(user_id)
        
        return {"status": "success", "message": "Account disconnected"}
    
    elif event_type == "account.error":
        # Handle errors
        error = data.get("error")
        # Log error, notify user
        
        return {"status": "error", "message": str(error)}
    
    return {"status": "received"}


def verify_signature(payload: bytes, signature: str) -> bool:
    """Verify Pipedream webhook signature"""
    if not settings.PIPEDREAM_WEBHOOK_SECRET:
        return True  # Skip verification in development
    
    expected_signature = hmac.new(
        settings.PIPEDREAM_WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)


async def store_connection(user_id: str, account_id: str, data: dict):
    """Store Pipedream connection in database"""
    from app.services.mongodb_service import MongoDBService
    
    if MongoDBService.db:
        await MongoDBService.db.pipedream_connections.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "user_id": user_id,
                    "account_id": account_id,
                    "provider": data.get("provider"),
                    "connected_at": data.get("connected_at"),
                    "metadata": data.get("metadata", {}),
                }
            },
            upsert=True
        )


async def remove_connection(user_id: str):
    """Remove Pipedream connection from database"""
    from app.services.mongodb_service import MongoDBService
    
    if MongoDBService.db:
        await MongoDBService.db.pipedream_connections.delete_one(
            {"user_id": user_id}
        )
```

### Register Webhook Router

Add to `backend/app/main.py`:

```python
from app.api.v1 import webhooks

app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["webhooks"])
```

---

## Step 4: Frontend Integration

### Install Pipedream Connect SDK

```bash
npm install @pipedream/sdk
```

### Create Connect Component

Create `src/components/PipedreamConnect.jsx`:

```jsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const PIPEDREAM_CONFIG = {
  token: import.meta.env.VITE_PIPEDREAM_CONNECT_TOKEN,
  environment: import.meta.env.VITE_PIPEDREAM_ENVIRONMENT || 'production',
};

export function PipedreamConnect({ userId, onSuccess, onError }) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);

    try {
      // Generate Connect Link URL
      const connectUrl = `https://connect.pipedream.com/oauth/accounts/new?` +
        `token=${PIPEDREAM_CONFIG.token}&` +
        `external_user_id=${userId}&` +
        `environment=${PIPEDREAM_CONFIG.environment}&` +
        `webhook_uri=${encodeURIComponent(window.location.origin + '/api/webhooks/pipedream')}&` +
        `success_redirect_uri=${encodeURIComponent(window.location.origin + '/connect/success')}&` +
        `error_redirect_uri=${encodeURIComponent(window.location.origin + '/connect/error')}`;

      // Open in popup
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const popup = window.open(
        connectUrl,
        'Pipedream Connect',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for success/error
      const handleMessage = (event) => {
        if (event.data.type === 'pipedream_connect_success') {
          setConnected(true);
          setConnecting(false);
          popup?.close();
          onSuccess?.(event.data);
        } else if (event.data.type === 'pipedream_connect_error') {
          setConnecting(false);
          popup?.close();
          onError?.(event.data.error);
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          setConnecting(false);
          window.removeEventListener('message', handleMessage);
        }
      }, 500);
    } catch (error) {
      setConnecting(false);
      onError?.(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Your Stripe Account</CardTitle>
        <CardDescription>
          Securely connect your Stripe account to view real-time metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connected ? (
          <div className="flex items-center gap-2 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Connected</span>
          </div>
        ) : (
          <Button 
            onClick={handleConnect} 
            disabled={connecting}
            className="w-full"
          >
            {connecting ? 'Connecting...' : 'Connect Stripe Account'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

### Create Success/Error Pages

Create `src/pages/ConnectSuccess.jsx`:

```jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ConnectSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // Send message to parent window
    if (window.opener) {
      window.opener.postMessage(
        { type: 'pipedream_connect_success' },
        window.location.origin
      );
    }

    // Redirect after 2 seconds
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="text-green-600">Successfully Connected!</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Your Stripe account has been connected. Redirecting...</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

Create `src/pages/ConnectError.jsx`:

```jsx
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ConnectError() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error') || 'Unknown error occurred';

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'pipedream_connect_error', error },
        window.location.origin
      );
    }
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="text-red-600">Connection Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>{error}</p>
          <Button onClick={() => window.close()} variant="outline" className="w-full">
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Step 5: Environment Variables

### Development (.env.local)

```bash
VITE_PIPEDREAM_CONNECT_TOKEN=pc_xxx_dev_token
VITE_PIPEDREAM_ENVIRONMENT=development
VITE_PIPEDREAM_WEBHOOK_URL=http://localhost:8000/api/v1/webhooks/pipedream
```

### Production (Vercel)

Set in Vercel Dashboard → Environment Variables:

```bash
VITE_PIPEDREAM_CONNECT_TOKEN=pc_xxx_prod_token
VITE_PIPEDREAM_ENVIRONMENT=production
VITE_PIPEDREAM_WEBHOOK_URL=https://api.eqho.ai/api/v1/webhooks/pipedream
```

---

## Step 6: MongoDB Schema for Connections

Add to `backend/app/models/pipedream.py`:

```python
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime


class PipedreamConnection(BaseModel):
    user_id: str
    account_id: str
    provider: str  # 'stripe'
    connected_at: datetime
    metadata: Dict
    status: str = "active"  # active, disconnected, error
```

---

## Step 7: Testing

### Test Connection Flow

```bash
# 1. Start backend
cd backend && uvicorn app.main:app --reload

# 2. Start frontend
npm run dev

# 3. Open browser
open http://localhost:5173

# 4. Click "Connect Stripe Account"
# 5. Complete OAuth flow
# 6. Verify webhook received
```

### Test Webhook

```bash
# Send test webhook
curl -X POST http://localhost:8000/api/v1/webhooks/pipedream \
  -H "Content-Type: application/json" \
  -H "X-Pipedream-Signature: test_signature" \
  -d '{
    "type": "account.connected",
    "external_user_id": "investor-123",
    "account_id": "acct_xxx",
    "provider": "stripe",
    "connected_at": "2025-11-12T12:00:00Z"
  }'
```

---

## 🔒 Security Best Practices

1. **Webhook Signature Verification**: Always verify webhooks
2. **HTTPS Only**: Use HTTPS in production
3. **Environment Separation**: Use different tokens for dev/prod
4. **User Isolation**: Store connections per user
5. **Error Handling**: Log errors, don't expose secrets

---

## 📊 Monitoring

### Track Connection Events

```python
# backend/app/services/analytics.py
async def track_connection_event(event_type: str, user_id: str, metadata: dict):
    """Track Pipedream connection events for analytics"""
    await MongoDBService.db.connection_events.insert_one({
        "event_type": event_type,
        "user_id": user_id,
        "timestamp": datetime.now(),
        "metadata": metadata
    })
```

---

## ✅ Checklist

- [ ] Pipedream project created
- [ ] Connect component configured
- [ ] Backend webhook endpoint created
- [ ] Frontend connect component added
- [ ] Success/error pages created
- [ ] Environment variables set
- [ ] MongoDB collection for connections
- [ ] Webhook signature verification implemented
- [ ] Testing complete
- [ ] Production deployment

---

## 📞 Support

- **Pipedream Docs**: https://pipedream.com/docs/connect
- **Pipedream Community**: https://pipedream.com/community
- **Support**: support@pipedream.com

**Status**: Ready to integrate! 🔗

