"""
QuickBooks Online API Service

Handles OAuth 2.0 authentication and data fetching from QuickBooks Online.
Provides P&L reports, payroll data, and other financial metrics.

Supports two authentication modes:
1. Direct OAuth (legacy) - requires QUICKBOOKS_CLIENT_ID/SECRET in env
2. Pipedream Connect (preferred) - uses Pipedream-managed OAuth tokens

QuickBooks OAuth Flow (Direct):
1. User clicks "Connect QuickBooks" → redirect to Intuit's authorization page
2. User authorizes → Intuit redirects back with authorization code
3. Exchange code for access/refresh tokens
4. Store tokens in Supabase for future requests
5. Auto-refresh tokens when they expire

Pipedream Connect Flow:
1. User connects via Pipedream OAuth popup
2. Pipedream stores and refreshes tokens
3. We fetch tokens via Pipedream API when needed
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Optional
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.services.metrics_cache_service import MetricsCacheService

logger = logging.getLogger(__name__)

# QuickBooks API endpoints
QB_OAUTH_BASE_URL = "https://appcenter.intuit.com/connect/oauth2"
QB_API_BASE_URL = "https://quickbooks.api.intuit.com/v3/company"
QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"

# For sandbox/development
QB_SANDBOX_API_BASE_URL = "https://sandbox-quickbooks.api.intuit.com/v3/company"


class QuickBooksService:
    """
    Service for QuickBooks Online API integration.

    Handles:
    - OAuth 2.0 authentication flow (direct or via Pipedream)
    - Token storage and refresh
    - P&L report fetching
    - Payroll data fetching
    - Bank account balances
    """

    def __init__(self):
        self.client_id = getattr(settings, 'QUICKBOOKS_CLIENT_ID', None)
        self.client_secret = getattr(settings, 'QUICKBOOKS_CLIENT_SECRET', None)
        self.redirect_uri = getattr(settings, 'QUICKBOOKS_REDIRECT_URI', None)
        self.realm_id = getattr(settings, 'QUICKBOOKS_REALM_ID', None)
        self.use_sandbox = getattr(settings, 'QUICKBOOKS_USE_SANDBOX', True)

        self._access_token: Optional[str] = None
        self._refresh_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

        # Pipedream connection info (loaded lazily)
        self._pipedream_account_id: Optional[str] = None

    @property
    def is_configured(self) -> bool:
        """Check if QuickBooks credentials are configured (direct OAuth)"""
        return all([
            self.client_id,
            self.client_secret,
            self.redirect_uri,
        ])

    @property
    def pipedream_configured(self) -> bool:
        """Check if Pipedream Connect is configured"""
        return bool(settings.PIPEDREAM_PROJECT_ID and settings.PIPEDREAM_CLIENT_SECRET)

    async def _get_pipedream_connection(self) -> Optional[dict[str, Any]]:
        """
        Get QuickBooks connection from Pipedream via Supabase.

        Returns:
            Connection dict if found and active, None otherwise
        """
        try:
            from supabase import create_client

            if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
                return None

            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

            result = (
                supabase.table("pipedream_connections")
                .select("*")
                .eq("app", "quickbooks")
                .eq("status", "active")
                .limit(1)
                .execute()
            )

            if result.data:
                conn = result.data[0]
                self._pipedream_account_id = conn.get("account_id")
                return conn

            return None

        except Exception as e:
            logger.error(f"Error getting Pipedream connection: {e}")
            return None

    async def _get_tokens_from_pipedream(self) -> bool:
        """
        Fetch OAuth tokens from Pipedream Connect.

        Returns:
            True if tokens were successfully fetched
        """
        if not self.pipedream_configured:
            return False

        try:
            from app.services.pipedream_service import pipedream_service

            # Get connection info
            conn = await self._get_pipedream_connection()
            if not conn:
                logger.debug("No active Pipedream QuickBooks connection found")
                return False

            account_id = conn.get("account_id")
            if not account_id:
                return False

            # Get credentials from Pipedream
            creds = await pipedream_service.get_account_credentials(account_id)
            if not creds:
                logger.warning("Failed to get credentials from Pipedream")
                return False

            # Extract tokens
            oauth_token = creds.get("oauth_access_token") or creds.get("access_token")
            if oauth_token:
                self._access_token = oauth_token
                self._refresh_token = creds.get("oauth_refresh_token") or creds.get("refresh_token")

                # Set expiry to 1 hour from now (Pipedream handles refresh)
                self._token_expires_at = datetime.now() + timedelta(hours=1)

                # Get realm_id from credentials or account metadata
                self.realm_id = (
                    creds.get("realm_id") or
                    creds.get("realmId") or
                    conn.get("metadata", {}).get("realm_id") or
                    self.realm_id
                )

                logger.info("✅ Loaded QuickBooks tokens from Pipedream")
                return True

            return False

        except Exception as e:
            logger.error(f"Error fetching tokens from Pipedream: {e}")
            return False

    @property
    def api_base_url(self) -> str:
        """Get the appropriate API base URL based on environment"""
        if self.use_sandbox:
            return QB_SANDBOX_API_BASE_URL
        return QB_API_BASE_URL

    def get_authorization_url(self, state: str = None) -> str:
        """
        Generate the OAuth authorization URL for user to authorize QuickBooks access.

        Args:
            state: Optional state parameter for CSRF protection

        Returns:
            URL to redirect user to for authorization
        """
        if not self.is_configured:
            raise ValueError("QuickBooks credentials not configured")

        params = {
            'client_id': self.client_id,
            'scope': 'com.intuit.quickbooks.accounting',
            'redirect_uri': self.redirect_uri,
            'response_type': 'code',
            'state': state or 'default',
        }

        return f"{QB_OAUTH_BASE_URL}?{urlencode(params)}"

    async def exchange_code_for_tokens(self, code: str) -> dict[str, Any]:
        """
        Exchange authorization code for access and refresh tokens.

        Args:
            code: Authorization code from QuickBooks OAuth callback

        Returns:
            Dict with access_token, refresh_token, and expires_in
        """
        if not self.is_configured:
            raise ValueError("QuickBooks credentials not configured")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                QB_TOKEN_URL,
                data={
                    'grant_type': 'authorization_code',
                    'code': code,
                    'redirect_uri': self.redirect_uri,
                },
                auth=(self.client_id, self.client_secret),
                headers={'Accept': 'application/json'},
            )

            if response.status_code != 200:
                logger.error(f"Token exchange failed: {response.text}")
                raise Exception(f"Token exchange failed: {response.status_code}")

            data = response.json()

            # Store tokens
            self._access_token = data['access_token']
            self._refresh_token = data['refresh_token']
            self._token_expires_at = datetime.now() + timedelta(seconds=data['expires_in'])

            # Store in database for persistence
            await self._store_tokens(data)

            logger.info("✅ QuickBooks tokens obtained successfully")
            return data

    async def refresh_access_token(self) -> dict[str, Any]:
        """
        Refresh the access token using the refresh token.

        Returns:
            Dict with new access_token, refresh_token, and expires_in
        """
        if not self._refresh_token:
            await self._load_tokens()

        if not self._refresh_token:
            raise Exception("No refresh token available. Please re-authorize.")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                QB_TOKEN_URL,
                data={
                    'grant_type': 'refresh_token',
                    'refresh_token': self._refresh_token,
                },
                auth=(self.client_id, self.client_secret),
                headers={'Accept': 'application/json'},
            )

            if response.status_code != 200:
                logger.error(f"Token refresh failed: {response.text}")
                raise Exception(f"Token refresh failed: {response.status_code}")

            data = response.json()

            # Update tokens
            self._access_token = data['access_token']
            self._refresh_token = data['refresh_token']
            self._token_expires_at = datetime.now() + timedelta(seconds=data['expires_in'])

            # Store updated tokens
            await self._store_tokens(data)

            logger.info("✅ QuickBooks tokens refreshed successfully")
            return data

    async def _store_tokens(self, token_data: dict[str, Any]) -> None:
        """Store tokens in metrics_cache table"""
        await MetricsCacheService.save_metrics(
            metric_type="quickbooks_tokens",
            data={
                "access_token": token_data['access_token'],
                "refresh_token": token_data['refresh_token'],
                "expires_in": token_data['expires_in'],
                "token_type": token_data.get('token_type', 'bearer'),
                "realm_id": self.realm_id,
            },
            source="quickbooks"
        )

    async def _load_tokens(self) -> bool:
        """
        Load tokens from available sources.

        Priority:
        1. Pipedream Connect (if configured and connected)
        2. Direct OAuth tokens from cache

        Returns:
            True if tokens were loaded successfully
        """
        # Try Pipedream first (preferred method)
        if self.pipedream_configured and await self._get_tokens_from_pipedream():
            return True

        # Fall back to cached direct OAuth tokens
        cached = await MetricsCacheService.get_latest_metrics("quickbooks_tokens")
        if cached and cached.get('data'):
            data = cached['data']
            self._access_token = data.get('access_token')
            self._refresh_token = data.get('refresh_token')
            if data.get('expires_in'):
                # Estimate expiry based on when it was cached
                fetched_at = datetime.fromisoformat(cached['fetched_at'].replace('Z', '+00:00'))
                self._token_expires_at = fetched_at + timedelta(seconds=data['expires_in'])
            self.realm_id = data.get('realm_id') or self.realm_id
            logger.info("✅ Loaded QuickBooks tokens from cache")
            return True

        return False

    async def _ensure_valid_token(self) -> str:
        """
        Ensure we have a valid access token, refreshing if necessary.

        For Pipedream connections, tokens are refreshed by Pipedream automatically.
        For direct OAuth, we handle refresh ourselves.

        Returns:
            Valid access token

        Raises:
            Exception if no tokens available
        """
        if not self._access_token:
            await self._load_tokens()

        if not self._access_token:
            raise Exception(
                "No QuickBooks tokens available. Please connect QuickBooks via the Integrations page."
            )

        # Check if token is expired or about to expire (within 5 minutes)
        if self._token_expires_at and datetime.now() > self._token_expires_at - timedelta(minutes=5):
            # If using Pipedream, re-fetch tokens (Pipedream handles refresh)
            if self._pipedream_account_id:
                if not await self._get_tokens_from_pipedream():
                    raise Exception("Failed to refresh QuickBooks tokens from Pipedream")
            else:
                # Direct OAuth - refresh ourselves
                await self.refresh_access_token()

        return self._access_token

    async def _api_request(
        self,
        method: str,
        endpoint: str,
        params: dict[str, Any] = None,
    ) -> dict[str, Any]:
        """
        Make an authenticated API request to QuickBooks.

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (after /company/{realm_id})
            params: Query parameters

        Returns:
            JSON response data
        """
        access_token = await self._ensure_valid_token()

        if not self.realm_id:
            raise Exception("QuickBooks realm_id not configured")

        url = f"{self.api_base_url}/{self.realm_id}/{endpoint}"

        async with httpx.AsyncClient() as client:
            response = await client.request(
                method,
                url,
                params=params,
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            )

            if response.status_code == 401:
                # Token might be expired, try refreshing
                await self.refresh_access_token()
                access_token = self._access_token

                # Retry the request
                response = await client.request(
                    method,
                    url,
                    params=params,
                    headers={
                        'Authorization': f'Bearer {access_token}',
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                )

            if response.status_code != 200:
                logger.error(f"QuickBooks API error: {response.status_code} - {response.text}")
                raise Exception(f"QuickBooks API error: {response.status_code}")

            return response.json()

    async def get_profit_and_loss(
        self,
        start_date: str = None,
        end_date: str = None,
        accounting_method: str = "Accrual",
    ) -> dict[str, Any]:
        """
        Fetch Profit & Loss report from QuickBooks.

        Args:
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            accounting_method: 'Accrual' or 'Cash'

        Returns:
            P&L report data
        """
        # Default to current year if no dates provided
        if not start_date:
            start_date = f"{datetime.now().year}-01-01"
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")

        params = {
            'start_date': start_date,
            'end_date': end_date,
            'accounting_method': accounting_method,
        }

        data = await self._api_request('GET', 'reports/ProfitAndLoss', params)

        # Cache the result
        await MetricsCacheService.save_metrics(
            metric_type="quickbooks_pl",
            data=data,
            source="quickbooks"
        )

        return data

    async def get_profit_and_loss_ytd(self) -> dict[str, Any]:
        """
        Get Year-to-Date Profit & Loss summary.

        Returns:
            Summarized P&L with key metrics
        """
        start_date = f"{datetime.now().year}-01-01"
        end_date = datetime.now().strftime("%Y-%m-%d")

        pl_data = await self.get_profit_and_loss(start_date, end_date)

        # Parse and summarize the P&L data
        summary = self._parse_pl_report(pl_data)

        return {
            "period": f"{start_date} to {end_date}",
            "summary": summary,
            "raw_data": pl_data,
            "timestamp": datetime.now().isoformat(),
        }

    def _parse_pl_report(self, pl_data: dict[str, Any]) -> dict[str, Any]:
        """
        Parse QuickBooks P&L report into a summary format.

        Args:
            pl_data: Raw P&L report from QuickBooks API

        Returns:
            Summarized P&L data
        """
        # Default structure
        summary = {
            "total_revenue": 0,
            "total_cogs": 0,
            "gross_profit": 0,
            "total_expenses": 0,
            "net_income": 0,
            "line_items": {
                "revenue": [],
                "cogs": [],
                "expenses": [],
            },
        }

        try:
            # QuickBooks P&L structure varies, this handles the common format
            rows = pl_data.get('Rows', {}).get('Row', [])

            for row in rows:
                row_type = row.get('type', '')
                header = row.get('Header', {})

                if row_type == 'Section':
                    group_name = header.get('ColData', [{}])[0].get('value', '')

                    # Parse section rows
                    section_rows = row.get('Rows', {}).get('Row', [])
                    for section_row in section_rows:
                        col_data = section_row.get('ColData', [])
                        if len(col_data) >= 2:
                            item_name = col_data[0].get('value', '')
                            item_value = float(col_data[1].get('value', 0) or 0)

                            if 'Income' in group_name or 'Revenue' in group_name:
                                summary['line_items']['revenue'].append({
                                    'name': item_name,
                                    'value': item_value,
                                })
                                summary['total_revenue'] += item_value
                            elif 'Cost of' in group_name:
                                summary['line_items']['cogs'].append({
                                    'name': item_name,
                                    'value': item_value,
                                })
                                summary['total_cogs'] += item_value
                            elif 'Expense' in group_name:
                                summary['line_items']['expenses'].append({
                                    'name': item_name,
                                    'value': item_value,
                                })
                                summary['total_expenses'] += item_value

            summary['gross_profit'] = summary['total_revenue'] - summary['total_cogs']
            summary['net_income'] = summary['gross_profit'] - summary['total_expenses']

        except Exception as e:
            logger.error(f"Error parsing P&L report: {e}")

        return summary

    async def get_payroll_summary(
        self,
        start_date: str = None,
        end_date: str = None,
    ) -> dict[str, Any]:
        """
        Get payroll/labor cost summary.

        Note: QuickBooks Online doesn't have a direct payroll API.
        We estimate labor from expense categories.

        Args:
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format

        Returns:
            Payroll summary data
        """
        pl_data = await self.get_profit_and_loss(start_date, end_date)
        summary = self._parse_pl_report(pl_data)

        # Filter labor-related expenses
        labor_keywords = ['payroll', 'salary', 'salaries', 'wages', 'contractor', 'employee']
        labor_items = [
            item for item in summary['line_items']['expenses']
            if any(kw in item['name'].lower() for kw in labor_keywords)
        ]

        total_labor = sum(item['value'] for item in labor_items)

        return {
            "period": f"{start_date or 'YTD'} to {end_date or 'now'}",
            "total_labor": total_labor,
            "labor_items": labor_items,
            "labor_as_pct_of_revenue": (total_labor / summary['total_revenue'] * 100) if summary['total_revenue'] > 0 else 0,
            "timestamp": datetime.now().isoformat(),
        }

    async def get_account_balances(self) -> dict[str, Any]:
        """
        Fetch all bank and cash account balances from QuickBooks.

        Queries the Account endpoint for Bank and Other Current Asset accounts.

        Returns:
            Dict with accounts list and total balance
        """
        # QuickBooks uses SQL-like query syntax
        query = "SELECT * FROM Account WHERE AccountType IN ('Bank', 'Other Current Asset')"

        try:
            data = await self._api_request('GET', 'query', {'query': query})

            accounts = []
            total_balance = 0.0

            # Parse the QueryResponse
            query_response = data.get('QueryResponse', {})
            account_list = query_response.get('Account', [])

            for account in account_list:
                account_name = account.get('Name', 'Unknown')
                current_balance = float(account.get('CurrentBalance', 0) or 0)
                account_type = account.get('AccountType', '')
                account_subtype = account.get('AccountSubType', '')

                accounts.append({
                    'id': account.get('Id'),
                    'name': account_name,
                    'type': account_type,
                    'subtype': account_subtype,
                    'balance': current_balance,
                    'currency': account.get('CurrencyRef', {}).get('value', 'USD'),
                    'active': account.get('Active', True),
                })

                # Only sum positive balances for bank accounts
                if account_type == 'Bank':
                    total_balance += current_balance

            result = {
                'accounts': accounts,
                'total_bank_balance': round(total_balance, 2),
                'account_count': len(accounts),
                'timestamp': datetime.now().isoformat(),
            }

            # Cache the result
            await MetricsCacheService.save_metrics(
                metric_type="quickbooks_account_balances",
                data=result,
                source="quickbooks"
            )

            return result

        except Exception as e:
            logger.error(f"Error fetching account balances: {e}")
            # Try to return cached data
            cached = await MetricsCacheService.get_latest_metrics("quickbooks_account_balances")
            if cached:
                return {
                    **cached.get('data', {}),
                    'is_cached': True,
                    'cache_timestamp': cached.get('fetched_at'),
                }
            raise

    async def get_bank_accounts_summary(self) -> dict[str, Any]:
        """
        Get a summary of bank account balances grouped by type.

        Returns:
            Dict with checking, savings, and other account totals
        """
        balances = await self.get_account_balances()
        accounts = balances.get('accounts', [])

        # Group by subtype
        checking_total = 0.0
        savings_total = 0.0
        other_total = 0.0

        checking_accounts = []
        savings_accounts = []
        other_accounts = []

        for account in accounts:
            subtype = account.get('subtype', '').lower()
            balance = account.get('balance', 0)

            if 'checking' in subtype:
                checking_total += balance
                checking_accounts.append(account)
            elif 'savings' in subtype or 'money market' in subtype:
                savings_total += balance
                savings_accounts.append(account)
            else:
                other_total += balance
                other_accounts.append(account)

        return {
            'checking': {
                'total': round(checking_total, 2),
                'accounts': checking_accounts,
            },
            'savings': {
                'total': round(savings_total, 2),
                'accounts': savings_accounts,
            },
            'other': {
                'total': round(other_total, 2),
                'accounts': other_accounts,
            },
            'grand_total': round(checking_total + savings_total + other_total, 2),
            'timestamp': datetime.now().isoformat(),
        }

    async def get_accounts_receivable(self) -> dict[str, Any]:
        """
        Get accounts receivable summary (money owed to the company).

        Returns:
            Dict with AR balance and aging if available
        """
        query = "SELECT * FROM Account WHERE AccountType = 'Accounts Receivable'"

        try:
            data = await self._api_request('GET', 'query', {'query': query})

            query_response = data.get('QueryResponse', {})
            ar_accounts = query_response.get('Account', [])

            total_ar = 0.0
            accounts = []

            for account in ar_accounts:
                balance = float(account.get('CurrentBalance', 0) or 0)
                total_ar += balance
                accounts.append({
                    'id': account.get('Id'),
                    'name': account.get('Name'),
                    'balance': balance,
                })

            return {
                'total_receivable': round(total_ar, 2),
                'accounts': accounts,
                'timestamp': datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error fetching accounts receivable: {e}")
            return {
                'total_receivable': 0,
                'accounts': [],
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
            }

    async def get_accounts_payable(self) -> dict[str, Any]:
        """
        Get accounts payable summary (money the company owes).

        Returns:
            Dict with AP balance
        """
        query = "SELECT * FROM Account WHERE AccountType = 'Accounts Payable'"

        try:
            data = await self._api_request('GET', 'query', {'query': query})

            query_response = data.get('QueryResponse', {})
            ap_accounts = query_response.get('Account', [])

            total_ap = 0.0
            accounts = []

            for account in ap_accounts:
                balance = float(account.get('CurrentBalance', 0) or 0)
                total_ap += balance
                accounts.append({
                    'id': account.get('Id'),
                    'name': account.get('Name'),
                    'balance': balance,
                })

            return {
                'total_payable': round(total_ap, 2),
                'accounts': accounts,
                'timestamp': datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error fetching accounts payable: {e}")
            return {
                'total_payable': 0,
                'accounts': [],
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
            }

    async def get_cash_position(self) -> dict[str, Any]:
        """
        Get comprehensive cash position including bank balances, AR, and AP.

        Returns:
            Dict with complete cash position summary
        """
        try:
            # Fetch all components in parallel would be ideal, but for simplicity:
            bank_summary = await self.get_bank_accounts_summary()
            ar_summary = await self.get_accounts_receivable()
            ap_summary = await self.get_accounts_payable()

            total_cash = bank_summary.get('grand_total', 0)
            total_ar = ar_summary.get('total_receivable', 0)
            total_ap = ap_summary.get('total_payable', 0)

            # Net cash position = cash + receivables - payables
            net_position = total_cash + total_ar - total_ap

            result = {
                'cash_on_hand': total_cash,
                'accounts_receivable': total_ar,
                'accounts_payable': total_ap,
                'net_cash_position': round(net_position, 2),
                'bank_accounts': bank_summary,
                'ar_details': ar_summary,
                'ap_details': ap_summary,
                'timestamp': datetime.now().isoformat(),
            }

            # Cache the result
            await MetricsCacheService.save_metrics(
                metric_type="quickbooks_cash_position",
                data=result,
                source="quickbooks"
            )

            return result

        except Exception as e:
            logger.error(f"Error fetching cash position: {e}")
            # Try cached data
            cached = await MetricsCacheService.get_latest_metrics("quickbooks_cash_position")
            if cached:
                return {
                    **cached.get('data', {}),
                    'is_cached': True,
                    'cache_timestamp': cached.get('fetched_at'),
                }
            raise


# Singleton instance
quickbooks_service = QuickBooksService()

