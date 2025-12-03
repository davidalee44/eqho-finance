-- =====================================================
-- Add Impersonation Action Types to Audit Logs
-- =====================================================
-- Enables logging of admin impersonation sessions
-- =====================================================

-- Drop existing constraint
ALTER TABLE audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_action_type_check;

-- Add updated constraint with impersonation action types
ALTER TABLE audit_logs 
ADD CONSTRAINT audit_logs_action_type_check 
CHECK (action_type::text = ANY (ARRAY[
  'login'::character varying, 
  'logout'::character varying, 
  'layout_change'::character varying, 
  'report_export'::character varying, 
  'report_view'::character varying, 
  'snapshot_create'::character varying, 
  'snapshot_restore'::character varying,
  'impersonation_start'::character varying,
  'impersonation_end'::character varying
]::text[]));

-- Add comment for documentation
COMMENT ON COLUMN audit_logs.action_type IS 
'Type of action: login, logout, layout_change, report_export, report_view, snapshot_create, snapshot_restore, impersonation_start, impersonation_end';

