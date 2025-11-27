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

import logging
import os
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Pipedream Connect API endpoints
PIPEDREAM_API_BASE = "https://api.pipedream.com/v1"


class PipedreamService:
    """
    Service for Pipedream Connect integration.

    Provides:
    - Connect token generation for OAuth flows
    - Account status checking
    - Proxy requests through Pipedream
    """

    # Supported apps with their Pipedream app slugs
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
        self.client_id = getattr(settings, "PIPEDREAM_CLIENT_ID", "")
        self.client_secret = getattr(settings, "PIPEDREAM_CLIENT_SECRET", "")
        self.environment = settings.PIPEDREAM_ENVIRONMENT
        self.webhook_secret = settings.PIPEDREAM_WEBHOOK_SECRET

        # OAuth token caching
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[float] = None

    @property
    def is_configured(self) -> bool:
        """Check if Pipedream credentials are configured"""
        return bool(self.project_id and self.client_id and self.client_secret)

    async def _get_oauth_token(self) -> str:
        """
        Get OAuth access token using client credentials flow.

        Pipedream requires exchanging client_id + client_secret for an access token,
        then using that token as Bearer auth for all API calls.
        """
        import time

        # Return cached token if still valid (with 2 min buffer)
        if self._access_token and self._token_expires_at and time.time() < (self._token_expires_at - 120):
            return self._access_token

        logger.debug("Fetching new Pipedream OAuth token")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{PIPEDREAM_API_BASE}/oauth/token",
                json={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
                headers={
                    "Content-Type": "application/json",
                    "x-pd-environment": self.environment,
                },
                timeout=10,
            )

            if response.status_code != 200:
                logger.error(f"Failed to get OAuth token: {response.status_code} {response.text}")
                raise Exception(f"Failed to get OAuth token: {response.status_code}")

            data = response.json()
            self._access_token = data.get("access_token")
            self._token_expires_at = time.time() + data.get("expires_in", 3600)

            logger.info("Successfully obtained Pipedream OAuth token")
            return self._access_token

    async def _get_auth_headers(self) -> dict[str, str]:
        """Get authentication headers using OAuth2 client credentials flow."""
        access_token = await self._get_oauth_token()
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
            "x-pd-environment": self.environment,
        }

    async def create_connect_token(
        self,
        external_user_id: str,
        app: str,
        redirect_uri: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Create a connect token for client-side OAuth initialization.

        Args:
            external_user_id: Your app's user ID (maps to Pipedream external user)
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

        # Build payload for Pipedream Connect token creation
        # Include the app slug so Pipedream knows which OAuth flow to initiate
        # Environment is required - use the configured environment or default to "production"
        environment = os.getenv("PIPEDREAM_ENVIRONMENT", "production")

        payload = {
            "external_user_id": external_user_id,
            "app": app_config["slug"],  # e.g., "quickbooks", "stripe"
            "environment": environment,  # Required: "development" or "production"
        }

        # Get OAuth headers
        headers = await self._get_auth_headers()

        # Use the correct endpoint: /v1/connect/{projectId}/tokens
        endpoint = f"{PIPEDREAM_API_BASE}/connect/{self.project_id}/tokens"

        try:
            async with httpx.AsyncClient() as client:
                logger.debug(f"Creating connect token at: {endpoint}")
                response = await client.post(
                    endpoint,
                    headers=headers,
                    json=payload,
                    timeout=15,
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

                logger.error(f"Pipedream token creation failed: {response.status_code} {response.text[:500]}")
                raise Exception(f"Failed to create connect token: {response.status_code}: {response.text[:200]}")

        except httpx.TimeoutException:
            logger.error("Pipedream token creation timed out")
            raise Exception("Pipedream API timeout")
        except Exception as e:
            logger.error(f"Pipedream token creation error: {e}")
            raise

    async def get_account(self, account_id: str) -> Optional[dict[str, Any]]:
        """
        Get details for a connected account.

        Args:
            account_id: Pipedream account ID

        Returns:
            Account details or None if not found
        """
        if not self.is_configured:
            return None

        headers = await self._get_auth_headers()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PIPEDREAM_API_BASE}/connect/accounts/{account_id}",
                headers=headers,
            )

            if response.status_code == 404:
                return None

            if response.status_code != 200:
                logger.error(f"Failed to get account: {response.status_code}")
                return None

            return response.json()

    async def get_accounts_for_user(
        self,
        external_user_id: Optional[str] = None,
        app: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """
        Get connected accounts from Pipedream.

        Args:
            external_user_id: Optional user ID filter (if None, fetches all accounts in project)
            app: Optional app filter

        Returns:
            List of connected accounts
        """
        if not self.is_configured:
            logger.warning("Pipedream not configured, cannot fetch accounts")
            return []

        # Build query params
        params = {}
        if external_user_id:
            params["external_user_id"] = external_user_id
        if app:
            params["app"] = app

        headers = await self._get_auth_headers()

        # Correct endpoint: /v1/connect/{project_id}/accounts
        url = f"{PIPEDREAM_API_BASE}/connect/{self.project_id}/accounts"

        logger.info(f"Fetching accounts from Pipedream: {url} (filter: {params or 'none'})")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=headers,
                params=params if params else None,
                timeout=15,
            )

            if response.status_code != 200:
                logger.error(f"Failed to get accounts: {response.status_code} - {response.text}")
                return []

            data = response.json()
            accounts = data.get("data", data.get("accounts", []))
            logger.info(f"Found {len(accounts)} connected accounts in Pipedream")
            return accounts

    async def delete_account(self, account_id: str) -> bool:
        """
        Delete/disconnect an account.

        Args:
            account_id: Pipedream account ID

        Returns:
            True if deleted successfully
        """
        if not self.is_configured:
            return False

        headers = await self._get_auth_headers()
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{PIPEDREAM_API_BASE}/connect/accounts/{account_id}",
                headers=headers,
            )

            if response.status_code in [200, 204]:
                logger.info(f"Deleted account {account_id}")
                return True

            logger.error(f"Failed to delete account: {response.status_code}")
            return False

    async def get_account_credentials(self, account_id: str) -> Optional[dict[str, Any]]:
        """
        Get OAuth credentials for an account (for direct API calls).

        Args:
            account_id: Pipedream account ID

        Returns:
            Dict with access_token, refresh_token, etc.
        """
        if not self.is_configured:
            return None

        headers = await self._get_auth_headers()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PIPEDREAM_API_BASE}/connect/accounts/{account_id}/credentials",
                headers=headers,
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
    ) -> dict[str, Any]:
        """
        Make an authenticated API request through Pipedream's proxy.

        Pipedream handles token refresh and authentication automatically.

        Args:
            account_id: Pipedream account ID
            method: HTTP method
            url: Full URL of the target API endpoint
            data: Request body data
            params: Query parameters

        Returns:
            API response data
        """
        if not self.is_configured:
            raise ValueError("Pipedream credentials not configured")

        headers = await self._get_auth_headers()
        async with httpx.AsyncClient() as client:
            response = await client.request(
                "POST",
                f"{PIPEDREAM_API_BASE}/connect/proxy",
                headers=headers,
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

    async def test_connection(self, account_id: str, app: str) -> dict[str, Any]:
        """
        Test if a connection is working by making a simple API call.

        Args:
            account_id: Pipedream account ID
            app: App slug

        Returns:
            Dict with status and any error message
        """
        try:
            account = await self.get_account(account_id)
            if not account:
                return {"status": "error", "message": "Account not found"}

            # App-specific test endpoints
            test_endpoints = {
                "quickbooks": "https://quickbooks.api.intuit.com/v3/company/{realm_id}/companyinfo/{realm_id}",
                "stripe": "https://api.stripe.com/v1/balance",
                "google_sheets": "https://www.googleapis.com/drive/v3/about?fields=user",
                "slack": "https://slack.com/api/auth.test",
            }

            if app not in test_endpoints:
                return {"status": "unknown", "message": f"No test endpoint for {app}"}

            # For QuickBooks, we need the realm_id from account metadata
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

    def get_supported_apps(self) -> list[dict[str, Any]]:
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
