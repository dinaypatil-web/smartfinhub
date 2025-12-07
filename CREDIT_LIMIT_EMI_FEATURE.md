# Credit Card Limit & EMI Feature

## Overview
This feature adds comprehensive credit card limit management and EMI (Equated Monthly Installment) tracking to the Personal Finance Manager application.

## Features Implemented

### 1. Credit Card Limit Management
- **User-Defined Credit Limits**: Users can set their own credit limit for each credit card
- **Credit Utilization Tracking**: Real-time calculation and display of credit utilization percentage
- **Available Credit Display**: Shows remaining available credit at all times
- **Visual Indicators**: Color-coded progress bars and badges to indicate utilization levels
  - Green (Safe): 0-79% utilization
  - Amber (Warning): 80-99% utilization
  - Red (Danger): 100%+ utilization (over limit)

### 2. Credit Limit Warnings
- **Transaction Validation**: Prevents transactions that would exceed the credit limit
- **Real-time Alerts**: Warning messages displayed when approaching or exceeding limit
- **Threshold-based Warnings**: 
  - Warning at 80% utilization
  - Danger alert at 100% utilization

### 3. EMI (Equated Monthly Installment) System
- **EMI Option on Transactions**: Users can opt to convert credit card purchases into EMIs
- **Flexible EMI Duration**: User-defined number of months (1-60 months)
- **Bank Charges**: Support for bank processing charges on EMI transactions
- **EMI Calculation**: Automatic calculation of monthly installment amount
  - Formula: `Monthly EMI = (Purchase Amount + Bank Charges) / Number of Months`

### 4. EMI Tracking & Display
- **Active EMI List**: View all active EMIs for each credit card
- **EMI Details Display**:
  - Transaction description
  - Monthly EMI amount
  - Total EMI months
  - Remaining installments
  - Remaining amount to be paid
  - Progress indicator
- **Statement Amount Calculation**: 
  - Formula: `Statement Amount = Current Balance + Sum of Monthly EMI Installments`
  - Displayed on both Dashboard and Accounts pages

### 5. Dashboard Enhancements
- Credit limit and available credit display for each credit card
- Credit utilization percentage with color-coded indicators
- Warning icons for high utilization
- Active EMI summary (shows up to 2 EMIs per card)
- Total statement amount calculation including EMIs

### 6. Accounts Page Enhancements
- Detailed credit limit information with progress bars
- Complete list of all active EMIs per card
- Individual EMI details with progress tracking
- Total statement amount prominently displayed
- Color-coded utilization warnings

## Database Schema

### New Column: `accounts.credit_limit`
- Type: `numeric`
- Nullable: Yes (only applicable to credit cards)
- Purpose: Stores the user-defined credit limit for credit cards

### New Table: `emi_transactions`
```sql
CREATE TABLE emi_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  purchase_amount numeric NOT NULL,
  bank_charges numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  emi_months integer NOT NULL,
  monthly_emi numeric NOT NULL,
  remaining_installments integer NOT NULL,
  description text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Database Functions
- `calculate_emi_amount()`: Calculates monthly EMI amount
- `get_active_emis_by_account()`: Retrieves all active EMIs for an account
- `update_emi_installment()`: Updates remaining installments (for future payment processing)

## File Structure

### New Files Created
1. **`supabase/migrations/00008_add_credit_limit_and_emi.sql`**
   - Database migration for credit limit and EMI tables
   - RLS policies for data security
   - Helper functions for EMI calculations

2. **`src/utils/emiCalculations.ts`**
   - Utility functions for EMI and credit limit calculations
   - Functions include:
     - `calculateMonthlyEMI()`
     - `calculateTotalEMIAmount()`
     - `calculateAvailableCredit()`
     - `calculateCreditUtilization()`
     - `getCreditLimitWarningLevel()`
     - `validateCreditLimit()`
     - `calculateStatementAmount()`
     - And more...

### Modified Files
1. **`src/types/types.ts`**
   - Added `credit_limit` to Account interface
   - Added `EMITransaction` interface
   - Added `EMIStatus` type
   - Added `AccountWithEMI` type

2. **`src/db/api.ts`**
   - Added `emiApi` with 8 CRUD operations:
     - `createEMI()`
     - `getEMIById()`
     - `getActiveEMIsByAccount()`
     - `getAllEMIsByAccount()`
     - `updateEMI()`
     - `updateEMIInstallment()`
     - `completeEMI()`
     - `deleteEMI()`

3. **`src/pages/AccountForm.tsx`**
   - Added credit limit input field (conditional for credit cards)
   - Added credit limit to form state and save logic
   - Validation for credit limit values

4. **`src/pages/TransactionForm.tsx`**
   - Added EMI option checkbox for credit card transactions
   - Added EMI duration and bank charges inputs
   - Real-time EMI calculation display
   - Credit limit validation before transaction
   - EMI creation on transaction submission
   - Warning alerts for credit limit violations

5. **`src/pages/Dashboard.tsx`**
   - Enhanced credit card display with:
     - Credit limit and utilization information
     - Progress bars for credit utilization
     - Active EMI summary
     - Total statement amount
     - Warning indicators

6. **`src/pages/Accounts.tsx`**
   - Comprehensive credit card details including:
     - Credit limit section with progress bars
     - Complete EMI list with details
     - Individual EMI progress tracking
     - Total statement amount calculation
     - Color-coded warnings

## Usage Guide

### Setting Credit Limit
1. Navigate to Accounts page
2. Edit an existing credit card or create a new one
3. Enter the credit limit in the "Credit Limit" field
4. Save the account

### Creating EMI Transaction
1. Go to Transactions page and click "Add Transaction"
2. Select a credit card account
3. Enter transaction details (amount, description, etc.)
4. Check the "Convert to EMI" checkbox
5. Enter EMI duration (number of months)
6. Enter bank charges (if applicable)
7. Review the calculated monthly EMI amount
8. Submit the transaction

### Viewing EMI Information
- **Dashboard**: See summary of active EMIs and statement amounts
- **Accounts Page**: View detailed EMI information for each credit card
- **Credit Limit Warnings**: Automatic alerts when approaching or exceeding limit

## Calculations

### EMI Calculation
```
Monthly EMI = (Purchase Amount + Bank Charges) / Number of Months
Total EMI Amount = Purchase Amount + Bank Charges
```

### Credit Utilization
```
Credit Utilization % = (Current Balance / Credit Limit) × 100
Available Credit = Credit Limit - Current Balance
```

### Statement Amount
```
Statement Amount = Current Balance + Σ(Monthly EMI for all active EMIs)
```

### Warning Levels
- **Safe**: Utilization < 80%
- **Warning**: Utilization >= 80% and < 100%
- **Danger**: Utilization >= 100%

## Security
- All EMI data is protected by Row Level Security (RLS)
- Users can only access their own EMI transactions
- Credit limit information is private to each user
- All database operations require authentication

## Future Enhancements (Not Implemented)
- Automatic EMI payment processing on due dates
- EMI payment history tracking
- Interest rate calculations for EMIs
- EMI foreclosure/prepayment options
- SMS/Email notifications for EMI due dates
- Credit score impact tracking
- EMI payment reminders

## Technical Notes
- All monetary calculations use `numeric` type for precision
- EMI status can be: 'active', 'completed', 'cancelled'
- Remaining installments are tracked for each EMI
- Statement amounts are calculated dynamically
- Credit limit validation happens before transaction creation
- All dates use `timestamptz` for timezone awareness
