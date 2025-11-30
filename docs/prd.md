# SmartFinHub Requirements Document

## 1. Application Overview

### 1.1 Application Name
SmartFinHub

### 1.2 Application Description
A comprehensive financial management web application for tracking and managing cash, multiple bank accounts, credit cards, and loan accounts with real-time balance updates, transaction recording, and budget analysis.

### 1.3 Login Method\n- Login via email address or mobile number
- Email verification through verification link
- Mobile number verification through OTP
- Verified email/mobile serves as username for data retrieval

## 2. Core Features
\n### 2.1 User Settings
- Select default country and currency for dashboard display
- Country and currency preferences saved per user profile\n
### 2.2 Account Management

**Add/Edit Accounts:**
- Cash accounts
- Bank accounts
- Credit card accounts
- Loan accounts

**Account Information:**
- Country selection from dropdown list
- Bank/financial institution selection based on country
- Display bank/financial institution logo on add account page and dashboard
- Manual bank name entry if not in list, with automatic logo fetching from internet\n- Optional account number entry (stored securely, only last 4 digits displayed on dashboard)
- For loan accounts: select Fixed or Floating interest rate type

**Floating Interest Rate Management:**
- Record interest rate changes from loan inception to current date
- Allow user to update floating interest rate as needed\n- Maintain complete history of interest rate changes
- Calculate and display accrued interest on dashboard

**Loan Account Details:**
- Input total principal loan amount
- Auto-calculate loan EMI based on principal, initial interest rate, and tenure
- Display accrued interest for information
- Chart showing floating interest rate history on dashboard

**Account Security:**
- Bank account numbers, credit card numbers, and loan account numbers stored in encrypted mode
- Data accessible only by the user

**Account Editing/Deletion:**
- User can edit or delete any account at any time
\n### 2.3 Transaction Management

**Transaction Types:**
- Income
- Expenses
- Withdrawal (from bank account or credit card)
- Bank transfers
- Loan payments
- Credit card payments\n
**Transaction Processing:**\n- Credit card and loan accounts treated as negative balances
- Cash withdrawal from credit card increases balance
- Payments to loan or credit card decrease balance
- Dashboard updates automatically after each transaction
- Screen refreshes after adding every transaction
\n**Transaction Editing/Deletion:**
- User can edit or delete any transaction

### 2.4 Dashboard Display\n
**Financial Overview:**\n- Current Assets (Cash and Bank Account balances)
- Current Liabilities (Credit card balances only)
- Liquid Assets (Cash and Bank Account balances)
- Loan accounts excluded from Current Liabilities and Liquid Assets
\n**Visual Reports:**
- 3D pie chart for Cash and Bank Account balances
- 3D pie chart for Expenses breakdown
- Chart displaying Floating Interest Rate history

**Account Display:**
- Bank/financial institution logos
- Last 4 digits of account numbers only
- Real-time balance updates

### 2.5 Budget Management
- Input budgeted income and expenses for every month\n- Analyze actual expenses against budget
- Display budget variance on dashboard

### 2.6 Reports
- Transaction history reports
- Income and expense reports
- Account balance reports
- Budget analysis reports

## 3. Design Style

### 3.1 Color Scheme
- Primary color: Deep blue (#1E3A8A) for trust and professionalism
- Secondary color: Emerald green (#10B981) for positive balances and income
- Accent color: Amber (#F59E0B) for alerts and important information
- Negative balance indicator: Coral red (#EF4444)

### 3.2 Visual Details\n- Card-based layout for account displays with subtle shadows
- Rounded corners (8px) for modern, friendly appearance
- Smooth transitions and hover effects on interactive elements\n- Clear iconography for transaction types and account categories

### 3.3 Layout
- Dashboard with grid layout for account cards
- Side navigation for main sections (Accounts, Transactions, Reports, Budget)
- Responsive design adapting to different screen sizes
- Clear visual hierarchy with prominent balance displays and charts