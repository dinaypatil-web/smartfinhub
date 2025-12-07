# SmartFinHub Requirements Document

## 1. Application Overview

### 1.1 Application Name
SmartFinHub

### 1.2 Application Description
A comprehensive financial management web application designed for tracking and managing multiple financial accounts including cash, bank accounts, credit cards, and loans. The platform provides real-time balance updates, transaction recording, budget analysis, and detailed financial reporting.
\n### 1.3 Authentication System
- Login using email address or mobile number
- Email verification via verification link
- Mobile number verification via OTP (One-Time Password)
- **Twilio Integration**: Use Twilio API for sending OTP to mobile numbers during sign-up process
- Verified email or mobile number serves as username for secure data retrieval
- **Mobile Number Update**: After registration through email ID, users can update their mobile number in account settings
- Updated mobile number requires OTP verification via Twilio before activation
- Once verified, users can login using either their registered email or updated mobile number
- Mobile number update feature accessible from user profile settings

## 2. Core Features

### 2.1 User Preferences
- Select default country from dropdown list
- Choose preferred currency for dashboard display
- Country and currency settings saved to user profile
- Settings apply across all dashboard views and reports

### 2.2 Account Management
\n#### 2.2.1 Account Types
- Cash accounts
- Bank accounts
- Credit card accounts
- Loan accounts

#### 2.2.2 Account Setup\n- Country selection from dropdown menu\n- Bank or financial institution selection based on chosen country
- **Complete bank name list available in dropdown for all supported countries**
- Dropdown includes all major banks and financial institutions for selected country
- Display bank/financial institution logo on account pages and dashboard
- Manual bank name entry option if institution not listed
- **Automatic Logo Fetching**: When bank/loan/credit card account logo is not available in the system database during account creation or editing, automatically fetch the logo from internet sources
- Fetched logos displayed on both account pages and dashboard
- System caches fetched logos for future use
- Optional account number entry (encrypted storage, only last 4 digits visible on dashboard)

#### 2.2.3 Credit Card Configuration
- **Statement Day of Month**: User inputs the day of month when credit card statement is generated (1-31)
- **Due Day of Month**: User inputs the day of month when credit card payment is due (1-31)
- **Credit Card Limit**: User inputs their own credit limit for the card
- User-defined limit stored in credit card account profile
- Statement day and due day saved to credit card account profile
- System displays statement date and due date reminders on dashboard\n- Payment reminders shown on credit card account detail page
- Visual indicators for upcoming statement dates and due dates
- **Credit Limit Alert**: System triggers alert notification when user attempts transaction that would exceed their set credit limit
- Alert displayed before transaction confirmation to prevent overspending
- Current available credit displayed on credit card account page and dashboard

#### 2.2.4 Loan Account Configuration
- Select interest rate type: Fixed or Floating
- Input total principal loan amount
- Auto-calculate EMI based on principal, interest rate, and tenure

#### 2.2.5 Floating Interest Rate Management\n- Record all interest rate changes from loan inception to current date
- User can update floating interest rate at any time
- System maintains complete historical record of rate changes
- Auto-calculate total accrued interest till date
- Display accrued interest on dashboard and account detail page\n- Chart visualization showing floating interest rate history over time

#### 2.2.6 Data Security
- Bank account numbers encrypted in database
- Credit card numbers encrypted in database
- Loan account numbers encrypted in database
- Account data accessible only by authenticated account owner

#### 2.2.7 Account Modification\n- Edit any account information at any time
- Delete accounts with user confirmation

### 2.3 Transaction Management
\n#### 2.3.1 Transaction Types
- Income transactions
- Expense transactions
- Cash withdrawals (from bank account or credit card)
- Bank-to-bank transfers
- Loan payments
- Credit card payments

#### 2.3.2 Transaction Processing Logic\n- Credit card accounts displayed as negative balances
- Loan accounts displayed as negative balances
- Cash withdrawal from credit card increases card balance (more negative)
- Payments to loan accounts decrease loan balance (less negative)
- Payments to credit card decrease card balance (less negative)\n- During expense transaction entry, display remaining budget balance for the selected budget category for current month
- Show budget balance information prominently before transaction confirmation to help user make informed spending decisions
- Dashboard auto-updates after each transaction
- Screen refreshes automatically after transaction entry

#### 2.3.3 Credit Card Transaction with EMI Option
- **EMI Payment Option**: During credit card transaction entry, system prompts user to select payment method\n- Payment options: Full Payment or EMI (Equated Monthly Installment)\n- **EMI Configuration**: If EMI option selected, user provides:\n  - EMI Duration: Number of months for installment plan
  - Bank EMI Charges: Processing fee or interest charges applied by bank
- **EMI Calculation**: System automatically calculates monthly EMI amount based on transaction amount, duration, and bank charges
- **Statement Amount Calculation**: System calculates EMI amount to be included in monthly credit card statement
- **Dashboard Display**: EMI details displayed on dashboard including:
  - Total EMI amount
  - Monthly installment amount
  - Remaining EMI tenure
  - Total bank charges
- **Account Page Display**: Credit card account page shows:
  - Active EMI transactions list
  - EMI payment schedule
  - Next EMI due amount
  - Outstanding EMI balance
- EMI transactions tracked separately from regular credit card balance
- Monthly EMI amount automatically added to credit card statement on statement generation day

#### 2.3.4 Transaction Modification
- Edit any transaction record
- Delete transactions with automatic balance recalculation
\n### 2.4 Dashboard Display

#### 2.4.1 Financial Summary\n- Current Assets: Sum of Cash and Bank Account balances
- Current Liabilities: Sum of Credit Card balances only
- Liquid Assets: Sum of Cash and Bank Account balances
- Loan accounts excluded from Current Liabilities calculation
- Loan accounts excluded from Liquid Assets calculation
- Total accrued interest displayed for each loan account

#### 2.4.2 Visual Analytics\n- 3D pie chart showing Cash and Bank Account balance distribution
- 3D pie chart showing Expenses breakdown by category
- Line chart displaying Floating Interest Rate history for loan accounts

#### 2.4.3 Account Display Cards
- Bank or financial institution logo
- Account type indicator\n- Last 4 digits of account number only
- Real-time current balance
- For loan accounts: Total accrued interest till date
- **For credit card accounts**: \n  - Display next statement date and payment due date as reminders
  - Show user-defined credit limit
  - Display available credit remaining
  - Show active EMI transactions count
  - Display total outstanding EMI balance
  - Show next EMI installment amount and due date
- Visual indicators highlighting upcoming statement dates and due dates within 7 days

### 2.5 Budget Management\n- Input monthly budgeted income amounts
- Input monthly budgeted expense amounts by category
- Compare actual expenses against budgeted amounts
- Display budget variance (over/under budget) on dashboard
- Monthly budget tracking and analysis
- Editing or saving budget automatically triggers immediate update of Budget vs. Actual analysis
- Real-time recalculation of budget variance when budget values are modified
- Updated Budget vs. Actual analysis immediately reflected on dashboard and reports
- System recalculates remaining budget for each category after budget modification

### 2.6 Reporting\n- Transaction history reports with date range filters
- Income and expense summary reports
- Account balance reports across all accounts
- Budget vs. actual analysis reports
- **EMI Transaction Reports**: Detailed reports showing all EMI transactions, payment schedules, and outstanding balances\n- Export reports functionality
\n## 3. Design Style\n
### 3.1 Color Scheme
- Primary color: Deep blue (#1E3A8A) conveying trust and financial stability
- Secondary color: Emerald green (#10B981) for positive balances and income indicators
- Accent color: Amber (#F59E0B) for alerts and important notifications
- Negative indicator: Coral red (#EF4444) for liabilities and overspending

### 3.2 Visual Details
- Card-based layout with subtle drop shadows for depth
- Rounded corners (8px radius) for modern, approachable aesthetic\n- Smooth hover transitions on interactive elements
- Clear iconography for transaction types and account categories
- Consistent spacing and padding throughout interface\n
### 3.3 Layout Structure
- Grid-based dashboard for account cards with responsive columns
- Side navigation panel for main sections: Accounts, Transactions, Reports, Budget, Settings
- Responsive design adapting seamlessly to desktop, tablet, and mobile screens\n- Clear visual hierarchy with prominent balance displays and chart visualizations
- Sticky header for easy navigation access