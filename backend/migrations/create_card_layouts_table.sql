-- Card Layouts Table
-- Stores the current dashboard card layout configuration
-- Single row holds the master layout that all users see

CREATE TABLE IF NOT EXISTS card_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_data JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default layout (empty state)
INSERT INTO card_layouts (layout_data) 
VALUES ('[]'::jsonb)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE card_layouts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read the layout
CREATE POLICY "Anyone can read card layouts"
  ON card_layouts
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can update the layout
CREATE POLICY "Only admins can update card layouts"
  ON card_layouts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_card_layouts_updated_at ON card_layouts(updated_at DESC);

-- Add comment for documentation
COMMENT ON TABLE card_layouts IS 'Stores the master dashboard card layout configuration visible to all users';

