# Credit Card Payment Reminders - Quick Start Guide

## 🎯 What's New?

You can now track **statement dates** and **payment due dates** for your credit cards! The system will automatically remind you when these dates are coming up.

---

## 🚀 How to Use (3 Simple Steps)

### Step 1: Add or Edit a Credit Card

1. Go to **Accounts** page
2. Click **"Add Account"** (or **"Edit"** on an existing credit card)
3. Select **"Credit Card"** as the account type
4. Fill in the basic details (name, bank, balance, etc.)

### Step 2: Enter Your Payment Dates

You'll see two new optional fields:

**Statement Day of Month**
- Enter the day (1-31) when your statement is generated
- Example: If your statement comes on the 15th, enter `15`

**Payment Due Day of Month**
- Enter the day (1-31) when your payment is due
- Example: If payment is due on the 25th, enter `25`

💡 **Tip**: Both fields are optional. Enter what you know!

### Step 3: View Your Reminders

Your payment dates will now appear in two places:

**Dashboard**
- Quick view: "📄 Statement: 15th  💳 Due: 25th"
- Dates within 7 days are highlighted in color

**Accounts Page**
- Detailed view with full formatting
- "Statement Date: 15th of each month"
- "Payment Due Date: 25th of each month"

---

## 🎨 Visual Indicators

### Color Coding
- 🟡 **Amber/Yellow**: Statement date is within 7 days
- 🔴 **Red**: Payment due date is within 7 days
- ⚪ **Gray**: Date is not coming soon

### Icons
- 📄 Statement date
- 💳 Payment due date

---

## 📝 Examples

### Example 1: Chase Sapphire Card
```
Statement Day: 15
Due Day: 25

Dashboard shows:
📄 Statement: 15th  💳 Due: 25th

Accounts page shows:
Statement Date: 15th of each month
Payment Due Date: 25th of each month
```

### Example 2: Amex Platinum
```
Statement Day: 1
Due Day: 21

Dashboard shows:
📄 Statement: 1st  💳 Due: 21st

Accounts page shows:
Statement Date: 1st of each month
Payment Due Date: 21st of each month
```

### Example 3: Partial Information
```
Statement Day: (not entered)
Due Day: 30

Dashboard shows:
💳 Due: 30th

Accounts page shows:
Payment Due Date: 30th of each month
```

---

## ❓ Frequently Asked Questions

**Q: Are these fields required?**
A: No, both fields are optional. Enter what you know.

**Q: What if I don't know my statement date?**
A: Just leave it blank. You can always add it later.

**Q: Can I change the dates later?**
A: Yes! Just edit the credit card account and update the dates.

**Q: What happens if I enter an invalid day (like 32)?**
A: The system will prevent you from entering invalid days. Only 1-31 are allowed.

**Q: What about months with fewer than 31 days?**
A: The system handles this automatically. If you enter 31st, it will work correctly even in months with 30 days.

**Q: When does the highlighting appear?**
A: Dates are highlighted when they're within 7 days of today.

**Q: Can I track multiple credit cards?**
A: Yes! Each credit card can have its own statement and due dates.

---

## 🎁 Benefits

✅ **Never miss a payment** - Visual reminders keep you on track
✅ **Better planning** - Know when statements are coming
✅ **Smart alerts** - Automatic highlighting for upcoming dates
✅ **Multiple cards** - Track all your credit cards in one place
✅ **Flexible** - Enter only the information you want to track

---

## 🔧 Technical Details

For developers and technical users:

- **Database**: New columns `statement_day` and `due_day` in `accounts` table
- **Validation**: Values must be between 1 and 31
- **Format**: Ordinal suffixes (1st, 2nd, 3rd, etc.)
- **Highlighting**: Dates within 7 days are color-coded
- **Responsive**: Works on all screen sizes
- **Dark Mode**: Fully supported

---

## 📚 More Information

For detailed technical documentation, see:
- `CREDIT_CARD_DATES_FEATURE.md` - Technical implementation details
- `CREDIT_CARD_DATES_VISUAL_GUIDE.md` - Visual examples and mockups
- `IMPLEMENTATION_CHECKLIST.md` - Complete feature checklist

---

## 🎉 Start Using It Now!

1. Go to **Accounts** page
2. Add or edit a credit card
3. Enter your statement and due dates
4. See the reminders on your Dashboard!

**That's it!** You're all set to track your credit card payment dates. 🎊
