/*
# Add Quick Links Feature

## Purpose
Allow users to save quick links to their banking apps, payment apps, and other financial services.
These links can use URL schemes to open mobile apps if installed, or web URLs for browser access.

## New Table: quick_links

### Columns
- id (uuid, primary key): Unique identifier for each quick link
- user_id (uuid, foreign key): References profiles(id), links to user who created it
- name (text, not null): Display name for the link (e.g., "My Bank App", "PayPal")
- url (text, not null): URL or URL scheme (e.g., "https://bank.com", "bankapp://open")
- icon (text): Optional icon/emoji to display with the link
- color (text): Optional color for the link card
- display_order (integer): Order in which links should be displayed
- created_at (timestamptz): Timestamp when link was created
- updated_at (timestamptz): Timestamp when link was last updated

## Security
- Enable RLS (Row Level Security)
- Users can only view/edit their own quick links
- Admins have full access to all quick links

## Indexes
- Index on user_id for faster queries
- Index on display_order for sorting
*/

-- Create quick_links table
CREATE TABLE IF NOT EXISTS quick_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  icon text DEFAULT '🔗',
  color text DEFAULT '#1E3A8A',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quick_links_user_id ON quick_links(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_links_display_order ON quick_links(user_id, display_order);

-- Enable RLS
ALTER TABLE quick_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins have full access to quick links" ON quick_links
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own quick links" ON quick_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quick links" ON quick_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quick links" ON quick_links
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quick links" ON quick_links
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quick_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quick_links_updated_at
  BEFORE UPDATE ON quick_links
  FOR EACH ROW
  EXECUTE FUNCTION update_quick_links_updated_at();

-- Add some common quick link templates (optional, users can add their own)
COMMENT ON TABLE quick_links IS 'User-defined quick links to banking apps, payment services, and other financial tools';
COMMENT ON COLUMN quick_links.url IS 'Can be a web URL (https://) or app URL scheme (app://) for deep linking';
COMMENT ON COLUMN quick_links.icon IS 'Emoji or icon identifier to display with the link';
COMMENT ON COLUMN quick_links.color IS 'Hex color code for the link card background';
