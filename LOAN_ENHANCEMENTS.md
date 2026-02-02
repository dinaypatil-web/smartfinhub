# Loan Management Enhancements

## Overview
This document describes the enhancements made to the loan management system in SmartFinHub, including due date tracking, interest rate history tables, accrued interest calculations, and prominent display of total accrued interest.

## New Features

### 1. Loan Payment Due Date

#### Database Changes
- Added `due_date` column to `accounts` table (integer, 1-31)
- Represents the day of month when loan payment is due
- Example: 15 means payment due on 15th of every month
- Constraint: Value must be between 1 and 31

#### UI Changes
- **Account Form**: Added "Payment Due Date" dropdown selector
  - Displays all days 1-31 for selection
  - Required field for loan accounts
  - Includes helpful description text
  
- **Accounts Page**: Displays due date on loan account cards
  - Shows as "X of each month" format
  - Example: "15 of each month"

#### Migration File
- `supabase/migrations/00006_add_loan_due_date.sql`
- Adds column with check constraint
- Includes comprehensive documentation

### 2. Interest Rate History Table

#### Component: InterestRateTable
**Location**: `src/components/InterestRateTable.tsx`

**Features**:
- Displays complete interest rate history for each loan account
- Shows rate periods with start and end dates
- Calculates accrued interest for each rate period
- Highlights current rate period (no end date)
- Shows total accrued interest across all periods

**Columns**:
1. **Interest Rate**: Rate percentage with icon
2. **Start Date**: When this rate became effective
3. **End Date**: When next rate started (or "Current" for active rate)
4. **Days**: Number of days at this rate
5. **Accrued Interest**: Interest accumulated during this period

**Calculation Formula**:
```
Accrued Interest = (Principal × Rate × Days) / (365 × 100)
```

**Key Features**:
- Automatically handles rate changes
- Considers loan start date (doesn't calculate interest before loan started)
- For current rate, calculates interest till today
- Shows total accrued interest in footer row
- Includes helpful notes explaining the calculation

#### Dashboard Integration
- New section: "Interest Rate History & Accrued Interest"
- Displays table for ALL loan accounts (both fixed and floating)
- Located below the floating interest rate charts
- One table per loan account

### 3. Enhanced Interest Calculations

#### Per-Period Interest Calculation
The system now calculates interest for each rate period separately:

1. **Historical Periods**: 
   - Start date: Rate effective date (or loan start date, whichever is later)
   - End date: Next rate's effective date
   - Interest calculated for exact number of days

2. **Current Period**:
   - Start date: Last rate change date
   - End date: Today
   - Interest calculated till current date

3. **Total Accrued Interest**:
   - Sum of all period interests
   - Displayed in table footer
   - Matches the accrued interest shown on account cards

### 4. Interest Start Date

#### Implementation
When creating a new loan account, the initial interest rate entry uses the **loan start date** as the effective date, not the current date.

**Key Points**:
- Interest rate history starts from loan start date
- Ensures accurate interest calculation from loan inception
- No interest is calculated before the loan start date
- Aligns with real-world loan practices

**Example**:
- Loan Start Date: January 1, 2025
- Account Created: January 15, 2025
- Interest Rate Effective Date: January 1, 2025 (not January 15)
- Interest accrues from January 1, 2025

#### Code Implementation
In `AccountForm.tsx`, when creating a loan account:
```typescript
await interestRateApi.addInterestRate({
  account_id: newAccount.id,
  interest_rate: parseFloat(formData.current_interest_rate),
  effective_date: formData.loan_start_date, // Uses loan start date
});
```

### 5. Total Accrued Interest Display

#### Dashboard Enhancement
Added a prominent summary card showing **Total Accrued Interest** across all loan accounts.

**Features**:
- Fifth summary card in top metrics row
- Displays total accrued interest from all loans
- Amber color scheme for visual distinction
- Updates automatically with loan data
- Shows amount in user's default currency

**Location**: Top row alongside Total Assets, Total Liabilities, Liquid Assets, and Working Capital

#### Accounts Page Enhancement
Added a summary badge at the top of the Loan Accounts section.

**Features**:
- Displays total accrued interest for all loans
- Amber background with border for emphasis
- Only shows when accrued interest > 0
- Positioned next to "Loan Accounts" heading
- Responsive design for all screen sizes

**Benefits**:
- Quick visibility of total interest obligations
- No manual calculation needed
- Better financial planning and tracking
- Consistent visual design across pages

**See**: `ACCRUED_INTEREST_DISPLAY.md` for detailed documentation

### 6. Future Enhancement: Automatic Interest Posting

#### Planned Feature
On the due date each month, the system should:
1. Calculate interest for the month
2. Create a transaction of type "interest_charge"
3. Add this interest to the loan balance
4. Record the transaction with proper details

#### Implementation Notes
This feature requires:
- A scheduled job (cron) or Edge Function
- New transaction type: "interest_charge"
- Logic to check if interest has already been posted for the month
- Calculation based on current interest rate and outstanding balance

#### Manual Workaround (Current)
Users can manually:
1. View accrued interest on the dashboard
2. Create an "expense" transaction for the interest amount
3. Apply it to the loan account to increase the balance

## User Scenarios

### Scenario 1: Creating a New Loan
1. Navigate to Accounts → Add Account
2. Select "Loan" as account type
3. Fill in loan details:
   - Principal amount
   - Tenure in months
   - **Start date** (e.g., January 1, 2025)
   - **Due date** (e.g., 15 for 15th of each month)
   - Interest rate type (Fixed/Floating)
   - Current interest rate
4. System automatically:
   - Calculates EMI
   - Creates initial interest rate history entry **with effective date = loan start date**
   - Displays due date on account card
   - Interest calculation begins from loan start date, not account creation date

### Scenario 2: Viewing Interest Rate History
1. Navigate to Dashboard
2. Scroll to "Interest Rate History & Accrued Interest" section
3. View table showing:
   - All rate changes with dates
   - Days at each rate
   - Interest accrued during each period
   - Total accrued interest
4. Compare with accrued interest shown on account card

### Scenario 3: Updating Floating Interest Rate
1. Navigate to Accounts page
2. Find loan account with floating rate
3. Click "Update Rate" in the Interest Rate Manager
4. Enter new rate and effective date
5. System automatically:
   - Records new rate in history
   - Updates account's current rate (via trigger)
   - Recalculates accrued interest
6. View updated history table on Dashboard
7. See new rate period with accrued interest

### Scenario 4: Tracking Monthly Payments
1. Check loan account card for:
   - Due date (e.g., "15 of each month")
   - Monthly EMI amount
   - Current accrued interest
2. On due date:
   - Note the accrued interest amount
   - Create a loan payment transaction
   - Include principal + interest in payment
3. View updated balance after payment

## Technical Details

### Type Definitions
Updated `src/types/types.ts`:
```typescript
export interface Account {
  // ... existing fields
  due_date: number | null;  // Day of month (1-31)
}
```

### Database Schema
```sql
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS due_date integer;

ALTER TABLE accounts
ADD CONSTRAINT check_due_date_range
CHECK (due_date IS NULL OR (due_date >= 1 AND due_date <= 31));
```

### Interest Rate History Query
The InterestRateTable component:
1. Fetches all interest rate history for the account
2. Sorts by effective date
3. Calculates periods between rate changes
4. Computes interest for each period
5. Displays in formatted table

### Calculation Logic
```typescript
// For each rate period
const days = differenceInDays(endDate, startDate);
const accruedInterest = (principal * rate * days) / (365 * 100);
```

## Testing Checklist

### Due Date Feature
- ✅ Can create loan with due date
- ✅ Due date displays on account card
- ✅ Due date is required for loan accounts
- ✅ Can edit due date
- ✅ Due date validation (1-31)

### Interest Rate History Table
- ✅ Table displays for all loan accounts
- ✅ Shows correct rate periods
- ✅ Calculates days correctly
- ✅ Accrued interest matches formula
- ✅ Current period shows "Current" label
- ✅ Total accrued interest is correct
- ✅ Handles single rate (no changes)
- ✅ Handles multiple rate changes
- ✅ Considers loan start date

### Interest Start Date
- ✅ Initial interest rate uses loan start date
- ✅ Interest calculation starts from loan start date
- ✅ Not affected by account creation date
- ✅ Accurate historical interest calculation

### Integration
- ✅ Dashboard shows tables for all loans
- ✅ Tables update after rate changes
- ✅ Accrued interest matches account card
- ✅ No linting errors
- ✅ Responsive design works

## Files Modified

### New Files
1. `supabase/migrations/00006_add_loan_due_date.sql` - Database migration for due_date field
2. `src/components/InterestRateTable.tsx` - Interest rate history table component
3. `LOAN_ENHANCEMENTS.md` - This documentation file
4. `ACCRUED_INTEREST_DISPLAY.md` - Detailed documentation for total accrued interest display
5. `INTEREST_START_DATE_UPDATE.md` - Documentation for interest start date feature

### Modified Files
1. `src/types/types.ts` - Added due_date to Account interface
2. `src/pages/AccountForm.tsx` - Added due_date input field and interest start date logic
3. `src/pages/Accounts.tsx` - Display due_date on loan cards + total accrued interest summary badge
4. `src/pages/Dashboard.tsx` - Added InterestRateTable section + total accrued interest summary card

## Future Enhancements

### 1. Automatic Interest Posting
- Implement Supabase Edge Function
- Schedule to run daily
- Check for loans with due date = today
- Calculate and post interest transactions
- Send notifications to users

### 2. Interest Payment Tracking
- Track which months interest has been paid
- Show payment history
- Alert for overdue payments
- Calculate late payment penalties

### 3. Loan Amortization Schedule
- Generate complete amortization table
- Show principal vs interest breakdown
- Track remaining balance over time
- Export to PDF/Excel

### 4. Payment Reminders
- Email/SMS reminders before due date
- Configurable reminder days (e.g., 3 days before)
- Include payment amount and account details

### 5. Interest Rate Forecasting
- For floating rates, show historical trends
- Predict future rates based on patterns
- Calculate potential future EMI changes

## Notes

### Interest Calculation Accuracy
- Uses simple interest calculation
- Based on 365-day year
- Calculates exact days at each rate
- Matches standard banking practices

### Data Integrity
- Interest rate history is immutable
- Each rate change creates new history entry
- Trigger ensures account rate stays in sync
- No data loss on rate updates

### Performance Considerations
- Interest calculations done client-side
- No database queries for calculations
- Efficient date arithmetic using date-fns
- Tables render quickly even with many rate changes

## Support

For questions or issues related to these features:
1. Check this documentation first
2. Review the code comments in components
3. Test with sample data
4. Verify database migrations applied correctly

## Version History

- **v1.1** (2025-11-30): Total Accrued Interest Display
  - Added total accrued interest summary card to Dashboard
  - Added total accrued interest summary badge to Accounts page
  - Enhanced visual prominence of interest tracking
  - Updated grid layout to accommodate new summary card

- **v1.0** (2025-11-30): Initial implementation
  - Added due_date field to track monthly payment due date
  - Created InterestRateTable component with per-period interest calculation
  - Integrated interest rate history tables into Dashboard
  - Updated Account forms and displays to show due date
  - Implemented interest start date = loan start date for accurate calculations
  - All interest calculations now start from loan inception date
