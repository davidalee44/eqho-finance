-- Migration: Create pipedream_connections table
-- Purpose: Store OAuth connection references for integrations (QuickBooks, Stripe, etc.)
-- Sharing model: Org-level - all authenticated users can read, admins can write

-- Create the pipedream_connections table
CREATE TABLE IF NOT EXISTS pipedream_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app VARCHAR(50) NOT NULL,                    -- App identifier: quickbooks, stripe, google_sheets, slack
    account_id VARCHAR(255) NOT NULL,            -- Pipedream account ID reference
    provider VARCHAR(50) DEFAULT 'pipedream',    -- OAuth provider (pipedream for all)
    status VARCHAR(20) DEFAULT 'active',         -- active, disconnected, error
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,          -- Additional connection data (sync timestamps, etc.)
    
    -- Ensure only one connection per app (org-level, not per-user)
    CONSTRAINT unique_app_connection UNIQUE (app)
);

-- Create index for status lookups
CREATE INDEX IF NOT EXISTS idx_pipedream_connections_status ON pipedream_connections(status);

-- Create index for app lookups
CREATE INDEX IF NOT EXISTS idx_pipedream_connections_app ON pipedream_connections(app);

-- Enable Row Level Security
ALTER TABLE pipedream_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can read connections
-- This enables org-level sharing - anyone with access can view integration status
CREATE POLICY "Authenticated users can read all connections"
    ON pipedream_connections
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policy: Service role can manage connections (backend API uses service role)
-- In practice, the backend uses service_role key which bypasses RLS
CREATE POLICY "Service role can manage connections"
    ON pipedream_connections
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policy: Admins can insert/update/delete connections
-- Checks user role from user_roles table
CREATE POLICY "Admins can manage connections"
    ON pipedream_connections
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role IN ('admin', 'super_admin')
        )
    );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_pipedream_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on changes
DROP TRIGGER IF EXISTS trigger_pipedream_connections_updated_at ON pipedream_connections;
CREATE TRIGGER trigger_pipedream_connections_updated_at
    BEFORE UPDATE ON pipedream_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_pipedream_connections_updated_at();

-- Grant permissions
GRANT SELECT ON pipedream_connections TO authenticated;
GRANT ALL ON pipedream_connections TO service_role;


