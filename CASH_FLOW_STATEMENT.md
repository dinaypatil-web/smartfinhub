# Cash Flow Statement Report Feature

## Overview
A comprehensive Cash Flow Statement Report has been added to the Reports page, allowing users to analyze their monthly cash movements by categorizing them into three main activities: Operating, Investing, and Financing.

## Feature Details

### Location
- **Page**: Reports (available via navigation menu)
- **Tab**: "Cash Flow" (5th tab in the Reports page)

### Key Functionality

#### Month Selection
- Users can select any month using the month input field
- Defaults to the current month
- Updates the cash flow analysis dynamically

#### Cash Flow Statement Components

**1. Operating Activities**
- **Cash Inflows**: Total income transactions for the selected month
- **Cash Outflows**: Total expense transactions for the selected month
- **Net Operating Cash Flow**: Income minus Expenses

**2. Investing Activities**
- **Transfers**: Account-to-account transfers during the month
- **Net Investing Cash Flow**: Negative of all transfers (representing cash being deployed for investments)

**3. Financing Activities**
- **Loan Payments**: Total loan repayments made during the month
- **Credit Card Repayments**: Total credit card payments made during the month
- **Withdrawals**: Cash withdrawals to cash accounts during the month
- **Net Financing Cash Flow**: Total of all financing outflows

#### Summary Cards
Three key metrics are displayed:
1. **Net Cash Flow**: Sum of all three activity categories
2. **Opening Balance**: Total balance at the start of the month (sum of all non-loan accounts)
3. **Closing Balance**: Opening balance plus net cash flow

#### Reconciliation Section
A visual flow showing:
- Opening Balance
- ↓
- Net Operating Cash Flow
- Net Investing Cash Flow
- Net Financing Cash Flow
- ↓
- Closing Balance

This ensures users can verify that the calculation is correct.

## Transaction Classification

### Operating Activities
- Income transactions
- Expense transactions

### Investing Activities
- Transfer transactions between accounts

### Financing Activities
- Loan payments
- Credit card repayments
- Withdrawals

## Visual Design

### Color Coding
- **Success (Green)**: Positive cash flows, inflows
- **Danger (Red)**: Negative cash flows, outflows
- **Warning (Orange)**: Transfer activities
- **Blue**: Summary sections and reconciliation
- **Muted**: Opening/closing balances

### Cards and Layout
- Each activity section is displayed in its own card
- Summary metrics use styled cards with borders
- Reconciliation flow uses arrows and color-coded sections
- Responsive grid layout (works on mobile, tablet, and desktop)

## Calculation Logic

```
Net Cash Flow = 
  (Operating Activities) + 
  (Investing Activities) + 
  (Financing Activities)

Closing Balance = 
  Opening Balance + Net Cash Flow
```

### Opening Balance Calculation
The opening balance is calculated as the sum of all account balances at the time of report generation, excluding loan accounts (which represent liabilities).

## Benefits

1. **Cash Visibility**: Users can see exactly where their money is coming from and going to
2. **Monthly Tracking**: Analyze cash patterns month by month
3. **Activity Categorization**: Understand different types of cash movements
4. **Financial Planning**: Use historical cash flow data to plan future transactions
5. **Reconciliation**: Verify that all transactions are properly accounted for

## Integration with Existing Features

The Cash Flow Statement integrates seamlessly with:
- **Transactions**: Uses all existing transaction data
- **Accounts**: Reflects current account balances
- **Filters**: Uses the selected month for filtering

## Example Use Cases

1. **Seasonal Analysis**: Compare cash flows across different months
2. **Budget Planning**: Identify months with high outflows for better planning
3. **Business Analysis**: Understand operating vs. financing needs
4. **Cash Management**: Track cash balance trends over time
5. **Financial Health**: Monitor positive operating cash flow

## Technical Implementation

### Data Flow
1. User selects a month
2. System filters transactions for that month
3. Transactions are categorized by type
4. Amounts are aggregated by activity category
5. Opening and closing balances are calculated
6. Results are displayed in the Cash Flow Statement UI

### File Modified
- [src/pages/Reports.tsx](src/pages/Reports.tsx)

### New Components
- **CashFlowStatement Interface**: TypeScript interface defining the cash flow statement structure
- **calculateCashFlowStatement()**: Function that computes all cash flow metrics

### Currency Support
- All amounts are displayed in the user's default currency
- Currency symbol is automatically applied

## Future Enhancements

Potential features for future versions:
- Cash flow charts and visualizations
- Year-over-year comparison
- Projected cash flow based on patterns
- Export to PDF/Excel
- Multiple month comparison
- Trend analysis and forecasting
