# Bank Quick Links Feature Documentation

## Overview

The Bank Quick Links feature allows users to quickly access their bank's website or mobile app directly from their account cards in the SmartFinHub dashboard. This feature provides seamless integration with banking services and enhances user experience by reducing friction when accessing financial institutions.

## Features

### 1. Pre-populated Bank Database

The application includes a comprehensive database of major banks from various countries:

- **United States**: Bank of America, Chase, Wells Fargo, Citibank, Capital One, US Bank, PNC Bank, TD Bank, American Express, Discover
- **United Kingdom**: Barclays, HSBC UK, Lloyds Bank, NatWest, Santander UK, Nationwide, TSB Bank, Metro Bank, Monzo, Revolut
- **India**: State Bank of India, HDFC Bank, ICICI Bank, Axis Bank, Kotak Mahindra Bank, Punjab National Bank, Bank of Baroda, Canara Bank, IDFC First Bank, Paytm Payments Bank
- **Canada**: Royal Bank of Canada, TD Canada Trust, Bank of Montreal, Scotiabank, CIBC
- **Australia**: Commonwealth Bank, Westpac, ANZ, NAB

### 2. Smart Platform Detection

The BankQuickLinks component automatically detects the user's platform and provides the most appropriate link:

- **iOS Devices**: Opens iOS app store link or attempts deep link to open the app directly
- **Android Devices**: Opens Google Play Store link or attempts deep link to open the app directly
- **Desktop/Web**: Opens the bank's website in a new tab

### 3. Deep Linking Support

For mobile devices, the feature attempts to open the bank's mobile app directly using deep links. If the app is not installed, it falls back to the app store page where users can download the app.

### 4. Custom Bank Links

Users can add custom bank links for institutions not in the pre-populated database:

- Add custom web URLs
- Add custom iOS app store links
- Add custom Android app store links
- Add notes for reference
- Associate links with specific accounts

### 5. Multiple Link Types

Each bank can have multiple types of links:

- **Web URL**: Direct link to the bank's website
- **iOS App URL**: Link to the iOS App Store
- **Android App URL**: Link to Google Play Store
- **iOS Deep Link**: Deep link pattern to open iOS app
- **Android Deep Link**: Deep link pattern to open Android app

## Database Schema

### bank_links Table

Stores reference data for known banks and financial institutions.

```sql
CREATE TABLE bank_links (
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
```

**Fields**:
- `id`: Unique identifier
- `bank_name`: Name of the bank/financial institution
- `country`: Country code (e.g., 'US', 'UK', 'IN')
- `web_url`: Website URL
- `ios_app_url`: iOS App Store URL
- `android_app_url`: Google Play Store URL
- `deep_link_ios`: iOS deep link pattern (e.g., 'bofa://')
- `deep_link_android`: Android deep link pattern
- `logo_url`: Bank logo URL (optional)
- `is_active`: Whether the link is active
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### user_custom_bank_links Table

Stores user-specific custom bank links.

```sql
CREATE TABLE user_custom_bank_links (
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
```

**Fields**:
- `id`: Unique identifier
- `user_id`: User who created the link
- `account_id`: Associated account (optional)
- `bank_name`: Custom bank name
- `web_url`: Custom website URL
- `ios_app_url`: Custom iOS app URL
- `android_app_url`: Custom Android app URL
- `notes`: Additional notes
- `created_at`: Creation timestamp

## Security

### Row Level Security (RLS)

Both tables have RLS enabled with appropriate policies:

**bank_links**:
- Public read access for active links
- Only admins can create/update/delete links

**user_custom_bank_links**:
- Users can only view their own custom links
- Users can create/update/delete their own links
- Complete isolation between users

## API Reference

### bankLinksApi

#### `getAllBankLinks(): Promise<BankLink[]>`
Get all active bank links.

#### `getBankLinksByCountry(country: string): Promise<BankLink[]>`
Get bank links for a specific country.

#### `searchBankLinks(searchTerm: string): Promise<BankLink[]>`
Search bank links by name.

#### `getBankLinkByName(bankName: string, country?: string): Promise<BankLink | null>`
Get a specific bank link by name and optionally country.

#### `createBankLink(bankLink: Omit<BankLink, 'id' | 'created_at' | 'updated_at'>): Promise<BankLink>`
Create a new bank link (admin only).

#### `updateBankLink(id: string, updates: Partial<BankLink>): Promise<BankLink>`
Update an existing bank link (admin only).

#### `deleteBankLink(id: string): Promise<void>`
Delete a bank link (admin only).

### userCustomBankLinksApi

#### `getUserCustomBankLinks(userId: string): Promise<UserCustomBankLink[]>`
Get all custom bank links for a user.

#### `getCustomBankLinksByAccount(accountId: string): Promise<UserCustomBankLink[]>`
Get custom bank links for a specific account.

#### `createCustomBankLink(link: Omit<UserCustomBankLink, 'id' | 'created_at'>): Promise<UserCustomBankLink>`
Create a new custom bank link.

#### `updateCustomBankLink(id: string, updates: Partial<UserCustomBankLink>): Promise<UserCustomBankLink>`
Update an existing custom bank link.

#### `deleteCustomBankLink(id: string): Promise<void>`
Delete a custom bank link.

## Component Usage

### BankQuickLinks Component

```tsx
import BankQuickLinks from '@/components/BankQuickLinks';

<BankQuickLinks
  bankName="Chase Bank"
  country="US"
  accountId="account-uuid"
  userId="user-uuid"
/>
```

**Props**:
- `bankName`: Name of the bank/financial institution
- `country`: Country code (e.g., 'US', 'UK', 'IN')
- `accountId`: ID of the associated account
- `userId`: ID of the current user

**Features**:
- Automatically fetches bank links from database
- Displays quick link buttons for available platforms
- Shows "Open Bank" button with smart platform detection
- Allows adding custom bank links via dialog
- Prevents click propagation to parent elements

## User Experience

### For Bank Accounts

Bank quick links appear at the bottom of each bank account card with:
- "Open Bank" button (primary action with smart platform detection)
- "Web" button (opens website)
- "App" button (opens app store or deep link)
- "+" button (add custom links)

### For Credit Card Accounts

Credit card quick links appear at the bottom of each credit card with the same functionality as bank accounts.

### For Loan Accounts

Loan account quick links appear at the bottom of each loan account card with the same functionality.

### Adding Custom Links

Users can add custom bank links by:
1. Clicking the "+" button or "Add Bank Link" button
2. Filling in the dialog form:
   - Link Name (required)
   - Website URL (optional)
   - iOS App URL (optional)
   - Android App URL (optional)
   - Notes (optional)
3. Clicking "Add Link" to save

At least one URL (web, iOS, or Android) must be provided.

## Platform Detection Logic

The component uses the following logic to detect the user's platform:

```typescript
const detectPlatform = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  return 'web';
};
```

## Deep Link Behavior

When a user clicks "Open Bank" on a mobile device:

1. **iOS**:
   - Attempts to open the app using the deep link (e.g., 'bofa://')
   - If the app is not installed, redirects to the App Store after 1.5 seconds
   - If no deep link is available, opens the App Store directly

2. **Android**:
   - Attempts to open the app using the deep link
   - If the app is not installed, redirects to Google Play Store after 1.5 seconds
   - If no deep link is available, opens Google Play Store directly

3. **Desktop/Web**:
   - Opens the bank's website in a new tab

## Adding New Banks

### For Administrators

To add a new bank to the database:

```sql
INSERT INTO bank_links (
  bank_name,
  country,
  web_url,
  ios_app_url,
  android_app_url,
  deep_link_ios,
  deep_link_android
) VALUES (
  'Example Bank',
  'US',
  'https://www.examplebank.com',
  'https://apps.apple.com/us/app/example-bank/id123456789',
  'https://play.google.com/store/apps/details?id=com.examplebank.mobile',
  'examplebank://',
  'examplebank://'
);
```

### For Users

Users can add custom links for any bank through the UI without administrator intervention.

## Best Practices

### For Developers

1. **Always provide web URLs**: Web URLs work on all platforms and serve as a fallback
2. **Test deep links**: Verify deep links work on actual devices before adding to database
3. **Keep URLs up to date**: App store URLs and deep links can change over time
4. **Use consistent naming**: Use official bank names for better recognition

### For Users

1. **Verify URLs**: Ensure URLs are correct before saving custom links
2. **Use official sources**: Get URLs from official bank websites or app stores
3. **Add notes**: Use the notes field to remember why you added a custom link
4. **Test links**: Click links to verify they work correctly

## Troubleshooting

### Link Not Working

**Problem**: Clicking a bank link does nothing or shows an error.

**Solutions**:
- Verify the URL is correct and accessible
- Check if the bank's website or app is temporarily down
- Try opening the URL directly in a browser
- For mobile apps, ensure the app is installed

### Deep Link Not Opening App

**Problem**: Deep link doesn't open the mobile app.

**Solutions**:
- Verify the app is installed on the device
- Check if the deep link pattern is correct
- Some apps require specific permissions or settings
- Try uninstalling and reinstalling the app

### Custom Link Not Saving

**Problem**: Custom bank link fails to save.

**Solutions**:
- Ensure at least one URL field is filled
- Check that you're logged in
- Verify you have permission to add links
- Check browser console for error messages

## Future Enhancements

### Planned Features

1. **Bank Logo Integration**: Automatically fetch and display bank logos
2. **Link Analytics**: Track which links are most frequently used
3. **Link Verification**: Automatically verify that URLs are still valid
4. **Bulk Import**: Allow users to import multiple custom links at once
5. **Link Sharing**: Share custom bank links with other users (with permission)
6. **QR Code Generation**: Generate QR codes for bank links for easy mobile access
7. **Favorites**: Mark frequently used banks as favorites for quick access
8. **Recent Links**: Show recently accessed bank links

### Potential Improvements

1. **OAuth Integration**: Direct login to bank accounts from the app
2. **Account Aggregation**: Fetch account balances directly from banks
3. **Transaction Import**: Import transactions from bank accounts automatically
4. **Bill Pay Integration**: Pay bills directly through bank links
5. **Multi-language Support**: Translate bank names and descriptions

## Performance Considerations

### Caching

Bank links are fetched from the database on component mount. Consider implementing:
- Client-side caching to reduce database queries
- Prefetching bank links on dashboard load
- Lazy loading for custom links

### Optimization

- Bank links are only loaded when needed (per account)
- Deep link attempts timeout after 1.5 seconds
- Component prevents unnecessary re-renders

## Compliance and Legal

### Important Notes

1. **No Affiliation**: This feature does not imply any affiliation with the listed banks
2. **User Responsibility**: Users are responsible for verifying link authenticity
3. **Security**: Always use HTTPS URLs for bank websites
4. **Privacy**: No user credentials or sensitive data are stored in bank links
5. **Terms of Service**: Users should comply with bank terms of service when accessing links

### Disclaimer

The bank quick links feature is provided for convenience only. SmartFinHub is not responsible for:
- The availability or functionality of external bank websites or apps
- Any actions taken on external bank platforms
- The security of external bank platforms
- Changes to bank URLs or app availability

## Support

For issues or questions about bank quick links:

1. Check this documentation
2. Review the component source code in `src/components/BankQuickLinks.tsx`
3. Check the API implementation in `src/db/api.ts`
4. Review the database schema in `supabase/migrations/00026_create_bank_links_table.sql`

---

**Last Updated**: 2025-11-30
**Version**: 1.0.0
