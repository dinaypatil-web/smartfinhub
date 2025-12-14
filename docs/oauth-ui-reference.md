# OAuth UI Reference

## Visual Layout

### Login Page Structure

```
┌─────────────────────────────────────────┐
│         SmartFinHub                     │
│    Sign in to your account              │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────┬─────────┬─────────┐       │
│  │  Email  │  Phone  │   OTP   │       │
│  └─────────┴─────────┴─────────┘       │
│                                         │
│  [Email/Phone/OTP Form Fields]          │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │        Sign In Button             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ─────── Or continue with ───────      │
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ [G] Google   │  │ [] Apple     │   │
│  └──────────────┘  └──────────────┘   │
│                                         │
│  Don't have an account? Sign up        │
└─────────────────────────────────────────┘
```

### Register Page Structure

```
┌─────────────────────────────────────────┐
│         SmartFinHub                     │
│   Create an account to get started      │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┬──────────────┐       │
│  │    Email     │    Phone     │       │
│  └──────────────┴──────────────┘       │
│                                         │
│  [Email/Phone Registration Form]        │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │        Sign Up Button             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ─────── Or sign up with ───────       │
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ [G] Google   │  │ [] Apple     │   │
│  └──────────────┘  └──────────────┘   │
│                                         │
│  Already have an account? Sign in      │
└─────────────────────────────────────────┘
```

### OAuth Callback Loading State

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│              ⟳ (spinning)               │
│                                         │
│      Completing sign in...              │
│                                         │
│  Please wait while we authenticate you  │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

## Button Specifications

### Google Button
- **Variant**: Outline
- **Icon**: Google "G" logo (multicolor)
- **Text**: "Google"
- **Width**: 50% of container (grid-cols-2)
- **Hover**: Border highlight
- **Loading**: Spinner replaces icon

### Apple Button
- **Variant**: Outline
- **Icon**: Apple logo (solid)
- **Text**: "Apple"
- **Width**: 50% of container (grid-cols-2)
- **Hover**: Border highlight
- **Loading**: Spinner replaces icon

## Responsive Behavior

### Desktop (≥1280px)
- Buttons side-by-side in 2-column grid
- Full button labels visible
- Icons + text layout

### Mobile (<1280px)
- Buttons remain side-by-side
- Responsive button sizing
- Icons + text maintained

## Interaction States

### Default State
```
┌──────────────┐  ┌──────────────┐
│ [G] Google   │  │ [] Apple     │
└──────────────┘  └──────────────┘
```

### Hover State
```
┌──────────────┐  ┌──────────────┐
│ [G] Google   │  │ [] Apple     │  ← Border highlighted
└──────────────┘  └──────────────┘
```

### Loading State
```
┌──────────────┐  ┌──────────────┐
│ ⟳ Google     │  │ [] Apple     │  ← Spinner replaces icon
└──────────────┘  └──────────────┘
```

### Disabled State
```
┌──────────────┐  ┌──────────────┐
│ [G] Google   │  │ [] Apple     │  ← Grayed out, no interaction
└──────────────┘  └──────────────┘
```

## Color Scheme

### Light Mode
- **Button Background**: White/Transparent
- **Button Border**: Light gray
- **Button Text**: Dark gray/black
- **Icon Colors**: Brand colors (Google multicolor, Apple black)
- **Separator Line**: Light gray
- **Separator Text**: Muted gray

### Dark Mode
- **Button Background**: Dark/Transparent
- **Button Border**: Dark gray
- **Button Text**: Light gray/white
- **Icon Colors**: Brand colors (Google multicolor, Apple white)
- **Separator Line**: Dark gray
- **Separator Text**: Muted light gray

## Accessibility

### Keyboard Navigation
- Tab order: Traditional auth → Google button → Apple button
- Enter/Space: Activate button
- Focus indicators: Visible outline

### Screen Readers
- Button labels: "Sign in with Google", "Sign in with Apple"
- Loading state: "Loading, please wait"
- Error messages: Announced immediately

### ARIA Attributes
- `type="button"` for all OAuth buttons
- `disabled` attribute during loading
- `aria-label` for icon-only states

## Error Handling

### OAuth Error Display
```
┌─────────────────────────────────────────┐
│  ⚠ Authentication Error                 │
│  Failed to sign in with Google          │
└─────────────────────────────────────────┘
```

Errors appear as toast notifications in the top-right corner.

## Implementation Notes

### Button Component Usage
```tsx
<Button
  type="button"
  variant="outline"
  onClick={handleGoogleLogin}
  disabled={loading}
  className="w-full"
>
  {loading ? (
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  ) : (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
      {/* Google icon SVG paths */}
    </svg>
  )}
  Google
</Button>
```

### Separator Component
```tsx
<div className="relative">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-background px-2 text-muted-foreground">
      Or continue with
    </span>
  </div>
</div>
```

## User Flow Diagram

```
User clicks OAuth button
         ↓
Redirect to provider
         ↓
User authorizes app
         ↓
Redirect to /auth/callback
         ↓
Check if profile exists
         ↓
    ┌────┴────┐
    │         │
  Yes        No
    │         │
    │    Create profile
    │         │
    └────┬────┘
         ↓
Redirect to dashboard
```

## Testing Checklist

Visual Testing:
- [ ] Buttons render correctly on Login page
- [ ] Buttons render correctly on Register page
- [ ] Icons display properly (Google multicolor, Apple solid)
- [ ] Separator line is centered and styled correctly
- [ ] Loading spinner appears during OAuth redirect
- [ ] Buttons are properly aligned in grid layout
- [ ] Responsive layout works on mobile
- [ ] Dark mode styling is correct
- [ ] Hover states work as expected
- [ ] Focus indicators are visible

Functional Testing:
- [ ] Google button triggers OAuth flow
- [ ] Apple button triggers OAuth flow
- [ ] Loading state prevents double-clicks
- [ ] Error messages display correctly
- [ ] Callback page shows loading state
- [ ] Profile creation works for new users
- [ ] Dashboard redirect works after auth
- [ ] Existing users can sign in with OAuth

---

**Reference**: This document describes the UI implementation of OAuth authentication in SmartFinHub.
