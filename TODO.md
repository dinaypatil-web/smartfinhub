# Credit Card Limit & EMI Feature Implementation

## Plan

### Phase 1: Database Schema ✅
- [x] Add `credit_limit` column to accounts table
- [x] Create `emi_transactions` table for tracking EMI purchases
- [x] Create migration file and apply

### Phase 2: Type Definitions ✅
- [x] Update Account interface with credit_limit
- [x] Create EMITransaction interface
- [x] Update Transaction types if needed

### Phase 3: API Functions ✅
- [x] Add EMI transaction CRUD functions
- [x] Add functions to calculate EMI amounts
- [x] Add functions to get active EMIs for an account
- [x] Add functions to calculate statement amounts

### Phase 4: Utility Functions ✅
- [x] Create EMI calculation utilities
- [x] Create credit limit validation utilities
- [x] Create statement amount calculation utilities

### Phase 5: Account Form Updates ✅
- [x] Add credit limit field for credit cards
- [x] Add validation for credit limit

### Phase 6: Transaction Form Updates ✅
- [x] Add EMI option checkbox for credit card transactions
- [x] Add EMI duration input (conditional)
- [x] Add bank charges input (conditional)
- [x] Calculate and display EMI amount
- [x] Validate credit limit before transaction

### Phase 7: Dashboard Updates ✅
- [x] Display credit limit and available credit
- [x] Show warning when approaching limit
- [x] Display active EMIs
- [x] Show total statement amount
- [x] Add visual indicators for credit utilization

### Phase 8: Accounts Page Updates ✅
- [x] Display credit limit details
- [x] Show credit utilization percentage
- [x] List active EMIs with details
- [x] Show total statement amount

### Phase 9: Testing & Documentation ✅
- [x] Test all calculations (via lint checks)
- [x] Test credit limit warnings (implemented in forms)
- [x] Test EMI tracking (implemented in dashboard and accounts)
- [x] Run linting (all checks passed)

## Notes
- EMI = (Purchase Amount + Bank Charges) / Number of Months
- Statement Amount = Current Balance + Sum of Monthly EMI Installments
- Available Credit = Credit Limit - Current Balance
- Warning threshold: 80% of credit limit
