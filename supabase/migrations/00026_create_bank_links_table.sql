/*
# Create Bank Links Table

## Overview
Creates a table to store quick links for banks and financial institutions,
allowing users to quickly access their bank's website or mobile app.

## Tables Created

1. **bank_links**
   - `id` (uuid, primary key): Unique identifier
   - `bank_name` (text, not null): Name of the bank/financial institution
   - `country` (text, not null): Country code (e.g., 'US', 'UK', 'IN')
   - `web_url` (text): Website URL for the bank
   - `ios_app_url` (text): iOS App Store URL
   - `android_app_url` (text): Android Play Store URL
   - `deep_link_ios` (text): iOS deep link pattern
   - `deep_link_android` (text): Android deep link pattern
   - `logo_url` (text): Bank logo URL
   - `is_active` (boolean): Whether the link is active
   - `created_at` (timestamptz): Creation timestamp
   - `updated_at` (timestamptz): Last update timestamp

2. **user_custom_bank_links**
   - `id` (uuid, primary key): Unique identifier
   - `user_id` (uuid, foreign key): User who created the link
   - `account_id` (uuid, foreign key): Associated account
   - `bank_name` (text, not null): Custom bank name
   - `web_url` (text): Custom website URL
   - `ios_app_url` (text): Custom iOS app URL
   - `android_app_url` (text): Custom Android app URL
   - `notes` (text): Additional notes
   - `created_at` (timestamptz): Creation timestamp

## Security
- Public read access to bank_links (reference data)
- Users can only manage their own custom bank links
- RLS policies enforce user isolation

## Initial Data
Pre-populated with major banks from various countries
*/

-- Create bank_links table for reference data
CREATE TABLE IF NOT EXISTS bank_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  country text NOT NULL,
  web_url text,
  ios_app_url text,
  android_app_url text,
  deep_link_ios text,
  deep_link_android text,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_bank_links_country ON bank_links(country);
CREATE INDEX idx_bank_links_bank_name ON bank_links(bank_name);

-- Create user_custom_bank_links table for user-specific links
CREATE TABLE IF NOT EXISTS user_custom_bank_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  web_url text,
  ios_app_url text,
  android_app_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE bank_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_bank_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bank_links (public read)
CREATE POLICY "Anyone can view active bank links" ON bank_links
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage bank links" ON bank_links
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- RLS Policies for user_custom_bank_links
CREATE POLICY "Users can view own custom bank links" ON user_custom_bank_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own custom bank links" ON user_custom_bank_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom bank links" ON user_custom_bank_links
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom bank links" ON user_custom_bank_links
  FOR DELETE USING (auth.uid() = user_id);

-- Insert popular banks from various countries

-- United States Banks
INSERT INTO bank_links (bank_name, country, web_url, ios_app_url, android_app_url, deep_link_ios, deep_link_android) VALUES
('Bank of America', 'US', 'https://www.bankofamerica.com', 'https://apps.apple.com/us/app/bank-of-america-mobile-banking/id284847138', 'https://play.google.com/store/apps/details?id=com.infonow.bofa', 'bofa://', 'bofa://'),
('Chase Bank', 'US', 'https://www.chase.com', 'https://apps.apple.com/us/app/chase-mobile/id298867247', 'https://play.google.com/store/apps/details?id=com.chase.sig.android', 'chase://', 'chase://'),
('Wells Fargo', 'US', 'https://www.wellsfargo.com', 'https://apps.apple.com/us/app/wells-fargo-mobile/id411394276', 'https://play.google.com/store/apps/details?id=com.wf.wellsfargomobile', 'wellsfargo://', 'wellsfargo://'),
('Citibank', 'US', 'https://www.citibank.com', 'https://apps.apple.com/us/app/citi-mobile/id301724680', 'https://play.google.com/store/apps/details?id=com.citi.citimobile', 'citi://', 'citi://'),
('Capital One', 'US', 'https://www.capitalone.com', 'https://apps.apple.com/us/app/capital-one-mobile/id407558537', 'https://play.google.com/store/apps/details?id=com.konylabs.capitalone', 'capitalone://', 'capitalone://'),
('US Bank', 'US', 'https://www.usbank.com', 'https://apps.apple.com/us/app/u-s-bank-mobile-banking/id393806740', 'https://play.google.com/store/apps/details?id=com.usbank.mobilebanking', 'usbank://', 'usbank://'),
('PNC Bank', 'US', 'https://www.pnc.com', 'https://apps.apple.com/us/app/pnc-mobile-banking/id403818726', 'https://play.google.com/store/apps/details?id=com.pnc.ecommerce.mobile', 'pnc://', 'pnc://'),
('TD Bank', 'US', 'https://www.td.com', 'https://apps.apple.com/us/app/td-bank-us/id358790776', 'https://play.google.com/store/apps/details?id=com.tdbank', 'tdbank://', 'tdbank://'),
('American Express', 'US', 'https://www.americanexpress.com', 'https://apps.apple.com/us/app/amex/id362348516', 'https://play.google.com/store/apps/details?id=com.americanexpress.android.acctsvcs.us', 'amex://', 'amex://'),
('Discover', 'US', 'https://www.discover.com', 'https://apps.apple.com/us/app/discover-mobile/id415748377', 'https://play.google.com/store/apps/details?id=com.discoverfinancial.mobile', 'discover://', 'discover://');

-- United Kingdom Banks
INSERT INTO bank_links (bank_name, country, web_url, ios_app_url, android_app_url, deep_link_ios, deep_link_android) VALUES
('Barclays', 'GB', 'https://www.barclays.co.uk', 'https://apps.apple.com/gb/app/barclays/id536248734', 'https://play.google.com/store/apps/details?id=com.barclays.android.barclaysmobilebanking', 'barclays://', 'barclays://'),
('HSBC UK', 'GB', 'https://www.hsbc.co.uk', 'https://apps.apple.com/gb/app/hsbc-uk-mobile-banking/id1440701260', 'https://play.google.com/store/apps/details?id=uk.co.hsbc.hsbcukmobilebanking', 'hsbc://', 'hsbc://'),
('Lloyds Bank', 'GB', 'https://www.lloydsbank.com', 'https://apps.apple.com/gb/app/lloyds-bank-mobile-banking/id469964520', 'https://play.google.com/store/apps/details?id=com.grppl.android.shell.CMBlloydsTSB73', 'lloyds://', 'lloyds://'),
('NatWest', 'GB', 'https://www.natwest.com', 'https://apps.apple.com/gb/app/natwest-mobile-banking/id532866063', 'https://play.google.com/store/apps/details?id=com.rbs.mobile.android.natwest', 'natwest://', 'natwest://'),
('Santander UK', 'GB', 'https://www.santander.co.uk', 'https://apps.apple.com/gb/app/santander-mobile-banking/id445310545', 'https://play.google.com/store/apps/details?id=uk.co.santander.santanderUK', 'santander://', 'santander://'),
('Nationwide', 'GB', 'https://www.nationwide.co.uk', 'https://apps.apple.com/gb/app/nationwide-banking/id405068025', 'https://play.google.com/store/apps/details?id=co.uk.Nationwide.Mobile', 'nationwide://', 'nationwide://'),
('TSB Bank', 'GB', 'https://www.tsb.co.uk', 'https://apps.apple.com/gb/app/tsb-mobile-banking/id461281449', 'https://play.google.com/store/apps/details?id=uk.co.tsb.newmobilebank', 'tsb://', 'tsb://'),
('Metro Bank', 'GB', 'https://www.metrobankonline.co.uk', 'https://apps.apple.com/gb/app/metro-bank/id520538077', 'https://play.google.com/store/apps/details?id=uk.co.metrobankonline.mobile.android.production', 'metrobank://', 'metrobank://'),
('Monzo', 'GB', 'https://monzo.com', 'https://apps.apple.com/gb/app/monzo-bank/id1052238659', 'https://play.google.com/store/apps/details?id=co.uk.getmondo', 'monzo://', 'monzo://'),
('Revolut', 'GB', 'https://www.revolut.com', 'https://apps.apple.com/gb/app/revolut/id932493382', 'https://play.google.com/store/apps/details?id=com.revolut.revolut', 'revolut://', 'revolut://');

-- India Banks
INSERT INTO bank_links (bank_name, country, web_url, ios_app_url, android_app_url, deep_link_ios, deep_link_android) VALUES
('State Bank of India', 'IN', 'https://www.onlinesbi.sbi', 'https://apps.apple.com/in/app/yono-sbi/id1141058988', 'https://play.google.com/store/apps/details?id=com.sbi.lotusintouch', 'yonosbi://', 'yonosbi://'),
('HDFC Bank', 'IN', 'https://www.hdfcbank.com', 'https://apps.apple.com/in/app/hdfcbank-mobilebankingapp/id430033626', 'https://play.google.com/store/apps/details?id=com.snapwork.hdfc', 'hdfcbank://', 'hdfcbank://'),
('ICICI Bank', 'IN', 'https://www.icicibank.com', 'https://apps.apple.com/in/app/imobile-pay-by-icici-bank/id1039140197', 'https://play.google.com/store/apps/details?id=com.csam.icici.bank.imobile', 'imobile://', 'imobile://'),
('Axis Bank', 'IN', 'https://www.axisbank.com', 'https://apps.apple.com/in/app/axis-mobile/id458857662', 'https://play.google.com/store/apps/details?id=com.axis.mobile', 'axisbank://', 'axisbank://'),
('Kotak Mahindra Bank', 'IN', 'https://www.kotak.com', 'https://apps.apple.com/in/app/kotak-mobile-banking/id584697588', 'https://play.google.com/store/apps/details?id=com.msf.kbank.mobile', 'kotak://', 'kotak://'),
('Punjab National Bank', 'IN', 'https://www.pnbindia.in', 'https://apps.apple.com/in/app/pnb-one/id1455048091', 'https://play.google.com/store/apps/details?id=com.fss.pnbone', 'pnbone://', 'pnbone://'),
('Bank of Baroda', 'IN', 'https://www.bankofbaroda.in', 'https://apps.apple.com/in/app/bob-world/id1455440948', 'https://play.google.com/store/apps/details?id=com.bobibanking.bobimobilebanking', 'bobworld://', 'bobworld://'),
('Canara Bank', 'IN', 'https://www.canarabank.com', 'https://apps.apple.com/in/app/canara-ai1/id1480235066', 'https://play.google.com/store/apps/details?id=com.canara.ai1', 'canarabank://', 'canarabank://'),
('IDFC First Bank', 'IN', 'https://www.idfcfirstbank.com', 'https://apps.apple.com/in/app/idfc-first-bank/id1449526308', 'https://play.google.com/store/apps/details?id=com.idfcfirstbank.optimus', 'idfcfirst://', 'idfcfirst://'),
('Paytm Payments Bank', 'IN', 'https://www.paytmbank.com', 'https://apps.apple.com/in/app/paytm/id473941634', 'https://play.google.com/store/apps/details?id=net.one97.paytm', 'paytm://', 'paytm://');

-- Canada Banks
INSERT INTO bank_links (bank_name, country, web_url, ios_app_url, android_app_url, deep_link_ios, deep_link_android) VALUES
('Royal Bank of Canada', 'CA', 'https://www.rbc.com', 'https://apps.apple.com/ca/app/rbc-mobile/id407597290', 'https://play.google.com/store/apps/details?id=com.rbc.mobile.android', 'rbc://', 'rbc://'),
('TD Canada Trust', 'CA', 'https://www.td.com', 'https://apps.apple.com/ca/app/td-canada/id358790776', 'https://play.google.com/store/apps/details?id=com.td', 'td://', 'td://'),
('Bank of Montreal', 'CA', 'https://www.bmo.com', 'https://apps.apple.com/ca/app/bmo-mobile-banking/id429080625', 'https://play.google.com/store/apps/details?id=com.bmo.mobile', 'bmo://', 'bmo://'),
('Scotiabank', 'CA', 'https://www.scotiabank.com', 'https://apps.apple.com/ca/app/scotiabank-mobile-banking/id404976338', 'https://play.google.com/store/apps/details?id=com.scotiabank.banking', 'scotiabank://', 'scotiabank://'),
('CIBC', 'CA', 'https://www.cibc.com', 'https://apps.apple.com/ca/app/cibc-mobile-banking/id351448953', 'https://play.google.com/store/apps/details?id=com.cibc.android.mobi', 'cibc://', 'cibc://');

-- Australia Banks
INSERT INTO bank_links (bank_name, country, web_url, ios_app_url, android_app_url, deep_link_ios, deep_link_android) VALUES
('Commonwealth Bank', 'AU', 'https://www.commbank.com.au', 'https://apps.apple.com/au/app/commbank/id310251202', 'https://play.google.com/store/apps/details?id=com.commbank.netbank', 'commbank://', 'commbank://'),
('Westpac', 'AU', 'https://www.westpac.com.au', 'https://apps.apple.com/au/app/westpac-mobile-banking/id374314814', 'https://play.google.com/store/apps/details?id=org.westpac.bank', 'westpac://', 'westpac://'),
('ANZ', 'AU', 'https://www.anz.com.au', 'https://apps.apple.com/au/app/anz-australia/id387180371', 'https://play.google.com/store/apps/details?id=com.anz.android.gomoney', 'anz://', 'anz://'),
('NAB', 'AU', 'https://www.nab.com.au', 'https://apps.apple.com/au/app/nab-mobile-banking/id374375097', 'https://play.google.com/store/apps/details?id=au.com.nab.mobile', 'nab://', 'nab://');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bank_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bank_links_updated_at
  BEFORE UPDATE ON bank_links
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_links_updated_at();
