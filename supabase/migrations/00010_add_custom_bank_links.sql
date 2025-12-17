/*
# Add Custom Bank App Links Table

## 1. New Tables

### `custom_bank_links`
Stores user preferences for bank app links when default links are not available.

**Columns:**
- `id` (uuid, primary key) - Unique identifier
- `user_id` (uuid, foreign key) - References profiles.id
- `account_id` (uuid, foreign key) - References accounts.id
- `institution_name` (text) - Name of the bank/institution
- `app_name` (text) - Selected app name (e.g., "Google Pay", "PhonePe")
- `app_url` (text) - URL/deep link to the app
- `created_at` (timestamptz) - When the preference was created
- `updated_at` (timestamptz) - When the preference was last updated

## 2. Indexes
- Index on user_id for fast lookups
- Unique index on (user_id, account_id) to prevent duplicates

## 3. Security
- Enable RLS on custom_bank_links table
- Users can only access their own custom links
- Users can create, read, update, and delete their own links

## 4. Notes
- This allows users to customize which app opens when they click a bank quick link
- Common apps include: Google Pay, PhonePe, Paytm, BHIM, Amazon Pay, etc.
*/

-- Create custom_bank_links table
CREATE TABLE IF NOT EXISTS custom_bank_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  institution_name text NOT NULL,
  app_name text NOT NULL,
  app_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_custom_bank_links_user_id ON custom_bank_links(user_id);
CREATE UNIQUE INDEX idx_custom_bank_links_user_account ON custom_bank_links(user_id, account_id);

-- Enable RLS
ALTER TABLE custom_bank_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own custom bank links" ON custom_bank_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own custom bank links" ON custom_bank_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom bank links" ON custom_bank_links
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom bank links" ON custom_bank_links
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_bank_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_custom_bank_links_updated_at
  BEFORE UPDATE ON custom_bank_links
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_bank_links_updated_at();
