"""
Pipedream Connect Service

Handles OAuth flows via Pipedream Connect for external integrations.
Pipedream manages token storage, refresh, and provides a unified API
for accessing connected accounts.

Flow:
1. Create a connect token (server-side)
2. Client uses token to open OAuth popup
3. After auth, Pipedream stores credentials
4. We store the account_id reference in Supabase
5. Use Pipedream's proxy API to make authenticated requests
"""

import base64
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Pipedream Connect API endpoints
PIPEDREAM_API_BASE = "https://api.pipedream.com/v1"
PIPEDREAM_CONNECT_BASE = "https://api.pipedream.com/v1/connect"


class PipedreamService:
    """
    Service for Pipedream Connect integration.

    Provides:
    - Connect token generation for OAuth flows
    - Account status checking
    - Proxy requests through Pipedream
    """

    SUPPORTED_APPS = {
        "quickbooks": {
            "slug": "quickbooks",
            "name": "QuickBooks Online",
            "description": "Accounting and financial data",
            "icon": "📊",
            "scopes": ["com.intuit.quickbooks.accounting"],
        },
        "stripe": {
            "slug": "stripe",
            "name": "Stripe",
            "description": "Payment processing and subscriptions",
            "icon": "💳",
            "scopes": ["read_write"],
        },
        "google_sheets": {
            "slug": "google_sheets",
            "name": "Google Sheets",
            "description": "Export reports to spreadsheets",
            "icon": "📑",
            "scopes": ["https://www.googleapis.com/auth/spreadsheets"],
        },
        "slack": {
            "slug": "slack",
            "name": "Slack",
            "description": "Notifications and alerts",
            "icon": "💬",
            "scopes": ["chat:write", "channels:read"],
        },
    }

    def __init__(self):
        self.project_id = settings.PIPEDREAM_PROJECT_ID
        self.client_id = getattr(settings, 'PIPEDREAM_CLIENT_ID', '')
        self.client_secret = getattr(settings, 'PIPEDREAM_CLIENT_SECRET', '')
        self.environment = settings.PIPEDREAM_ENVIRONMENT
        self.webhook_secret = settings.PIPEDREAM_WEBHOOK_SECRET

    @property
    def is_configured(self) -> bool:
        """Check if Pipedream credentials are configured"""
        return bool(self.project_id and self.client_secret)

    def _get_auth_headers(self) -> dict[str, str]:
        """Get authentication headers for Pipedream API."""
        headers = {
            "Content-Type": "application/json",
            "X-PD-Environment": self.environment,
        }

        if self.client_id and self.client_secret:
            credentials = base64.b64encode(
                f"{self.client_id}:{self.client_secret}".encode()
            ).decode()
            headers["Authorization"] = f"Basic {credentials}"
        elif self.client_secret:
            headers["Authorization"] = f"Bearer {self.client_secret}"

        return headers

    async def create_connect_token(
        self,
        external_user_id: str,
        app: str,
        redirect_uri: Optional[str] = None,
    ) -> dict:
        """
        Create a connect token for client-side OAuth initialization.

        Args:
            external_user_id: Your app's user ID
            app: App slug (e.g., 'quickbooks', 'stripe')
            redirect_uri: Where to redirect after OAuth completes

        Returns:
            Dict with token, expires_at, and connect_link_url
        """
        if not self.is_configured:
            raise ValueError("Pipedream credentials not configured")

        if app not in self.SUPPORTED_APPS:
            raise ValueError(f"Unsupported app: {app}. Supported: {list(self.SUPPORTED_APPS.keys())}")

        app_config = self.SUPPORTED_APPS[app]

        payload = {
            "external_user_id": external_user_id,
            "app": app_config["slug"],
        }

        if redirect_uri:
            payload["success_redirect_uri"] = redirect_uri
            payload["error_redirect_uri"] = redirect_uri

        if self.project_id:
            payload["project_id"] = self.project_id

        headers = self._get_auth_headers()

        endpoints_to_try = [
            f"{PIPEDREAM_API_BASE}/connect/tokens",
            f"{PIPEDREAM_API_BASE}/connect/{self.project_id}/tokens" if self.project_id else None,
            f"https://api.pipedream.com/v1/projects/{self.project_id}/connect/tokens" if self.project_id else None,
        ]

        last_error = None
        for endpoint in endpoints_to_try:
            if not endpoint:
                continue

            try:
                async with httpx.AsyncClient() as client:
                    logger.debug(f"Trying Pipedream endpoint: {endpoint}")
                    response = await client.post(
                        endpoint,
                        headers=headers,
                        json=payload,
                    )

                    if response.status_code == 200:
                        data = response.json()
                        logger.info(f"Created connect token for {app} (user: {external_user_id})")
                        return {
                            "token": data.get("token"),
                            "expires_at": data.get("expires_at"),
                            "connect_link_url": data.get("connect_link_url"),
                            "app": app,
                            "app_name": app_config["name"],
                        }

                    logger.debug(f"Endpoint {endpoint} returned {response.status_code}: {response.text[:200]}")
                    last_error = f"{response.status_code}: {response.text[:200]}"

            except Exception as e:
                logger.debug(f"Endpoint {endpoint} failed: {e}")
                last_error = str(e)
                continue

        logger.error(f"All Pipedream endpoints failed. Last error: {last_error}")
        raise Exception(f"Failed to create connect token: {last_error}")

    async def get_account(self, account_id: str) -> Optional[dict]:
        """Get details for a connected account."""
        if not self.is_configured:
            return None

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PIPEDREAM_API_BASE}/connect/accounts/{account_id}",
                headers=self._get_auth_headers(),
            )

            if response.status_code == 404:
                return None

            if response.status_code != 200:
                logger.error(f"Failed to get account: {response.status_code}")
                return None

            return response.json()

    async def get_accounts_for_user(
        self,
        external_user_id: str,
        app: Optional[str] = None,
    ) -> list[dict]:
        """Get all connected accounts for an external user."""
        if not self.is_configured:
            return []

        params = {"external_user_id": external_user_id}
        if app:
            params["app"] = app

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PIPEDREAM_API_BASE}/connect/accounts",
                headers=self._get_auth_headers(),
                params=params,
            )

            if response.status_code != 200:
                logger.error(f"Failed to get accounts: {response.status_code}")
                return []

            data = response.json()
            return data.get("data", [])

    async def delete_account(self, account_id: str) -> bool:
        """Delete/disconnect an account."""
        if not self.is_configured:
            return False

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{PIPEDREAM_API_BASE}/connect/accounts/{account_id}",
                headers=self._get_auth_headers(),
            )

            if response.status_code in [200, 204]:
                logger.info(f"Deleted account {account_id}")
                return True

            logger.error(f"Failed to delete account: {response.status_code}")
            return False

    async def get_account_credentials(self, account_id: str) -> Optional[dict]:
        """Get OAuth credentials for an account (for direct API calls)."""
        if not self.is_configured:
            return None

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PIPEDREAM_API_BASE}/connect/accounts/{account_id}/credentials",
                headers=self._get_auth_headers(),
            )

            if response.status_code != 200:
                logger.error(f"Failed to get credentials: {response.status_code}")
                return None

            return response.json()

    async def proxy_request(
        self,
        account_id: str,
        method: str,
        url: str,
        data: Optional[dict] = None,
        params: Optional[dict] = None,
    ) -> dict:
        """Make an authenticated API request through Pipedream's proxy."""
        if not self.is_configured:
            raise ValueError("Pipedream credentials not configured")

        async with httpx.AsyncClient() as client:
            response = await client.request(
                "POST",
                f"{PIPEDREAM_API_BASE}/connect/proxy",
                headers=self._get_auth_headers(),
                json={
                    "account_id": account_id,
                    "method": method,
                    "url": url,
                    "data": data,
                    "params": params,
                },
            )

            if response.status_code != 200:
                logger.error(f"Proxy request failed: {response.status_code} - {response.text}")
                raise Exception(f"Proxy request failed: {response.status_code}")

            return response.json()

    async def test_connection(self, account_id: str, app: str) -> dict:
        """Test if a connection is working by making a simple API call."""
        try:
            account = await self.get_account(account_id)
            if not account:
                return {"status": "error", "message": "Account not found"}

            test_endpoints = {
                "quickbooks": "https://quickbooks.api.intuit.com/v3/company/{realm_id}/companyinfo/{realm_id}",
                "stripe": "https://api.stripe.com/v1/balance",
                "google_sheets": "https://www.googleapis.com/drive/v3/about?fields=user",
                "slack": "https://slack.com/api/auth.test",
            }

            if app not in test_endpoints:
                return {"status": "unknown", "message": f"No test endpoint for {app}"}

            url = test_endpoints[app]
            if app == "quickbooks":
                realm_id = account.get("credentials", {}).get("realm_id")
                if realm_id:
                    url = url.format(realm_id=realm_id)
                else:
                    return {"status": "error", "message": "Missing realm_id"}

            result = await self.proxy_request(
                account_id=account_id,
                method="GET",
                url=url,
            )

            return {
                "status": "connected",
                "message": "Connection successful",
                "data": result,
            }

        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return {
                "status": "error",
                "message": str(e),
            }

    def get_supported_apps(self) -> list[dict]:
        """Get list of supported integrations with metadata"""
        return [
            {
                "id": app_id,
                **config,
            }
            for app_id, config in self.SUPPORTED_APPS.items()
        ]


# Singleton instance
pipedream_service = PipedreamService()
