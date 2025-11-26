"""
Tests for MRR (Monthly Recurring Revenue) calculations.

These tests ensure that interval_count is correctly applied across all billing intervals.
They serve as regression tests to prevent future developers from reverting to incorrect
calculations that ignore multi-period billing (e.g., quarterly, bi-weekly, every 2 years).

Key invariant: MRR = (billing_amount / billing_period_in_months) / interval_count

Examples:
- $1200/year billed yearly (interval_count=1): MRR = $1200 / 12 / 1 = $100
- $1200/year billed every 2 years (interval_count=2): MRR = $1200 / 12 / 2 = $50
- $300/quarter (interval_count=3): MRR = $300 / 3 = $100
- $100/week billed weekly (interval_count=1): MRR = $100 * 52 / 12 / 1 = $433.33
- $100/week billed bi-weekly (interval_count=2): MRR = $100 * 52 / 12 / 2 = $216.67
"""

import pytest

from app.services.stripe_service import StripeService


def make_subscription(amount_cents: int, interval: str, interval_count: int = 1) -> dict:
    """
    Create a mock subscription for testing MRR calculations.
    
    Args:
        amount_cents: Price in cents (e.g., 99900 for $999.00)
        interval: Billing interval ('month', 'year', 'week', 'day')
        interval_count: Number of intervals between bills (e.g., 3 for quarterly)
    
    Returns:
        Mock subscription dict matching Stripe API format
    """
    return {
        "id": f"sub_test_{interval}_{interval_count}",
        "customer": "cus_test123",
        "status": "active",
        "items": [
            {
                "id": "si_test",
                "price": f"price_{interval}_{interval_count}",
                "amount": amount_cents,
                "interval": interval,
                "interval_count": interval_count,
            }
        ],
        "current_period_start": 1700000000,
        "current_period_end": 1702592000,
    }


class TestMonthlyBillingMRR:
    """Tests for monthly billing interval with various interval_counts"""

    @pytest.mark.asyncio
    async def test_monthly_standard(self):
        """Monthly billing (interval_count=1) should equal the amount"""
        # $999/month billed monthly -> MRR = $999
        sub = make_subscription(99900, "month", interval_count=1)
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(999.00, rel=0.01)

    @pytest.mark.asyncio
    async def test_monthly_quarterly(self):
        """Quarterly billing (interval_count=3) should divide by 3"""
        # $2997 billed every 3 months -> MRR = $2997 / 3 = $999
        sub = make_subscription(299700, "month", interval_count=3)
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(999.00, rel=0.01)

    @pytest.mark.asyncio
    async def test_monthly_semiannual(self):
        """Semi-annual billing (interval_count=6) should divide by 6"""
        # $5994 billed every 6 months -> MRR = $5994 / 6 = $999
        sub = make_subscription(599400, "month", interval_count=6)
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(999.00, rel=0.01)

    @pytest.mark.asyncio
    async def test_monthly_bimonthly(self):
        """Bi-monthly billing (interval_count=2) should divide by 2"""
        # $500 billed every 2 months -> MRR = $500 / 2 = $250
        sub = make_subscription(50000, "month", interval_count=2)
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(250.00, rel=0.01)


class TestYearlyBillingMRR:
    """
    Tests for yearly billing interval with various interval_counts.
    
    CRITICAL: These tests catch the bug where yearly subscriptions ignored interval_count.
    A subscription billed every 2 years should have half the MRR of one billed annually.
    """

    @pytest.mark.asyncio
    async def test_yearly_standard(self):
        """Annual billing (interval_count=1) should divide by 12"""
        # $11988/year billed yearly -> MRR = $11988 / 12 = $999
        sub = make_subscription(1198800, "year", interval_count=1)
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(999.00, rel=0.01)

    @pytest.mark.asyncio
    async def test_yearly_biennial(self):
        """
        Biennial billing (every 2 years, interval_count=2) should divide by 24.
        
        BUG REGRESSION TEST: Previously, yearly subscriptions ignored interval_count,
        causing a subscription billed every 2 years to show 2x the correct MRR.
        """
        # $23976 billed every 2 years -> MRR = $23976 / 12 / 2 = $999
        sub = make_subscription(2397600, "year", interval_count=2)
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(999.00, rel=0.01)

    @pytest.mark.asyncio
    async def test_yearly_triennial(self):
        """Triennial billing (every 3 years) should divide by 36"""
        # $35964 billed every 3 years -> MRR = $35964 / 12 / 3 = $999
        sub = make_subscription(3596400, "year", interval_count=3)
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(999.00, rel=0.01)


class TestWeeklyBillingMRR:
    """
    Tests for weekly billing interval with various interval_counts.
    
    Weekly MRR formula: (amount * 52 weeks / 12 months) / interval_count
    
    CRITICAL: These tests catch the bug where weekly subscriptions ignored interval_count.
    A bi-weekly subscription should have half the MRR of a weekly one.
    """

    @pytest.mark.asyncio
    async def test_weekly_standard(self):
        """Weekly billing (interval_count=1) should use 52 weeks / 12 months"""
        # $100/week billed weekly -> MRR = $100 * 52 / 12 = $433.33
        sub = make_subscription(10000, "week", interval_count=1)
        mrr = await StripeService.calculate_mrr([sub])
        expected = (100 * 52) / 12  # $433.33
        assert mrr == pytest.approx(expected, rel=0.01)

    @pytest.mark.asyncio
    async def test_weekly_biweekly(self):
        """
        Bi-weekly billing (interval_count=2) should divide the weekly MRR by 2.
        
        BUG REGRESSION TEST: Previously, weekly subscriptions ignored interval_count,
        causing bi-weekly subscriptions to show 2x the correct MRR.
        """
        # $100/bi-weekly -> MRR = $100 * 52 / 12 / 2 = $216.67
        sub = make_subscription(10000, "week", interval_count=2)
        mrr = await StripeService.calculate_mrr([sub])
        expected = (100 * 52) / 12 / 2  # $216.67
        assert mrr == pytest.approx(expected, rel=0.01)

    @pytest.mark.asyncio
    async def test_weekly_every_four_weeks(self):
        """Every 4 weeks billing should divide by 4"""
        # $400/every 4 weeks -> MRR = $400 * 52 / 12 / 4 = $433.33
        sub = make_subscription(40000, "week", interval_count=4)
        mrr = await StripeService.calculate_mrr([sub])
        expected = (400 * 52) / 12 / 4  # $433.33
        assert mrr == pytest.approx(expected, rel=0.01)


class TestDailyBillingMRR:
    """
    Tests for daily billing interval with various interval_counts.
    
    Daily MRR formula: (amount * 30 days) / interval_count
    
    CRITICAL: These tests catch the bug where daily subscriptions ignored interval_count.
    """

    @pytest.mark.asyncio
    async def test_daily_standard(self):
        """Daily billing (interval_count=1) should multiply by 30"""
        # $10/day billed daily -> MRR = $10 * 30 = $300
        sub = make_subscription(1000, "day", interval_count=1)
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(300.00, rel=0.01)

    @pytest.mark.asyncio
    async def test_daily_every_other_day(self):
        """
        Every-other-day billing (interval_count=2) should divide by 2.
        
        BUG REGRESSION TEST: Previously, daily subscriptions ignored interval_count.
        """
        # $10 every 2 days -> MRR = $10 * 30 / 2 = $150
        sub = make_subscription(1000, "day", interval_count=2)
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(150.00, rel=0.01)

    @pytest.mark.asyncio
    async def test_daily_every_seven_days(self):
        """Every 7 days billing should divide by 7 (roughly weekly via day interval)"""
        # $70 every 7 days -> MRR = $70 * 30 / 7 = $300
        sub = make_subscription(7000, "day", interval_count=7)
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(300.00, rel=0.01)


class TestMixedSubscriptionsMRR:
    """Tests for calculating MRR across multiple subscriptions with different intervals"""

    @pytest.mark.asyncio
    async def test_mixed_intervals(self):
        """MRR should sum correctly across different billing intervals"""
        subscriptions = [
            make_subscription(99900, "month", interval_count=1),     # $999/month -> MRR $999
            make_subscription(1198800, "year", interval_count=1),   # $11988/year -> MRR $999
            make_subscription(299700, "month", interval_count=3),   # $2997/quarter -> MRR $999
        ]
        mrr = await StripeService.calculate_mrr(subscriptions)
        assert mrr == pytest.approx(2997.00, rel=0.01)

    @pytest.mark.asyncio
    async def test_mixed_with_interval_counts(self):
        """MRR should correctly apply interval_count across all intervals"""
        subscriptions = [
            make_subscription(50000, "month", interval_count=1),    # $500/month -> MRR $500
            make_subscription(1200000, "year", interval_count=2),   # $12000/2years -> MRR $500
            make_subscription(23100, "week", interval_count=2),     # $231/bi-weekly -> MRR ~$500
        ]
        mrr = await StripeService.calculate_mrr(subscriptions)
        # $500 + $500 + ($231 * 52 / 12 / 2) = $500 + $500 + $500.50 ≈ $1500.50
        expected = 500 + 500 + (231 * 52 / 12 / 2)
        assert mrr == pytest.approx(expected, rel=0.01)

    @pytest.mark.asyncio
    async def test_zero_amount_subscriptions_ignored(self):
        """Subscriptions with $0 amount should not affect MRR"""
        subscriptions = [
            make_subscription(99900, "month", interval_count=1),  # $999/month
            make_subscription(0, "month", interval_count=1),      # Free trial
            make_subscription(0, "year", interval_count=1),       # Free tier
        ]
        mrr = await StripeService.calculate_mrr(subscriptions)
        assert mrr == pytest.approx(999.00, rel=0.01)

    @pytest.mark.asyncio
    async def test_empty_subscriptions_list(self):
        """Empty subscription list should return 0 MRR"""
        mrr = await StripeService.calculate_mrr([])
        assert mrr == 0.0


class TestMultiItemSubscriptionMRR:
    """Tests for subscriptions with multiple line items"""

    @pytest.mark.asyncio
    async def test_multiple_items_same_interval(self):
        """Multiple items in one subscription should sum correctly"""
        sub = {
            "id": "sub_multi",
            "customer": "cus_test",
            "status": "active",
            "items": [
                {"id": "si_1", "price": "price_1", "amount": 50000, "interval": "month", "interval_count": 1},
                {"id": "si_2", "price": "price_2", "amount": 30000, "interval": "month", "interval_count": 1},
                {"id": "si_3", "price": "price_3", "amount": 20000, "interval": "month", "interval_count": 1},
            ],
            "current_period_start": 1700000000,
            "current_period_end": 1702592000,
        }
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(1000.00, rel=0.01)  # $500 + $300 + $200

    @pytest.mark.asyncio
    async def test_multiple_items_different_intervals(self):
        """Multiple items with different intervals should normalize correctly"""
        sub = {
            "id": "sub_multi_interval",
            "customer": "cus_test",
            "status": "active",
            "items": [
                {"id": "si_1", "price": "price_1", "amount": 50000, "interval": "month", "interval_count": 1},
                {"id": "si_2", "price": "price_2", "amount": 600000, "interval": "year", "interval_count": 1},
            ],
            "current_period_start": 1700000000,
            "current_period_end": 1702592000,
        }
        mrr = await StripeService.calculate_mrr([sub])
        # $500/month + $6000/year = $500 + $500 = $1000
        assert mrr == pytest.approx(1000.00, rel=0.01)


class TestEdgeCases:
    """Edge cases and boundary conditions"""

    @pytest.mark.asyncio
    async def test_missing_interval_count_defaults_to_one(self):
        """Missing interval_count should default to 1"""
        sub = {
            "id": "sub_no_interval_count",
            "customer": "cus_test",
            "status": "active",
            "items": [
                {"id": "si_1", "price": "price_1", "amount": 99900, "interval": "month"},
                # Note: interval_count is missing
            ],
            "current_period_start": 1700000000,
            "current_period_end": 1702592000,
        }
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(999.00, rel=0.01)

    @pytest.mark.asyncio
    async def test_null_interval_count_defaults_to_one(self):
        """Null interval_count should default to 1"""
        sub = {
            "id": "sub_null_interval_count",
            "customer": "cus_test",
            "status": "active",
            "items": [
                {"id": "si_1", "price": "price_1", "amount": 99900, "interval": "month", "interval_count": None},
            ],
            "current_period_start": 1700000000,
            "current_period_end": 1702592000,
        }
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(999.00, rel=0.01)

    @pytest.mark.asyncio
    async def test_large_interval_count(self):
        """Large interval_count should still calculate correctly"""
        # $120000 billed every 10 years -> MRR = $120000 / 12 / 10 = $1000
        sub = make_subscription(12000000, "year", interval_count=10)
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(1000.00, rel=0.01)

    @pytest.mark.asyncio
    async def test_fractional_mrr_rounded(self):
        """MRR should be rounded to 2 decimal places"""
        # $100/year -> MRR = $100 / 12 = $8.333...
        sub = make_subscription(10000, "year", interval_count=1)
        mrr = await StripeService.calculate_mrr([sub])
        assert mrr == pytest.approx(8.33, rel=0.01)


class TestACVCalculations:
    """Tests for ACV (Annual Contract Value) calculations with interval_count"""

    @pytest.mark.asyncio
    async def test_acv_yearly_standard(self):
        """Annual billing ACV should equal the amount"""
        sub = make_subscription(1200000, "year", interval_count=1)  # $12000/year
        acv = await StripeService.calculate_acv([sub])
        assert acv == pytest.approx(12000.00, rel=0.01)

    @pytest.mark.asyncio
    async def test_acv_yearly_biennial(self):
        """
        Biennial billing ACV should divide by interval_count.
        
        BUG REGRESSION TEST: ACV for multi-year subscriptions should be annualized.
        """
        sub = make_subscription(2400000, "year", interval_count=2)  # $24000/2years
        acv = await StripeService.calculate_acv([sub])
        assert acv == pytest.approx(12000.00, rel=0.01)  # $24000 / 2 = $12000/year

    @pytest.mark.asyncio
    async def test_acv_monthly_with_interval_count(self):
        """Monthly billing ACV should multiply by 12 and divide by interval_count"""
        sub = make_subscription(300000, "month", interval_count=3)  # $3000/quarter
        acv = await StripeService.calculate_acv([sub])
        # $3000/quarter * 4 quarters = $12000/year
        assert acv == pytest.approx(12000.00, rel=0.01)

    @pytest.mark.asyncio
    async def test_acv_daily_with_interval_count(self):
        """Daily billing ACV should multiply by 365 and divide by interval_count"""
        sub = make_subscription(6575, "day", interval_count=2)  # $65.75/every 2 days
        acv = await StripeService.calculate_acv([sub])
        # $65.75 * 365 / 2 = $11999.38 ≈ $12000
        expected = (65.75 * 365) / 2
        assert acv == pytest.approx(expected, rel=0.01)

