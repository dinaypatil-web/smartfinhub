# SmartFinHub - Financial Management Application

## Overview
SmartFinHub is a comprehensive financial management web application designed to help users track and manage their cash, bank accounts, credit cards, and loan accounts with real-time balance updates, transaction recording, and budget analysis.

## Key Features

### 1. User Authentication
- **Email & Phone Login**: Support for both email and phone number authentication
- **Email Verification**: Secure email verification via verification link
- **Phone OTP**: SMS-based one-time password verification
- **Secure Access**: First registered user automatically becomes admin

### 2. Account Management
- **Multiple Account Types**:
  - Cash Accounts (physical cash tracking)
  - Bank Accounts
  - Credit Card Accounts
  - Loan Accounts (with fixed or floating interest rates)
  
- **Account Features**:
  - Country and bank/institution selection
  - Automatic logo fetching for financial institutions (optional for cash accounts)
  - Secure storage (only last 4 digits of account numbers displayed)
  - Real-time balance tracking
  - Floating interest rate history for loans
  - Automatic EMI calculation for loan accounts
  - Cash accounts don't require institution names or account numbers

### 3. Transaction Management
- **Transaction Types**:
  - Income
  - Expenses
  - Withdrawals
  - Bank Transfers
  - Loan Payments
  - Credit Card Payments

- **Features**:
  - Automatic balance updates after each transaction
  - Category-based expense tracking
  - Transaction history with filtering
  - Edit and delete capabilities
  - Multi-currency support

### 4. Dashboard
- **Financial Overview**:
  - Current Assets (Cash and Bank Accounts)
  - Current Liabilities (Credit Card balances)
  - Liquid Assets (Cash and Bank Accounts)
  - Net Worth calculation

- **Visual Reports**:
  - Pie charts for cash and bank account distribution
  - Expense breakdown by category
  - Recent transactions list
  - Account cards with real-time balances

### 5. Budget Management
- **Monthly Budgeting**:
  - Set budgeted income and expenses
  - Track actual vs budgeted amounts
  - Category-wise budget allocation
  - Variance analysis with visual indicators

### 6. Settings
- **User Preferences**:
  - Default country selection
  - Default currency for dashboard display
  - Account information management

## Technical Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **Recharts** for data visualization
- **React Router** for navigation

### Backend
- **Supabase** for backend services:
  - PostgreSQL database
  - Authentication (email & phone)
  - Row Level Security (RLS) policies
  - Real-time subscriptions

### Database Schema
- **profiles**: User settings and preferences
- **accounts**: Financial accounts (bank, credit card, loan)
- **interest_rate_history**: Historical interest rates for floating rate loans
- **transactions**: All financial transactions
- **budgets**: Monthly budget planning
- **expense_categories**: System and custom expense categories

## Security Features
- Account numbers stored encrypted (only last 4 digits visible)
- Row Level Security (RLS) on all tables
- Users can only access their own data
- Admin role for system management
- Secure authentication with email/phone verification

## Color Scheme
- **Primary**: Deep Blue (#1E3A8A) - Trust and professionalism
- **Secondary**: Emerald Green (#10B981) - Positive balances and income
- **Accent**: Amber (#F59E0B) - Alerts and important information
- **Danger**: Coral Red (#EF4444) - Negative balances and expenses

## Getting Started

### Prerequisites
- Node.js 18+ installed
- pnpm package manager

### Installation
1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up environment variables in `.env`
4. Run development server: `pnpm run dev`

### First Time Setup
1. Register a new account (first user becomes admin)
2. Set your default country and currency in Settings
3. Add your financial accounts
4. Start recording transactions
5. Set up monthly budgets

## Database Notes
- **System Categories**: Pre-populated with common expense categories
- **No Sample Data**: Production-ready with no dummy data
- **First User Admin**: The first registered user automatically receives admin privileges

## Important Information
⚠️ **Admin Notification**: The first user to register will automatically be assigned the admin role. This user will have full access to all system features and data.

## Multi-Currency Support
- Supports 20+ major currencies
- Currency conversion handled at display level
- Each account can have its own currency
- Dashboard displays in user's default currency

## Responsive Design
- Desktop-first design optimized for financial management
- Fully responsive for mobile and tablet devices
- Touch-friendly interface for mobile users

## Future Enhancements
- Reports page with advanced filtering
- Export functionality (PDF, Excel, CSV)
- Recurring transactions
- Investment account tracking
- Multi-user household accounts
- Financial goal tracking
- Automated bank account syncing
