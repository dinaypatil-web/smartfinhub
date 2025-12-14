# Bank App Integration - UI Reference

## Quick Payment Apps Section

Located on the dashboard after the summary cards, this section displays payment apps based on the user's country:

```
┌─────────────────────────────────────────────────────────────────┐
│ 📱 Quick Payment Apps                                           │
│ Access popular payment apps for your region                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────┐│
│  │ 💳 Google Pay│  │ 📱 PhonePe   │  │ 💰 Paytm     │  │ 🏦  ││
│  │ Send money,  │  │ UPI payments │  │ Payments,    │  │ UPI ││
│  │ pay bills... │  │ and more     │  │ wallet...    │  │ by..││
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Features:
- Grid layout (2 columns on mobile, 4 on desktop)
- Each card shows:
  - App icon (emoji)
  - App name
  - Brief description
  - External link indicator
- Hover effect for better UX
- Click to open app (mobile) or website (desktop)

## Bank Account Cards with App Links

Each account card now includes an external link button:

```
┌─────────────────────────────────────────────────────────────────┐
│ 💼 All Accounts                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🏦  Chase Checking                                      🔗 │ │
│  │     Bank Account • ****1234                                │ │
│  │                                          $5,234.56         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 💳  HDFC Credit Card                                    🔗 │ │
│  │     Credit Card • ****5678                                 │ │
│  │                                         -$1,234.56         │ │
│  │     Credit Utilization: 24.7% ████░░░░░░░░░░░░░░░░        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🏠  SBI Home Loan                                       🔗 │ │
│  │     Loan • Floating                                        │ │
│  │     EMI: $2,500.00                                         │ │
│  │                                       -$250,000.00         │ │
│  │                                              8.5% APR      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Features:
- External link icon (🔗) appears on the right side
- Only visible for banks with configured deep links
- Ghost button style (subtle, non-intrusive)
- Tooltip shows "Open [Bank Name] app"
- Click stops propagation (doesn't trigger account details)

## Mobile Experience

### Deep Link Flow:

1. **User taps external link icon**
   ```
   ┌─────────────────────┐
   │  Opening Chase...   │
   └─────────────────────┘
   ```

2. **If app installed:**
   - Chase app opens directly
   - User sees their account in the app

3. **If app not installed:**
   - After 1.5 seconds, browser opens
   - User sees Chase website
   - Option to download app

### Payment App Flow:

1. **User taps payment app card**
   ```
   ┌─────────────────────┐
   │ Opening Google Pay..│
   └─────────────────────┘
   ```

2. **App opens or web fallback**

## Desktop Experience

### Bank App Links:

1. **User clicks external link icon**
2. **New tab opens with bank website**
   - No deep link attempt on desktop
   - Direct to web URL

### Payment App Links:

1. **User clicks payment app card**
2. **New tab opens with app website**

## Country-Specific Payment Apps

### India (IN)
- 💳 Google Pay
- 📱 PhonePe
- 💰 Paytm
- 🏦 BHIM

### United States (US)
- 💙 PayPal
- 💸 Venmo
- 💵 Cash App
- ⚡ Zelle

### United Kingdom (GB)
- 💙 PayPal
- 🔵 Revolut
- 🔴 Monzo

### China (CN)
- 🔵 Alipay
- 💚 WeChat Pay

### Singapore (SG)
- 🇸🇬 PayNow
- 🟢 GrabPay

### Australia (AU)
- 💙 PayPal
- 🟡 CommBank

### Canada (CA)
- 💙 PayPal
- 🔴 Interac

### Default/International
- 💙 PayPal

## Responsive Design

### Mobile (< 768px)
```
┌─────────────────────┐
│ Quick Payment Apps  │
├─────────────────────┤
│ ┌────────┐ ┌──────┐│
│ │Google  │ │Phone │││
│ │Pay     │ │Pe    │││
│ └────────┘ └──────┘│
│ ┌────────┐ ┌──────┐│
│ │Paytm   │ │BHIM  │││
│ └────────┘ └──────┘│
└─────────────────────┘
```

### Desktop (≥ 1280px)
```
┌───────────────────────────────────────────────────────────┐
│ Quick Payment Apps                                        │
├───────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │Google Pay│ │PhonePe   │ │Paytm     │ │BHIM      │    │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
└───────────────────────────────────────────────────────────┘
```

## Color Scheme

- **Payment Apps Card**: White background with border
- **Hover State**: Accent background color
- **Icons**: Emoji (colorful, recognizable)
- **External Link Icon**: Muted foreground color
- **Button Hover**: Subtle background change

## Accessibility

- **Keyboard Navigation**: Tab to focus, Enter to activate
- **Screen Readers**: Proper ARIA labels
- **Tooltips**: Descriptive text for all buttons
- **Color Contrast**: Meets WCAG AA standards
- **Touch Targets**: Minimum 44x44px on mobile

## Error States

### Bank Not Configured
```
┌─────────────────────────────────────┐
│ ⚠️ Bank App Not Configured          │
│ No app link available for XYZ Bank  │
└─────────────────────────────────────┘
```

### Web URL Not Available
```
┌─────────────────────────────────────┐
│ ⚠️ Web URL Not Available            │
│ Please use the mobile app for      │
│ XYZ Bank                            │
└─────────────────────────────────────┘
```

### Failed to Open
```
┌─────────────────────────────────────┐
│ ❌ Error                             │
│ Failed to open Google Pay           │
└─────────────────────────────────────┘
```

## Loading States

While opening apps, the UI remains responsive:
- No loading spinners (instant action)
- Toast notifications for errors only
- Smooth transitions

## Animation

- **Hover Effects**: Smooth scale and shadow transitions
- **Click Feedback**: Subtle press effect
- **Card Hover**: Lift effect with shadow
- **Transitions**: 300ms cubic-bezier easing

## Best Practices

1. **Don't Overwhelm**: Show only relevant payment apps
2. **Clear Icons**: Use recognizable emoji or logos
3. **Descriptive Text**: Brief but informative descriptions
4. **Fallback Always**: Ensure web URLs are available
5. **Error Handling**: Graceful degradation
6. **Performance**: Lazy load if needed
7. **Testing**: Test on multiple devices and browsers
