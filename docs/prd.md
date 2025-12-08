# SmartFinHub Requirements Document
\n## 1. Application Overview\n
### 1.1 Application Name
SmartFinHub

### 1.2 Application Description
A comprehensive financial management web application designed for tracking and managing multiple financial accounts including cash, bank accounts, credit cards, and loans. The platform provides real-time balance updates, transaction recording, budget analysis, and detailed financial reporting.

### 1.3 Authentication System
- Login using email address or mobile number
- Email verification via verification link
- Mobile number verification via OTP (One-Time Password)
- **Twilio Integration**: Use Twilio API for sending OTP to mobile numbers during sign-up process
- Verified email or mobile number serves as username for secure data retrieval
- **Forgot Password Option**: Forgot password link displayed on login page
- Password reset via email verification link or mobile OTP
- User receives password reset link/OTP to registered email or mobile number
- After verification, user can set new password
- **Change Password on Dashboard**: Password change option available in user account settings on dashboard
- User must enter current password before setting new password
- Password change confirmation sent to registered email and mobile number
- **Mobile Number Update**: After registration through email ID, users can update their mobile number in account settings without OTP verification
- Updated mobile number immediately activated and available for login
- Once updated, users can login using either their registered email or updated mobile number
- Mobile number update feature accessible from user profile settings
- **Alternative Phone Verification Options** (optional implementation):
  - Email Confirmation: Send verification link to registered email address to confirm phone number change
  - Security Question: User answers pre-set security questions before updating phone number
  - Password Re-entry: Require user to re-enter account password to authorize phone number change
  - Authenticator App: Use third-party authenticator apps (Google Authenticator, Microsoft Authenticator) to generate verification codes
  - Biometric Verification: Fingerprint or face recognition on supported devices

## 2. Core Features
\n### 2.1 User Preferences
- Select default country from dropdown list
- Choose preferred currency for dashboard display
- Country and currency settings saved to user profile\n- Settings apply across all dashboard views and reports

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
- System displays statement date and due date reminders on dashboard
- Payment reminders shown on credit card account detail page
- Visual indicators for upcoming statement dates and due dates\n- **Credit Limit Alert**: System triggers alert notification when user attempts transaction that would exceed their set credit limit\n- Alert displayed before transaction confirmation to prevent overspending
- Current available credit displayed on credit card account page and dashboard

#### 2.2.4 Loan Account Configuration
- Select interest rate type: Fixed or Floating
- Input total principal loan amount
- Auto-calculate EMI based on principal, interest rate, and tenure\n- **EMI Payment History Entry**: During loan account creation, system prompts user to provide details of every EMI payment already made:\n  - EMI Payment Date: Date when each EMI was paid
  - EMI Amount Paid: Actual amount paid for each EMI installment
- User can add multiple historical EMI payment records during account setup
- **EMI Breakdown Calculation**: System automatically calculates for each EMI payment:
  - Principal Component: Portion of EMI payment applied to principal reduction
  - Interest Component: Portion of EMI payment applied to interest charges
- Calculation based on loan amount, interest rate, tenure, and payment date
- **Loan Account Statement Generation**: System generates detailed loan account statement showing:
  - Each EMI payment with date and amount
  - Principal and interest breakdown for each payment
  - Running balance of outstanding principal after each payment
  - Cumulative interest paid to date
  - Remaining loan balance
- **Accurate Accrued Interest Calculation**: System calculates precise accrued interest based on:
  - Historical EMI payment records
  - Interest component extracted from each EMI\n  - Current outstanding principal balance
  - Interest rate and payment schedule
- Accrued interest displayed on dashboard and loan account detail page
- **Edit EMI History**: User can add, edit, or delete historical EMI payment records at any time
- System recalculates principal/interest breakdown and accrued interest automatically when EMI history is modified

#### 2.2.5 Floating Interest Rate Management
- Record all interest rate changes from loan inception to current date
- User can update floating interest rate at any time
- System maintains complete historical record of rate changes
- Auto-calculate total accrued interest till date
- Display accrued interest on dashboard and account detail page
- Chart visualization showing floating interest rate history over time\n- **EMI Recalculation on Rate Change**: When floating interest rate is updated, system recalculates principal and interest components for all subsequent EMI payments
- Updated interest breakdown reflected in loan account statement

#### 2.2.6 Data Security
- **End-to-End Encryption**: All user data encrypted in database using industry-standard encryption algorithms
- **Zero-Knowledge Architecture**: Application creator and administrators have no access to decrypted user data
- **Client-Side Encryption**: User data encrypted on client side before transmission to server
- **User-Specific Encryption Keys**: Each user's data encrypted with unique encryption key derived from user credentials
- Encryption keys never stored on server in plain text
- Bank account numbers encrypted in database
- Credit card numbers encrypted in database
- Loan account numbers encrypted in database
- Transaction details encrypted in database
- Personal information encrypted in database
- Budget data encrypted in database
- Account balances encrypted in database
- All financial data encrypted at rest and in transit
- Account data accessible only by authenticated account owner with valid decryption credentials
- **Data Privacy Guarantee**: System architecture ensures that even database administrators and application developers cannot access or view user's financial information
\n#### 2.2.7 Account Modification
- Edit any account information at any time
- Delete accounts with user confirmation

### 2.3 Transaction Management

#### 2.3.1 Transaction Types
- Income transactions
- Expense transactions
- Cash withdrawals (from bank account or credit card)
- Bank-to-bank transfers
- Loan payments\n- Credit card payments
\n#### 2.3.2 Transaction Processing Logic
- Credit card accounts displayed as negative balances\n- Loan accounts displayed as negative balances
- Cash withdrawal from credit card increases card balance (more negative)
- Payments to loan accounts decrease loan balance (less negative)
- Payments to credit card decrease card balance (less negative)\n- During expense transaction entry, display remaining budget balance for the selected budget category for current month
- Show budget balance information prominently before transaction confirmation to help user make informed spending decisions
- Dashboard auto-updates after each transaction
- Screen refreshes automatically after transaction entry

#### 2.3.3 Credit Card Transaction with EMI Option
- **EMI Payment Option**: During credit card transaction entry, system prompts user to select payment method
- Payment options: Full Payment or EMI (Equated Monthly Installment)\n- **EMI Configuration**: If EMI option selected, user provides:\n  - EMI Duration: Number of months for installment plan
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
  - Next EMI due amount\n  - Outstanding EMI balance\n- EMI transactions tracked separately from regular credit card balance
- Monthly EMI amount automatically added to credit card statement on statement generation day
\n#### 2.3.4 Transaction Modification
- Edit any transaction record
- Delete transactions with automatic balance recalculation\n
### 2.4 Dashboard Display

#### 2.4.1 Financial Summary
- Current Assets: Sum of Cash and Bank Account balances\n- Current Liabilities: Sum of Credit Card balances only
- Liquid Assets: Sum of Cash and Bank Account balances
- Loan accounts excluded from Current Liabilities calculation
- Loan accounts excluded from Liquid Assets calculation
- Total accrued interest displayed for each loan account

#### 2.4.2 Visual Analytics
- 3D pie chart showing Cash and Bank Account balance distribution
- 3D pie chart showing Expenses breakdown by category
- Line chart displaying Floating Interest Rate history for loan accounts

#### 2.4.3 Account Display Cards
- Bank or financial institution logo
- Account type indicator
- Last 4 digits of account number only
- Real-time current balance
- For loan accounts: Total accrued interest till date
- **For credit card accounts**: 
  - Display next statement date and payment due date as reminders
  - Show user-defined credit limit
  - Display available credit remaining
  - Show active EMI transactions count\n  - Display total outstanding EMI balance
  - Show next EMI installment amount and due date\n- Visual indicators highlighting upcoming statement dates and due dates within 7 days

#### 2.4.4 Account Quick View\n- **Click-to-View Statement**: When user clicks on any account card on dashboard, system displays popup window showing last 90 days statement for that account
- Popup includes transaction history, balance changes, and account activity for the 90-day period
- **For loan accounts**: Popup displays detailed EMI payment history with principal and interest breakdown for each payment within the 90-day period
- Statement popup available for all account types: Cash, Bank, Credit Card, and Loan accounts
- Close button to dismiss popup and return to dashboard

### 2.5 Budget Management
- Input monthly budgeted income amounts
- Input monthly budgeted expense amounts by category
- Compare actual expenses against budgeted amounts
- Display budget variance (over/under budget) on dashboard
- Monthly budget tracking and analysis
- Editing or saving budget automatically triggers immediate update of Budget vs. Actual analysis
- Real-time recalculation of budget variance when budget values are modified
- Updated Budget vs. Actual analysis immediately reflected on dashboard and reports
- System recalculates remaining budget for each category after budget modification

### 2.6 Reporting
- Transaction history reports with date range filters
- Income and expense summary reports
- Account balance reports across all accounts
- Budget vs. actual analysis reports
- **Credit Card Monthly Statement Report**: Reports section includes credit card statement view with month selector
- User selects specific month from dropdown to view credit card statement for that period
- Statement displays all transactions, payments, EMI installments, interest charges, and balance for selected month
- Statement shows opening balance, closing balance, total spending, and payment due information
- **EMI Transaction Reports**: Detailed reports showing all EMI transactions, payment schedules, and outstanding balances\n- **Loan Account Statement Report**: Comprehensive loan statement report showing:
  - Complete EMI payment history with dates and amounts
  - Principal and interest breakdown for each EMI payment
  - Outstanding principal balance after each payment
  - Cumulative interest paid to date
  - Total accrued interest\n  - Remaining loan tenure
  - Amortization schedule
- Date range filter for loan statement reports
- Export reports functionality\n
## 3. Design Style

### 3.1 Color Scheme
- Primary color: Deep blue (#1E3A8A) conveying trust and financial stability
- Secondary color: Emerald green (#10B981) for positive balances and income indicators
- Accent color: Amber (#F59E0B) for alerts and important notifications\n- Negative indicator: Coral red (#EF4444) for liabilities and overspending

### 3.2 Visual Details
- Card-based layout with subtle drop shadows for depth\n- Rounded corners (8px radius) for modern, approachable aesthetic
- Smooth hover transitions on interactive elements
- Clear iconography for transaction types and account categories\n- Consistent spacing and padding throughout interface

### 3.3 Layout Structure\n- Grid-based dashboard for account cards with responsive columns
- Side navigation panel for main sections: Accounts, Transactions, Reports, Budget, Settings
- Responsive design adapting seamlessly to desktop, tablet, and mobile screens
- Clear visual hierarchy with prominent balance displays and chart visualizations
- Sticky header for easy navigation access