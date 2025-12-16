"""
Tests for Pydantic models in app/models/
"""

from datetime import datetime

import pytest
from pydantic import ValidationError

from app.models.metrics import (
    CACMetrics,
    ChurnMetrics,
    ComprehensiveMetrics,
    CustomerMetrics,
    FinancialMetrics,
    LTVMetrics,
    RevenueMetrics,
)


class TestCustomerMetrics:
    """Tests for CustomerMetrics model"""

    def test_valid_customer_metrics(self):
        """Test creating valid customer metrics"""
        metrics = CustomerMetrics(
            total_customers=100,
            towpilot_customers=80,
            other_customers=20,
            mrr=50000.0,
            arr=600000.0,
        )
        assert metrics.total_customers == 100
        assert metrics.towpilot_customers == 80
        assert metrics.other_customers == 20
        assert metrics.mrr == 50000.0
        assert metrics.arr == 600000.0

    def test_customer_metrics_zero_values(self):
        """Test customer metrics with zero values"""
        metrics = CustomerMetrics(
            total_customers=0,
            towpilot_customers=0,
            other_customers=0,
            mrr=0.0,
            arr=0.0,
        )
        assert metrics.total_customers == 0
        assert metrics.mrr == 0.0

    def test_customer_metrics_invalid_type(self):
        """Test that invalid types raise validation errors"""
        with pytest.raises(ValidationError):
            CustomerMetrics(
                total_customers="not_a_number",
                towpilot_customers=0,
                other_customers=0,
                mrr=0.0,
                arr=0.0,
            )


class TestCACMetrics:
    """Tests for CACMetrics model"""

    def test_valid_cac_metrics(self):
        """Test creating valid CAC metrics"""
        metrics = CACMetrics(
            total_cac=500.0,
            sales_cost=300.0,
            marketing_cost=200.0,
            cac_breakdown_percentage={"sales": 60, "marketing": 40},
        )
        assert metrics.total_cac == 500.0
        assert metrics.sales_cost == 300.0
        assert metrics.marketing_cost == 200.0
        assert metrics.cac_breakdown_percentage["sales"] == 60

    def test_cac_metrics_empty_breakdown(self):
        """Test CAC metrics with empty breakdown"""
        metrics = CACMetrics(
            total_cac=0.0,
            sales_cost=0.0,
            marketing_cost=0.0,
            cac_breakdown_percentage={},
        )
        assert metrics.cac_breakdown_percentage == {}


class TestLTVMetrics:
    """Tests for LTVMetrics model"""

    def test_valid_ltv_metrics(self):
        """Test creating valid LTV metrics"""
        metrics = LTVMetrics(
            average_ltv=5000.0,
            ltv_cac_ratio=10.0,
            cac_payback_months=6.0,
        )
        assert metrics.average_ltv == 5000.0
        assert metrics.ltv_cac_ratio == 10.0
        assert metrics.cac_payback_months == 6.0

    def test_ltv_metrics_high_ratio(self):
        """Test LTV metrics with high LTV:CAC ratio"""
        metrics = LTVMetrics(
            average_ltv=50000.0,
            ltv_cac_ratio=100.0,
            cac_payback_months=1.0,
        )
        assert metrics.ltv_cac_ratio == 100.0


class TestRevenueMetrics:
    """Tests for RevenueMetrics model"""

    def test_valid_revenue_metrics(self):
        """Test creating valid revenue metrics"""
        metrics = RevenueMetrics(
            total_revenue=100000.0,
            mrr=8333.33,
            arr=100000.0,
            growth_rate=15.5,
            monthly_data=[
                {"month": "Jan", "revenue": 8000},
                {"month": "Feb", "revenue": 8333},
            ],
        )
        assert metrics.total_revenue == 100000.0
        assert metrics.growth_rate == 15.5
        assert len(metrics.monthly_data) == 2

    def test_revenue_metrics_negative_growth(self):
        """Test revenue metrics with negative growth rate"""
        metrics = RevenueMetrics(
            total_revenue=80000.0,
            mrr=6666.67,
            arr=80000.0,
            growth_rate=-10.0,
            monthly_data=[],
        )
        assert metrics.growth_rate == -10.0

    def test_revenue_metrics_empty_monthly_data(self):
        """Test revenue metrics with empty monthly data"""
        metrics = RevenueMetrics(
            total_revenue=0.0,
            mrr=0.0,
            arr=0.0,
            growth_rate=0.0,
            monthly_data=[],
        )
        assert metrics.monthly_data == []


class TestChurnMetrics:
    """Tests for ChurnMetrics model"""

    def test_valid_churn_metrics(self):
        """Test creating valid churn metrics"""
        metrics = ChurnMetrics(
            customer_churn_rate=5.0,
            revenue_churn_rate=3.0,
            net_retention_rate=105.0,
        )
        assert metrics.customer_churn_rate == 5.0
        assert metrics.revenue_churn_rate == 3.0
        assert metrics.net_retention_rate == 105.0

    def test_churn_metrics_optional_nrr(self):
        """Test churn metrics without net retention rate"""
        metrics = ChurnMetrics(
            customer_churn_rate=5.0,
            revenue_churn_rate=3.0,
        )
        assert metrics.net_retention_rate is None

    def test_churn_metrics_zero_churn(self):
        """Test churn metrics with zero churn (ideal scenario)"""
        metrics = ChurnMetrics(
            customer_churn_rate=0.0,
            revenue_churn_rate=0.0,
            net_retention_rate=120.0,
        )
        assert metrics.customer_churn_rate == 0.0


class TestFinancialMetrics:
    """Tests for FinancialMetrics model"""

    def test_valid_financial_metrics(self):
        """Test creating valid financial metrics"""
        metrics = FinancialMetrics(
            gross_margin=70.0,
            gross_margin_trend=[
                {"month": "Jan", "margin": 68.0},
                {"month": "Feb", "margin": 70.0},
            ],
            burn_rate=50000.0,
            runway_months=18.0,
        )
        assert metrics.gross_margin == 70.0
        assert metrics.burn_rate == 50000.0
        assert metrics.runway_months == 18.0
        assert len(metrics.gross_margin_trend) == 2

    def test_financial_metrics_low_runway(self):
        """Test financial metrics with low runway"""
        metrics = FinancialMetrics(
            gross_margin=50.0,
            gross_margin_trend=[],
            burn_rate=100000.0,
            runway_months=3.0,
        )
        assert metrics.runway_months == 3.0


class TestComprehensiveMetrics:
    """Tests for ComprehensiveMetrics model"""

    def test_valid_comprehensive_metrics(self):
        """Test creating valid comprehensive metrics"""
        metrics = ComprehensiveMetrics(
            timestamp=datetime.now(),
            customer_metrics=CustomerMetrics(
                total_customers=100,
                towpilot_customers=80,
                other_customers=20,
                mrr=50000.0,
                arr=600000.0,
            ),
            revenue_metrics=RevenueMetrics(
                total_revenue=600000.0,
                mrr=50000.0,
                arr=600000.0,
                growth_rate=25.0,
                monthly_data=[],
            ),
            cac_metrics=CACMetrics(
                total_cac=500.0,
                sales_cost=300.0,
                marketing_cost=200.0,
                cac_breakdown_percentage={},
            ),
            ltv_metrics=LTVMetrics(
                average_ltv=5000.0,
                ltv_cac_ratio=10.0,
                cac_payback_months=6.0,
            ),
            churn_metrics=ChurnMetrics(
                customer_churn_rate=5.0,
                revenue_churn_rate=3.0,
            ),
            financial_metrics=FinancialMetrics(
                gross_margin=70.0,
                gross_margin_trend=[],
                burn_rate=50000.0,
                runway_months=12.0,
            ),
        )
        assert metrics.customer_metrics.total_customers == 100
        assert metrics.revenue_metrics.growth_rate == 25.0
        assert metrics.ltv_metrics.ltv_cac_ratio == 10.0

    def test_comprehensive_metrics_serialization(self):
        """Test that comprehensive metrics can be serialized to dict"""
        metrics = ComprehensiveMetrics(
            timestamp=datetime(2025, 1, 1, 12, 0, 0),
            customer_metrics=CustomerMetrics(
                total_customers=50,
                towpilot_customers=40,
                other_customers=10,
                mrr=25000.0,
                arr=300000.0,
            ),
            revenue_metrics=RevenueMetrics(
                total_revenue=300000.0,
                mrr=25000.0,
                arr=300000.0,
                growth_rate=10.0,
                monthly_data=[],
            ),
            cac_metrics=CACMetrics(
                total_cac=250.0,
                sales_cost=150.0,
                marketing_cost=100.0,
                cac_breakdown_percentage={},
            ),
            ltv_metrics=LTVMetrics(
                average_ltv=2500.0,
                ltv_cac_ratio=10.0,
                cac_payback_months=3.0,
            ),
            churn_metrics=ChurnMetrics(
                customer_churn_rate=2.5,
                revenue_churn_rate=1.5,
            ),
            financial_metrics=FinancialMetrics(
                gross_margin=65.0,
                gross_margin_trend=[],
                burn_rate=25000.0,
                runway_months=24.0,
            ),
        )
        data = metrics.model_dump()
        assert "timestamp" in data
        assert "customer_metrics" in data
        assert data["customer_metrics"]["total_customers"] == 50
