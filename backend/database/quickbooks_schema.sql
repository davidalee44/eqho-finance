-- QuickBooks Integration Schema
-- Run this in Supabase SQL Editor to create tables for QB data

-- Sync status tracking
CREATE TABLE IF NOT EXISTS qb_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'full', 'pl', 'balance_sheet', 'cash_flow', 'invoices', 'team'
  status TEXT NOT NULL, -- 'pending', 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  records_processed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profit & Loss data
CREATE TABLE IF NOT EXISTS qb_profit_loss (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Revenue
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  revenue_breakdown JSONB, -- {"product_sales": 10000, "service_revenue": 5000}

  -- Cost of Goods Sold
  total_cogs DECIMAL(15, 2) DEFAULT 0,
  cogs_breakdown JSONB,

  -- Gross Profit
  gross_profit DECIMAL(15, 2) DEFAULT 0,
  gross_margin_percent DECIMAL(5, 2),

  -- Operating Expenses
  total_operating_expenses DECIMAL(15, 2) DEFAULT 0,
  operating_expenses_breakdown JSONB, -- {"salaries": 20000, "marketing": 5000, "rent": 3000}

  -- Net Income
  net_income DECIMAL(15, 2) DEFAULT 0,
  net_margin_percent DECIMAL(5, 2),

  -- Raw QB data
  qb_raw_data JSONB,

  sync_id UUID REFERENCES qb_sync_status(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, period_start, period_end)
);

-- Balance Sheet data
CREATE TABLE IF NOT EXISTS qb_balance_sheet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  as_of_date DATE NOT NULL,

  -- Assets
  total_assets DECIMAL(15, 2) DEFAULT 0,
  current_assets DECIMAL(15, 2) DEFAULT 0,
  cash_and_equivalents DECIMAL(15, 2) DEFAULT 0,
  accounts_receivable DECIMAL(15, 2) DEFAULT 0,
  fixed_assets DECIMAL(15, 2) DEFAULT 0,
  assets_breakdown JSONB,

  -- Liabilities
  total_liabilities DECIMAL(15, 2) DEFAULT 0,
  current_liabilities DECIMAL(15, 2) DEFAULT 0,
  accounts_payable DECIMAL(15, 2) DEFAULT 0,
  long_term_debt DECIMAL(15, 2) DEFAULT 0,
  liabilities_breakdown JSONB,

  -- Equity
  total_equity DECIMAL(15, 2) DEFAULT 0,
  equity_breakdown JSONB,

  -- Raw QB data
  qb_raw_data JSONB,

  sync_id UUID REFERENCES qb_sync_status(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, as_of_date)
);

-- Cash Flow data
CREATE TABLE IF NOT EXISTS qb_cash_flow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Operating Activities
  cash_from_operations DECIMAL(15, 2) DEFAULT 0,
  operating_activities_breakdown JSONB,

  -- Investing Activities
  cash_from_investing DECIMAL(15, 2) DEFAULT 0,
  investing_activities_breakdown JSONB,

  -- Financing Activities
  cash_from_financing DECIMAL(15, 2) DEFAULT 0,
  financing_activities_breakdown JSONB,

  -- Net Change
  net_cash_change DECIMAL(15, 2) DEFAULT 0,
  beginning_cash DECIMAL(15, 2) DEFAULT 0,
  ending_cash DECIMAL(15, 2) DEFAULT 0,

  -- Raw QB data
  qb_raw_data JSONB,

  sync_id UUID REFERENCES qb_sync_status(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, period_start, period_end)
);

-- Invoices and Payments
CREATE TABLE IF NOT EXISTS qb_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qb_invoice_id TEXT NOT NULL,

  -- Invoice details
  invoice_number TEXT,
  customer_name TEXT,
  customer_id TEXT,
  invoice_date DATE,
  due_date DATE,

  -- Amounts
  total_amount DECIMAL(15, 2) DEFAULT 0,
  amount_paid DECIMAL(15, 2) DEFAULT 0,
  balance_due DECIMAL(15, 2) DEFAULT 0,

  -- Status
  status TEXT, -- 'paid', 'partial', 'unpaid', 'overdue'
  payment_status TEXT,

  -- Line items
  line_items JSONB,

  -- Payment history
  payments JSONB, -- [{"date": "2024-01-15", "amount": 1000, "method": "ACH"}]

  -- Raw QB data
  qb_raw_data JSONB,

  sync_id UUID REFERENCES qb_sync_status(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, qb_invoice_id)
);

-- Team Members (Employees & Contractors)
CREATE TABLE IF NOT EXISTS qb_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qb_entity_id TEXT NOT NULL,

  -- Personal info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Employment details
  entity_type TEXT, -- 'employee', 'contractor', '1099'
  department TEXT,
  title TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Compensation
  compensation_type TEXT, -- 'salary', 'hourly', 'contract'
  current_rate DECIMAL(15, 2),
  rate_frequency TEXT, -- 'annual', 'monthly', 'hourly', 'project'

  -- YTD totals
  ytd_gross_pay DECIMAL(15, 2) DEFAULT 0,
  ytd_net_pay DECIMAL(15, 2) DEFAULT 0,
  ytd_hours DECIMAL(10, 2),

  -- Raw QB data
  qb_raw_data JSONB,

  sync_id UUID REFERENCES qb_sync_status(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, qb_entity_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qb_pl_user_period ON qb_profit_loss(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_qb_bs_user_date ON qb_balance_sheet(user_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_qb_cf_user_period ON qb_cash_flow(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_qb_invoices_user_date ON qb_invoices(user_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_qb_invoices_status ON qb_invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_qb_team_user_active ON qb_team_members(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_qb_sync_user_type ON qb_sync_status(user_id, sync_type, created_at);

-- Enable Row Level Security
ALTER TABLE qb_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_profit_loss ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_balance_sheet ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_cash_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view their own sync status"
  ON qb_sync_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync status"
  ON qb_sync_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync status"
  ON qb_sync_status FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own P&L data"
  ON qb_profit_loss FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own P&L data"
  ON qb_profit_loss FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own P&L data"
  ON qb_profit_loss FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own balance sheet data"
  ON qb_balance_sheet FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balance sheet data"
  ON qb_balance_sheet FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance sheet data"
  ON qb_balance_sheet FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own cash flow data"
  ON qb_cash_flow FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cash flow data"
  ON qb_cash_flow FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cash flow data"
  ON qb_cash_flow FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own invoices"
  ON qb_invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
  ON qb_invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON qb_invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own team members"
  ON qb_team_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own team members"
  ON qb_team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own team members"
  ON qb_team_members FOR UPDATE
  USING (auth.uid() = user_id);

-- Create views for easier querying
CREATE OR REPLACE VIEW qb_latest_balance_sheet AS
SELECT DISTINCT ON (user_id) *
FROM qb_balance_sheet
ORDER BY user_id, as_of_date DESC;

CREATE OR REPLACE VIEW qb_active_team_members AS
SELECT *
FROM qb_team_members
WHERE is_active = TRUE
ORDER BY name;

CREATE OR REPLACE VIEW qb_unpaid_invoices AS
SELECT *
FROM qb_invoices
WHERE balance_due > 0
ORDER BY due_date;

-- Grant access to views
GRANT SELECT ON qb_latest_balance_sheet TO authenticated;
GRANT SELECT ON qb_active_team_members TO authenticated;
GRANT SELECT ON qb_unpaid_invoices TO authenticated;
