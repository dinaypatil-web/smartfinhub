# Credit Card Statement and Due Date Feature

## Overview
This feature adds statement date and payment due date tracking for credit card accounts. Users can now specify the day of the month when their credit card statement is generated and when payment is due, with visual reminders displayed on both the Dashboard and Accounts pages.

## Implementation Details

### Database Changes
**Migration File**: `supabase/migrations/00007_add_credit_card_dates.sql`

Added two new columns to the `accounts` table:
- `statement_day` (integer, nullable): Day of month (1-31) when credit card statement is generated
- `due_day` (integer, nullable): Day of month (1-31) when credit card payment is due

Both fields include database-level validation to ensure values are between 1 and 31.

### Type Definitions
**File**: `src/types/types.ts`

Updated the `Account` interface to include:
```typescript
statement_day: number | null;
due_day: number | null;
```

### Utility Functions
**File**: `src/utils/dateUtils.ts` (new file)

Created comprehensive date utility functions:
- `getOrdinalSuffix(day)`: Converts day numbers to ordinal format (1st, 2nd, 3rd, etc.)
- `formatDayOfMonth(day)`: Formats a day with ordinal suffix or returns "Not set"
- `getNextOccurrence(dayOfMonth)`: Calculates the next occurrence of a specific day
- `daysUntil(dayOfMonth)`: Calculates days until a specific day of month
- `isComingSoon(dayOfMonth)`: Checks if a date is within 7 days (for highlighting)

### Form Updates
**File**: `src/pages/AccountForm.tsx`

1. **State Management**: Added `statement_day` and `due_day` to form state
2. **Data Loading**: Updated account loading to populate the new fields
3. **Data Saving**: Updated account creation/update to save the new fields
4. **UI Fields**: Added two new input fields that appear only for credit card accounts:
   - Statement Day of Month (1-31)
   - Payment Due Day of Month (1-31)
   - Both include helpful descriptions and validation

### Dashboard Display
**File**: `src/pages/Dashboard.tsx`

Enhanced credit card display to show:
- Statement date with 📄 icon
- Due date with 💳 icon
- Color-coded highlighting:
  - Amber/yellow for statement dates coming within 7 days
  - Red for due dates coming within 7 days
  - Muted text for dates not coming soon

### Accounts Page Display
**File**: `src/pages/Accounts.tsx`

Added a dedicated section in credit card details showing:
- Statement Date: "15th of each month"
- Payment Due Date: "25th of each month"
- Color-coded highlighting for dates coming soon
- Clean, bordered section separating date information from other details

## User Experience

### Adding/Editing Credit Cards
1. When creating or editing a credit card account, users see two optional fields:
   - **Statement Day of Month**: Enter the day (1-31) when the statement is generated
   - **Payment Due Day of Month**: Enter the day (1-31) when payment is due
2. Both fields include helpful placeholder text and descriptions
3. Fields are validated to ensure values are between 1 and 31

### Dashboard View
Credit card accounts now display:
- Basic account information (name, number, balance)
- Statement date reminder (if set)
- Due date reminder (if set)
- Visual highlighting when dates are within 7 days

### Accounts Page View
Credit card details include:
- Card number and outstanding balance
- Dedicated "Payment Reminders" section showing:
  - Statement generation date
  - Payment due date
  - Both formatted with ordinal suffixes (1st, 2nd, 3rd, etc.)
  - Color highlighting for upcoming dates

## Visual Indicators

### Color Coding
- **Amber/Yellow**: Statement dates within 7 days
- **Red**: Payment due dates within 7 days
- **Muted Gray**: Dates not coming soon

### Format Examples
- 1st of each month
- 2nd of each month
- 3rd of each month
- 15th of each month
- 21st of each month
- 31st of each month

## Technical Notes

### Validation
- Database-level: CHECK constraint ensures values are 1-31
- Frontend: HTML5 number input with min="1" max="31"
- Both fields are optional (nullable)

### Date Calculation
- The system calculates the next occurrence of each date
- Highlights dates within 7 days of the current date
- Handles month-end edge cases (e.g., 31st in months with fewer days)

### Performance
- No additional database queries required
- Date calculations are performed client-side
- Minimal performance impact

## Future Enhancements (Potential)
1. Email/push notifications for upcoming due dates
2. Automatic payment reminders
3. Payment history tracking
4. Grace period configuration
5. Multiple statement cycles per month
6. Custom reminder thresholds (not just 7 days)

## Testing Checklist
- ✅ Database migration applied successfully
- ✅ TypeScript types updated
- ✅ Form fields display for credit cards only
- ✅ Form validation works (1-31 range)
- ✅ Data saves correctly to database
- ✅ Data loads correctly when editing
- ✅ Dashboard displays dates with proper formatting
- ✅ Accounts page displays dates with proper formatting
- ✅ Color highlighting works for dates within 7 days
- ✅ Ordinal suffixes display correctly (1st, 2nd, 3rd, etc.)
- ✅ No linting errors
- ✅ No TypeScript errors

## Files Modified
1. `supabase/migrations/00007_add_credit_card_dates.sql` (new)
2. `src/types/types.ts`
3. `src/utils/dateUtils.ts` (new)
4. `src/pages/AccountForm.tsx`
5. `src/pages/Dashboard.tsx`
6. `src/pages/Accounts.tsx`

## Commit Message
```
feat: Add credit card statement and due date tracking

- Add statement_day and due_day columns to accounts table
- Create date utility functions with ordinal formatting
- Add input fields in account form for credit cards
- Display statement and due dates on dashboard
- Display statement and due dates on accounts page
- Highlight dates coming within 7 days
- Format dates with ordinal suffixes (1st, 2nd, 3rd, etc.)
```
