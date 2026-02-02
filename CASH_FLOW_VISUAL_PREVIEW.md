# Cash Flow Statement Report - Visual Preview

## 📱 User Interface Layout

### Reports Page Navigation
```
┌─────────────────────────────────────────────────────────┐
│ REPORTS                                                  │
│ View and analyze your financial data                    │
└─────────────────────────────────────────────────────────┘

Tab Navigation:
┌──────────┬────────────────┬──────────────┬──────────┬──────────────────┐
│ Summary  │ Transaction    │ Account      │ Cash     │ Credit Card      │
│          │ History        │ Balances     │ Flow ✓   │ Statement        │
└──────────┴────────────────┴──────────────┴──────────┴──────────────────┘
                                         ^ NEW TAB
```

---

## 🎯 Cash Flow Statement Tab Layout

### Month Selection
```
┌─────────────────────────────────────────────────┐
│ Cash Flow Statement                              │
├─────────────────────────────────────────────────┤
│ Select Month                                     │
│ [2026-02] ▼  (Month input field)                │
└─────────────────────────────────────────────────┘
```

### Period Header
```
┌─────────────────────────────────────────────────┐
│          February 2026                           │
│        Cash Flow Analysis                        │
└─────────────────────────────────────────────────┘
```

### Opening Balance
```
┌─────────────────────────────────────────────────┐
│ Opening Balance          ₹ 125,450.00            │
└─────────────────────────────────────────────────┘
   (Muted background)
```

---

## 💰 Operating Activities Card

```
┌─────────────────────────────────────────────────┐
│ OPERATING ACTIVITIES                            │
├─────────────────────────────────────────────────┤
│ ┃ Cash Inflows (Income)                         │
│ ┃                            + ₹ 85,000.00      │
│ ┃ (Green border, green text)                   │
│                                                 │
│ ┃ Cash Outflows (Expenses)                      │
│ ┃                            - ₹ 32,500.00      │
│ ┃ (Red border, red text)                       │
│                                                 │
│ Net Operating Cash Flow                         │
│ (Blue highlight)              + ₹ 52,500.00    │
└─────────────────────────────────────────────────┘
```

---

## 📊 Investing Activities Card

```
┌─────────────────────────────────────────────────┐
│ INVESTING ACTIVITIES                            │
├─────────────────────────────────────────────────┤
│ ⚠ Transfers                                     │
│                            - ₹ 15,000.00        │
│ (Orange border)                                 │
│                                                 │
│ Net Investing Cash Flow                         │
│ (Blue highlight)              - ₹ 15,000.00    │
└─────────────────────────────────────────────────┘
```

---

## 🏦 Financing Activities Card

```
┌─────────────────────────────────────────────────┐
│ FINANCING ACTIVITIES                            │
├─────────────────────────────────────────────────┤
│ ◼ Loan Payments                                 │
│                            - ₹ 8,500.00         │
│ (Red border)                                    │
│                                                 │
│ ◼ Credit Card Repayments                        │
│                            - ₹ 5,000.00         │
│ (Red border)                                    │
│                                                 │
│ ◼ Withdrawals                                   │
│                            - ₹ 3,000.00         │
│ (Red border)                                    │
│                                                 │
│ Net Financing Cash Flow                         │
│ (Blue highlight)              - ₹ 16,500.00    │
└─────────────────────────────────────────────────┘
```

---

## 📈 Summary Metrics (3-Column Grid)

```
┌──────────────────┬──────────────────┬──────────────────┐
│ Net Cash Flow    │ Opening Balance  │ Closing Balance  │
│                  │                  │                  │
│ +₹ 21,000.00    │ ₹ 125,450.00     │ ₹ 146,450.00    │
│ (Blue border)    │ (Purple border)  │ (Green border)  │
│ (Green text)     │ (Purple text)    │ (Green text)    │
└──────────────────┴──────────────────┴──────────────────┘
```

---

## ✅ Reconciliation Section

```
┌─────────────────────────────────────────────────┐
│ RECONCILIATION                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│     ┌─────────────────────────────┐            │
│     │ Opening Balance             │            │
│     │ ₹ 125,450.00                │            │
│     └─────────────────────────────┘            │
│              ↓                                  │
│              ↓                                  │
│     Operating Cash Flow                        │
│                     + ₹ 52,500.00              │
│     Investing Cash Flow                        │
│                     - ₹ 15,000.00              │
│     Financing Cash Flow                        │
│                     - ₹ 16,500.00              │
│              ↓                                  │
│              ↓                                  │
│     ┌─────────────────────────────┐            │
│     │ Closing Balance             │            │
│     │ ₹ 146,450.00                │            │
│     │ (Green highlight)           │            │
│     └─────────────────────────────┘            │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Color Scheme

| Color | Usage | Purpose |
|-------|-------|---------|
| 🟢 **Green** | Inflows, Positive amounts | Money coming in |
| 🔴 **Red** | Outflows, Negative amounts | Money going out |
| 🔵 **Blue** | Borders, Summary sections | Activity categories |
| 🟣 **Purple** | Opening balance | Starting position |
| 🟨 **Orange** | Transfer borders | Internal movements |
| ⚫ **Muted** | Background highlights | Secondary info |

---

## 📱 Responsive Behavior

### Desktop (1920px+)
- All cards displayed side-by-side in full grid
- Full reconciliation flow visible
- 3-column metric cards in grid

### Tablet (768px-1024px)
- Tab labels wrap appropriately
- Cards stack 2x2 grid
- Reconciliation section reformatted for space

### Mobile (< 768px)
- Tab labels scroll horizontally
- Cards stack vertically
- Reconciliation section simplified
- Month input takes full width

---

## ⚡ Interactive Features

### Month Selection
```
Click input field → Calendar picker appears
Select month → Report updates instantly
No page reload required
Real-time calculation
```

### Color Indicators
- **Green** amounts = Positive (income, positive balances)
- **Red** amounts = Negative (expenses, payments, withdrawals)
- **Blue** backgrounds = Summary sections
- Helps quickly identify cash movements

### Values Formatted
```
All monetary values use:
- User's default currency (₹ for INR, $ for USD, etc.)
- Proper currency symbol
- Thousand separators
- 2 decimal places
```

---

## 📊 Example Report: February 2026

```
═══════════════════════════════════════════════════════
                  CASH FLOW STATEMENT
                     February 2026
═══════════════════════════════════════════════════════

Opening Balance (Jan 31):              ₹ 125,450.00

───────────────────────────────────────────────────────
OPERATING ACTIVITIES
  Income (Salary, freelance work, etc.)  + ₹ 85,000
  Expenses (Groceries, utilities, etc.)  - ₹ 32,500
  Net Operating Cash Flow                + ₹ 52,500

INVESTING ACTIVITIES
  Transfers (Between accounts)           - ₹ 15,000
  Net Investing Cash Flow                - ₹ 15,000

FINANCING ACTIVITIES
  Loan Payments                          - ₹ 8,500
  Credit Card Payments                   - ₹ 5,000
  Cash Withdrawals                       - ₹ 3,000
  Net Financing Cash Flow                - ₹ 16,500

───────────────────────────────────────────────────────
Net Cash Flow (all activities)           + ₹ 21,000
───────────────────────────────────────────────────────

Closing Balance (Feb 28):               ₹ 146,450.00

═══════════════════════════════════════════════════════
```

---

## 🔄 Data Flow

```
User Selects Month
       ↓
System Filters Transactions for that Month
       ↓
Categorize by Type:
  • Income/Expense → Operating
  • Transfers → Investing
  • Loan/CC Payments/Withdrawals → Financing
       ↓
Calculate Nets:
  • Operating = Income - Expenses
  • Investing = -Transfers
  • Financing = -(Loans + CC + Withdrawals)
       ↓
Calculate Balances:
  • Opening = Sum of non-loan accounts
  • Net Flow = Op + Inv + Fin
  • Closing = Opening + Net Flow
       ↓
Display Report with Visual Formatting
       ↓
User Can Switch Months and View Different Periods
```

---

## ✨ Key Features Visualization

```
┌─────────────────────────────────────────┐
│   CASH FLOW STATEMENT FEATURES           │
├─────────────────────────────────────────┤
│                                          │
│  ✓ Month Selection              📅      │
│    Choose any month in the past          │
│                                          │
│  ✓ Three-Activity Breakdown      📊     │
│    Operating, Investing, Financing      │
│                                          │
│  ✓ Opening & Closing Balance    💰      │
│    See starting and ending cash         │
│                                          │
│  ✓ Reconciliation Section       ✅      │
│    Verify calculations are correct      │
│                                          │
│  ✓ Color-Coded Display          🎨      │
│    Green/Red for positive/negative      │
│                                          │
│  ✓ Currency Support             💵      │
│    Uses your default currency           │
│                                          │
│  ✓ Responsive Design            📱      │
│    Works on mobile, tablet, desktop     │
│                                          │
│  ✓ Real-time Updates            ⚡      │
│    Changes update instantly             │
│                                          │
└─────────────────────────────────────────┘
```

---

## 🚀 How It Looks in Action

### Step 1: Navigate to Reports
User clicks "Reports" in main menu

### Step 2: Select Cash Flow Tab
Tab bar shows: [Summary] [Transactions] [Balances] [**Cash Flow**] [Credit Card]

### Step 3: Pick a Month
Month input field shows current month (February 2026)
User can click to change to any month

### Step 4: View Report
All cards populate with data:
- Opening balance shows current account totals
- Activity cards show breakdowns
- Summary cards show final metrics
- Reconciliation shows the math

### Step 5: Switch Months
Click month field → Select different month
Report updates instantly with new data

---

## 💡 Use Case Example

**Scenario: Manager reviewing January cash flow**

1. Navigate to Reports → Cash Flow tab
2. Change month to January 2026
3. See operating activities: +₹ 62,000 (positive!)
4. Check investing activities: -₹ 10,000 (moved some funds)
5. Review financing activities: -₹ 12,000 (debt payments)
6. Net cash flow: +₹ 40,000 (great month!)
7. Closing balance increased from ₹ 100,000 to ₹ 140,000
8. Manager notes: "Strong operating cash flow, on track with goals"

---

**This Cash Flow Statement provides complete visibility into financial health with an intuitive, color-coded interface.**
