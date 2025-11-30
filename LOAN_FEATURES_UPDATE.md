# Loan Account Features Update

## Overview
Added two critical features for loan account management:
1. **Mandatory Loan Start Date** - Track when loans were disbursed
2. **Floating Interest Rate Management** - Update interest rates anytime with full history tracking

## Features Implemented

### 1. Loan Start Date (Mandatory Field)

#### Purpose
- Track the exact date when a loan was disbursed/started
- Essential for calculating loan duration and interest accrual
- Required for accurate financial reporting

#### Implementation Details

**Database Changes:**
- Added `loan_start_date` column to `accounts` table (type: date)
- Field is nullable to support non-loan accounts
- Migration: `add_loan_start_date.sql`

**Type Updates:**
- Updated `Account` interface in `types.ts` to include `loan_start_date: string | null`

**Form Changes:**
- Added date input field in AccountForm for loan accounts
- Field appears after "Loan Tenure" field
- Marked as required (*) for loan accounts
- Validation ensures loan start date is provided before submission

**User Experience:**
- Clean date picker interface
- Required field validation with clear error message
- Automatically saved with loan account data

### 2. Floating Interest Rate Management

#### Purpose
- Allow users to update floating interest rates as they change over time
- Maintain complete history of all rate changes
- Track effective dates for each rate change
- Support accurate interest calculations based on historical rates

#### Implementation Details

**New Component: InterestRateManager**
- Location: `src/components/InterestRateManager.tsx`
- Modal dialog interface for managing interest rates
- Features:
  - Display current interest rate prominently
  - Form to add new rate changes with effective date
  - Complete history view of all rate changes
  - Chronological display with dates

**Integration:**
- Button appears on loan account cards in Accounts page
- Only visible for floating rate loans (not fixed rate)
- Button labeled "Update Interest Rate" with trending icon
- Automatically refreshes account data after updates

**User Interface:**
```
┌─────────────────────────────────────┐
│ Manage Interest Rate - [Loan Name]  │
├─────────────────────────────────────┤
│ Current Interest Rate: 5.50%        │
│                                     │
│ New Interest Rate (%): [____]       │
│ Effective Date: [____]              │
│ [Add Interest Rate Change]          │
│                                     │
│ Interest Rate History:              │
│ • 5.50% - Effective: Jan 15, 2025   │
│ • 5.25% - Effective: Dec 01, 2024   │
│ • 5.00% - Effective: Oct 01, 2024   │
└─────────────────────────────────────┘
```

**Data Flow:**
1. User clicks "Update Interest Rate" button
2. Modal opens showing current rate and history
3. User enters new rate and effective date
4. System saves to `interest_rate_history` table
5. Account's `current_interest_rate` is updated
6. History is refreshed to show new entry
7. Account list is refreshed

## Database Schema

### accounts table (updated)
```sql
ALTER TABLE accounts
ADD COLUMN loan_start_date date;
```

### interest_rate_history table (existing)
```sql
CREATE TABLE interest_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  interest_rate numeric NOT NULL,
  effective_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

## User Workflows

### Creating a New Loan Account
1. Navigate to Accounts page
2. Click "Add Account"
3. Select "Loan" as account type
4. Fill in required fields:
   - Account name
   - Country and currency
   - Bank/institution name
   - Loan principal amount
   - Loan tenure (months)
   - **Loan start date** (NEW - Required)
   - Interest rate type (Fixed/Floating)
   - Current interest rate
5. Submit form

### Updating Floating Interest Rate
1. Navigate to Accounts page
2. Find loan account with floating rate
3. Click "Update Interest Rate" button
4. In the modal:
   - View current rate
   - Enter new interest rate
   - Select effective date
   - Click "Add Interest Rate Change"
5. View updated rate in history
6. Modal can be closed or more rates can be added

### Viewing Interest Rate History
1. Open InterestRateManager for any floating rate loan
2. Scroll through "Interest Rate History" section
3. See all rate changes with:
   - Rate percentage
   - Effective date (when rate became active)
   - Added date (when entry was created)

## Technical Details

### Form Validation
```typescript
// Loan account validation includes start date
if (formData.account_type === 'loan') {
  if (!formData.loan_principal || 
      !formData.loan_tenure_months || 
      !formData.current_interest_rate || 
      !formData.loan_start_date) {
    // Show error: "Please fill in all loan details including start date"
    return;
  }
}
```

### Interest Rate Update API
```typescript
// Add new interest rate entry
await interestRateApi.addInterestRate({
  account_id: accountId,
  interest_rate: parseFloat(formData.interest_rate),
  effective_date: formData.effective_date,
});

// Fetch history
const history = await interestRateApi.getInterestRateHistory(accountId);
```

### Component Props
```typescript
interface InterestRateManagerProps {
  accountId: string;           // Account to manage
  accountName: string;          // Display name
  currentRate: number;          // Current interest rate
  onRateUpdated?: () => void;   // Callback after update
}
```

## Benefits

### For Users
1. **Accurate Tracking**: Know exactly when loans started and rates changed
2. **Historical Record**: Complete audit trail of all interest rate changes
3. **Easy Updates**: Simple interface to record rate changes as they happen
4. **Better Planning**: Historical data helps with financial planning and analysis

### For Financial Management
1. **Precise Calculations**: Calculate interest accurately based on rate history
2. **Compliance**: Maintain records for tax and regulatory purposes
3. **Transparency**: Clear visibility into how loan costs have changed over time
4. **Reporting**: Generate accurate reports with historical rate data

## Future Enhancements

### Potential Additions
1. **Automatic Interest Calculation**: Calculate accrued interest based on rate history
2. **Rate Change Notifications**: Alert users when it's time to update rates
3. **Rate Comparison**: Compare rates across different loans
4. **Export History**: Download rate history as CSV/PDF
5. **Rate Charts**: Visualize rate changes over time with graphs
6. **Bulk Updates**: Update rates for multiple loans at once

### Dashboard Integration
- Display loan start dates on dashboard
- Show rate change timeline charts
- Alert for loans with outdated rate information (floating rates)

## Testing Checklist
- [x] Loan start date field appears for loan accounts
- [x] Loan start date is required for loan creation
- [x] Loan start date is saved correctly
- [x] Loan start date is displayed when editing
- [x] InterestRateManager button appears for floating rate loans
- [x] InterestRateManager button does NOT appear for fixed rate loans
- [x] Interest rate can be added with effective date
- [x] Interest rate history displays correctly
- [x] Account refreshes after rate update
- [x] Form validation works correctly
- [x] Date picker works properly
- [x] Linter passes with no errors

## Files Modified

### Database
- `supabase/migrations/add_loan_start_date.sql` - New migration

### Types
- `src/types/types.ts` - Added loan_start_date to Account interface

### Components
- `src/components/InterestRateManager.tsx` - New component (created)
- `src/pages/AccountForm.tsx` - Added loan start date field
- `src/pages/Accounts.tsx` - Added InterestRateManager integration

### Documentation
- `LOAN_FEATURES_UPDATE.md` - This file

## Usage Examples

### Example 1: Creating a Home Loan
```
Account Type: Loan
Account Name: Home Loan - ABC Bank
Country: United States
Bank: ABC Bank
Loan Principal: $250,000
Loan Tenure: 360 months (30 years)
Loan Start Date: 2024-01-15
Interest Rate Type: Floating
Current Interest Rate: 6.50%
```

### Example 2: Updating Interest Rate
```
Current Rate: 6.50%
New Rate: 6.75%
Effective Date: 2025-02-01
Reason: Federal Reserve rate increase
```

### Example 3: Rate History View
```
Interest Rate History:
• 6.75% - Effective: Feb 01, 2025 (Added: Jan 28, 2025)
• 6.50% - Effective: Jan 15, 2024 (Added: Jan 15, 2024)
```

## Notes
- Loan start date is only required for loan accounts, not for other account types
- Interest rate management is only available for floating rate loans
- Fixed rate loans do not show the "Update Interest Rate" button
- All dates are stored in ISO format (YYYY-MM-DD)
- Interest rate history is automatically sorted by effective date
- Users can add multiple rate changes in one session
- The modal stays open after adding a rate to allow multiple entries
