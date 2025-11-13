-- Audit Logs Table
-- Tracks all significant user actions for security and compliance
-- Actions: login, logout, layout_change, report_export, report_view

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL,
  action_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read audit logs
CREATE POLICY "Only admins can read audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    )
  );

-- Policy: All authenticated users can insert audit logs (for their own actions)
CREATE POLICY "Users can insert their own audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action_type, created_at DESC);

-- Add constraints
ALTER TABLE audit_logs ADD CONSTRAINT check_action_type 
  CHECK (action_type IN ('login', 'logout', 'layout_change', 'report_export', 'report_view', 'snapshot_create', 'snapshot_restore'));

-- Add comment for documentation
COMMENT ON TABLE audit_logs IS 'Audit trail of all significant user actions in the system';
COMMENT ON COLUMN audit_logs.action_type IS 'Type of action: login, logout, layout_change, report_export, report_view, snapshot_create, snapshot_restore';
COMMENT ON COLUMN audit_logs.action_data IS 'Additional JSON data specific to the action type';

