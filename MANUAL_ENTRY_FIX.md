# Manual Bank Name Entry - Final Fix

## Problem Summary
Users were unable to type in the bank name input field when selecting "Other (Enter manually)" from the bank selection dropdown.

## Root Cause Analysis
The issue was caused by **both the Select dropdown and Input field rendering simultaneously**. The conditional logic was not mutually exclusive:

```typescript
// BEFORE (BROKEN):
{availableBanks.length > 0 ? (
  <Select>...</Select>
) : null}
{(availableBanks.length === 0 || formData.institution_name === '' || ...) && (
  <Input>...</Input>
)}
```

This meant:
1. When `availableBanks.length > 0`, the Select would show
2. When user selected "Other" and `institution_name` became empty, the Input would ALSO show
3. Both components were rendered at the same time, causing UI conflicts
4. The Input field appeared but was not functional due to the Select still being present

## Solution Implemented

### 1. Added State Management
```typescript
const [manualEntry, setManualEntry] = useState(false);
```

This explicit state tracks whether the user is in "manual entry mode".

### 2. Mutually Exclusive Rendering
```typescript
{availableBanks.length > 0 && !manualEntry ? (
  // Show Select dropdown
  <Select>...</Select>
) : (
  // Show Input field
  <Input>...</Input>
)}
```

Now only ONE component renders at a time:
- **Select shows** when: Banks are available AND not in manual entry mode
- **Input shows** when: No banks available OR in manual entry mode

### 3. Mode Switching Logic
```typescript
// When "Other" is selected in dropdown
if (value === 'other') {
  setManualEntry(true);  // Switch to manual entry mode
  setFormData({
    ...formData,
    institution_name: '',
    institution_logo: ''
  });
}
```

### 4. User-Friendly Navigation
Added a "Back to bank selection" button that appears when in manual entry mode:
```typescript
{availableBanks.length > 0 && manualEntry && (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={() => {
      setManualEntry(false);
      setFormData({ ...formData, institution_name: '' });
    }}
  >
    ← Back to bank selection
  </Button>
)}
```

## User Flow

### Before Fix
1. User selects "Other (Enter manually)" ❌
2. Both Select and Input appear on screen ❌
3. User tries to type but nothing works ❌
4. Frustration and confusion ❌

### After Fix
1. User sees bank selection dropdown ✅
2. User selects "Other (Enter manually)" ✅
3. Dropdown disappears, Input field appears ✅
4. User can type bank name freely ✅
5. User can click "Back to bank selection" to return to dropdown ✅

## Testing Results
- ✅ Manual bank name entry works correctly
- ✅ Typing in the input field is responsive
- ✅ No UI conflicts or overlapping components
- ✅ "Back to bank selection" button works
- ✅ Country change resets manual entry mode
- ✅ Cash accounts don't show bank name field at all
- ✅ All existing functionality preserved
- ✅ Linter passes with no errors

## Files Modified
- `src/pages/AccountForm.tsx` - Added manualEntry state and fixed rendering logic

## Key Takeaway
When dealing with conditional rendering of form inputs, ensure the conditions are **mutually exclusive** to prevent multiple components from rendering simultaneously. Using explicit state management (like `manualEntry`) is clearer and more maintainable than complex conditional expressions.
