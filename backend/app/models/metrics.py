from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CustomerMetrics(BaseModel):
    total_customers: int
    towpilot_customers: int
    other_customers: int
    mrr: float
    arr: float


class CACMetrics(BaseModel):
    total_cac: float
    sales_cost: float
    marketing_cost: float
    cac_breakdown_percentage: dict


class LTVMetrics(BaseModel):
    average_ltv: float
    ltv_cac_ratio: float
    cac_payback_months: float


class RevenueMetrics(BaseModel):
    total_revenue: float
    mrr: float
    arr: float
    growth_rate: float
    monthly_data: List[dict]


class ChurnMetrics(BaseModel):
    customer_churn_rate: float
    revenue_churn_rate: float
    net_retention_rate: Optional[float] = None


class FinancialMetrics(BaseModel):
    gross_margin: float
    gross_margin_trend: List[dict]
    burn_rate: float
    runway_months: float


class ComprehensiveMetrics(BaseModel):
    timestamp: datetime
    customer_metrics: CustomerMetrics
    revenue_metrics: RevenueMetrics
    cac_metrics: CACMetrics
    ltv_metrics: LTVMetrics
    churn_metrics: ChurnMetrics
    financial_metrics: FinancialMetrics

