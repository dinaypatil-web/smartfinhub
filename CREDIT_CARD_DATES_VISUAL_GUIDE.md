# Credit Card Payment Reminders - Visual Guide

## Feature Overview
This guide shows how the credit card statement and due date reminders appear in the SmartFinHub application.

---

## 1. Adding Credit Card Dates

### Account Form - Credit Card Section

When you add or edit a credit card, you'll see these new fields:

```
┌─────────────────────────────────────────────────────┐
│ Account Type: Credit Card                           │
├─────────────────────────────────────────────────────┤
│ Account Name: Chase Sapphire Preferred              │
│ Bank: Chase                                          │
│ Last 4 Digits: 1234                                  │
│ Outstanding Balance: $2,500.00                       │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Statement Day of Month                          │ │
│ │ [  15  ]                                        │ │
│ │ Day of the month when your credit card          │ │
│ │ statement is generated (1-31)                   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Payment Due Day of Month                        │ │
│ │ [  25  ]                                        │ │
│ │ Day of the month when your credit card          │ │
│ │ payment is due (1-31)                           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ [Save Account]                                       │
└─────────────────────────────────────────────────────┘
```

**Key Points**:
- Both fields are optional
- Values must be between 1 and 31
- Helpful descriptions guide the user
- Only appears for credit card accounts

---

## 2. Dashboard Display

### Credit Card Section - Normal State

```
┌─────────────────────────────────────────────────────────────┐
│ 💳 Credit Cards                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Chase Logo]  Chase Sapphire Preferred                     │
│                Credit Card • ****1234                       │
│                📄 Statement: 15th  💳 Due: 25th            │
│                                              $2,500.00      │
│                                                             │
│  [Amex Logo]   American Express Platinum                    │
│                Credit Card • ****5678                       │
│                📄 Statement: 1st  💳 Due: 21st             │
│                                              $1,200.00      │
└─────────────────────────────────────────────────────────────┘
```

### Credit Card Section - With Upcoming Dates (Highlighted)

When dates are within 7 days, they're highlighted:

```
┌─────────────────────────────────────────────────────────────┐
│ 💳 Credit Cards                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Chase Logo]  Chase Sapphire Preferred                     │
│                Credit Card • ****1234                       │
│                📄 Statement: 15th  💳 Due: 25th (RED!)     │
│                                              $2,500.00      │
│                                                             │
│  [Amex Logo]   American Express Platinum                    │
│                Credit Card • ****5678                       │
│                📄 Statement: 1st (AMBER!)  💳 Due: 21st    │
│                                              $1,200.00      │
└─────────────────────────────────────────────────────────────┘
```

**Color Coding**:
- 🟡 **Amber/Yellow**: Statement date within 7 days
- 🔴 **Red**: Payment due date within 7 days
- ⚪ **Gray**: Dates not coming soon

---

## 3. Accounts Page Display

### Credit Card Detail Card - Full View

```
┌───────────────────────────────────────────────────────────┐
│ [Chase Logo]  Chase Sapphire Preferred    [Credit Card]   │
│               Chase                                        │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ Card Number                                               │
│ •••• •••• •••• 1234                                       │
│                                                           │
│ Outstanding Balance                                       │
│ $2,500.00                                                 │
│                                                           │
│ ─────────────────────────────────────────────────────────│
│                                                           │
│ Statement Date                    15th of each month      │
│ Payment Due Date                  25th of each month      │
│                                                           │
│ [Edit]  [Delete]                                          │
└───────────────────────────────────────────────────────────┘
```

### With Upcoming Dates (Highlighted)

```
┌───────────────────────────────────────────────────────────┐
│ [Chase Logo]  Chase Sapphire Preferred    [Credit Card]   │
│               Chase                                        │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ Card Number                                               │
│ •••• •••• •••• 1234                                       │
│                                                           │
│ Outstanding Balance                                       │
│ $2,500.00                                                 │
│                                                           │
│ ─────────────────────────────────────────────────────────│
│                                                           │
│ Statement Date                    15th of each month      │
│ Payment Due Date         25th of each month (RED!)        │
│                                                           │
│ [Edit]  [Delete]                                          │
└───────────────────────────────────────────────────────────┘
```

---

## 4. Ordinal Suffix Examples

The system automatically formats day numbers with proper ordinal suffixes:

| Day | Display | Day | Display | Day | Display |
|-----|---------|-----|---------|-----|---------|
| 1   | 1st     | 11  | 11th    | 21  | 21st    |
| 2   | 2nd     | 12  | 12th    | 22  | 22nd    |
| 3   | 3rd     | 13  | 13th    | 23  | 23rd    |
| 4   | 4th     | 14  | 14th    | 24  | 24th    |
| 5   | 5th     | 15  | 15th    | 25  | 25th    |
| 10  | 10th    | 20  | 20th    | 31  | 31st    |

---

## 5. Use Cases

### Use Case 1: Single Credit Card
**Scenario**: User has one credit card with statement on 15th and payment due on 25th

**Dashboard View**:
- Shows: "📄 Statement: 15th  💳 Due: 25th"
- Highlights due date in red when it's December 18-25

**Accounts View**:
- Shows detailed reminder section
- Clear formatting: "15th of each month" and "25th of each month"

### Use Case 2: Multiple Credit Cards
**Scenario**: User has 3 credit cards with different billing cycles

**Dashboard View**:
```
Chase Sapphire:     📄 Statement: 15th  💳 Due: 25th
Amex Platinum:      📄 Statement: 1st   💳 Due: 21st
Citi Double Cash:   📄 Statement: 10th  💳 Due: 30th
```

**Benefit**: User can see all payment dates at a glance

### Use Case 3: Partial Information
**Scenario**: User only knows the due date, not the statement date

**Form Entry**:
- Statement Day: (leave empty)
- Due Day: 25

**Dashboard View**:
- Shows: "💳 Due: 25th"
- Statement date is not displayed (since it wasn't entered)

---

## 6. Smart Highlighting Logic

### 7-Day Window
The system highlights dates that are within 7 days:

**Example**: Today is December 18th

| Date Type | Day | Days Until | Highlighted? | Color |
|-----------|-----|------------|--------------|-------|
| Statement | 15th | -3 (passed) | No | Gray |
| Due       | 25th | 7 days | Yes | Red |
| Statement | 20th | 2 days | Yes | Amber |
| Due       | 30th | 12 days | No | Gray |

### Color Meanings
- **Amber/Yellow** (Statement): "Your statement is coming soon - review your charges"
- **Red** (Due Date): "Payment is due soon - make sure to pay on time"
- **Gray** (Normal): "Not urgent right now"

---

## 7. Responsive Design

### Desktop View
- Full layout with all information visible
- Side-by-side display of multiple cards
- Ample spacing for readability

### Mobile View
- Stacked layout
- Icons and dates remain visible
- Touch-friendly buttons
- Maintains color highlighting

---

## 8. Dark Mode Support

All colors are optimized for both light and dark modes:

**Light Mode**:
- Amber: `text-amber-600`
- Red: `text-red-600`
- Gray: `text-muted-foreground`

**Dark Mode**:
- Amber: `dark:text-amber-400`
- Red: `dark:text-red-400`
- Gray: `text-muted-foreground` (auto-adjusts)

---

## Summary

✅ **Clear Visual Indicators**: Icons and colors make dates easy to spot
✅ **Smart Highlighting**: Automatic color coding for upcoming dates
✅ **Proper Formatting**: Ordinal suffixes (1st, 2nd, 3rd) for readability
✅ **Flexible Input**: Optional fields - enter what you know
✅ **Multiple Views**: Consistent display on Dashboard and Accounts pages
✅ **Responsive**: Works on all screen sizes
✅ **Accessible**: High contrast colors and clear labels
