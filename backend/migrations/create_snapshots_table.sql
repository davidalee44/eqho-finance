-- Create snapshots table for version control
-- This table stores historical snapshots of financial reports and metrics

CREATE TABLE IF NOT EXISTS report_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    snapshot_type TEXT NOT NULL, -- 'financial_report', 'metrics', 'custom'
    snapshot_name TEXT NOT NULL,
    description TEXT,
    data JSONB NOT NULL, -- The actual report data
    metadata JSONB, -- Additional metadata (filters, parameters, etc.)
    screenshot_url TEXT, -- Optional screenshot stored in Supabase Storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_snapshots_user_id ON report_snapshots(user_id);
CREATE INDEX idx_snapshots_created_at ON report_snapshots(created_at DESC);
CREATE INDEX idx_snapshots_type ON report_snapshots(snapshot_type);

-- Create a trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_report_snapshots_modtime
BEFORE UPDATE ON report_snapshots
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Create RLS (Row Level Security) policies
ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own snapshots
CREATE POLICY "Users can view own snapshots"
    ON report_snapshots FOR SELECT
    USING (auth.uid()::text = user_id);

-- Policy: Users can create their own snapshots
CREATE POLICY "Users can create own snapshots"
    ON report_snapshots FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own snapshots
CREATE POLICY "Users can update own snapshots"
    ON report_snapshots FOR UPDATE
    USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own snapshots
CREATE POLICY "Users can delete own snapshots"
    ON report_snapshots FOR DELETE
    USING (auth.uid()::text = user_id);

-- Create storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-screenshots', 'report-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for screenshots
CREATE POLICY "Users can upload screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'report-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their screenshots"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'report-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their screenshots"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'report-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

