# Administrator Setup Instructions for Twilio OTP

## Quick Setup Guide

To enable phone number registration with OTP verification in SmartFinHub, you need to configure Twilio credentials in your Supabase project.

### Required Credentials

You need three pieces of information from your Twilio account:

1. **TWILIO_ACCOUNT_SID** - Your Twilio Account SID (starts with "AC...")
2. **TWILIO_AUTH_TOKEN** - Your Twilio Auth Token
3. **TWILIO_PHONE_NUMBER** - Your Twilio phone number in E.164 format (e.g., +1234567890)

### Setup Steps

#### Option 1: Using Supabase Dashboard (Recommended)

1. Log in to your Supabase project dashboard
2. Go to **Settings** → **Edge Functions**
3. Click on **"Manage secrets"** or **"Add secret"**
4. Add these three secrets:
   ```
   Name: TWILIO_ACCOUNT_SID
   Value: [Your Twilio Account SID]

   Name: TWILIO_AUTH_TOKEN
   Value: [Your Twilio Auth Token]

   Name: TWILIO_PHONE_NUMBER
   Value: [Your Twilio Phone Number with country code]
   ```
5. Click **Save** for each secret

#### Option 2: Using Supabase CLI

If you have Supabase CLI installed, run these commands:

```bash
supabase secrets set TWILIO_ACCOUNT_SID="your_account_sid_here"
supabase secrets set TWILIO_AUTH_TOKEN="your_auth_token_here"
supabase secrets set TWILIO_PHONE_NUMBER="+1234567890"
```

### Getting Twilio Credentials

If you don't have a Twilio account yet:

1. Sign up at https://www.twilio.com
2. Complete account verification
3. Get a phone number from Twilio Console
4. Find your credentials in the Twilio Console Dashboard

### Verification

After setting up the secrets:

1. The `send-otp` edge function is already deployed
2. Test the registration flow:
   - Go to `/register` page
   - Click on "Phone" tab
   - Enter a phone number
   - Click "Send Verification Code"
   - You should receive an SMS with a 6-digit code

### Troubleshooting

**If OTP is not being sent:**
- Verify all three secrets are set correctly in Supabase
- Check Twilio account balance
- Review Supabase Edge Function logs for errors
- Check Twilio Console logs for SMS delivery status

**Common Issues:**
- Phone number must be in E.164 format (+countrycode + number)
- Twilio trial accounts can only send to verified numbers
- Some countries may have restrictions on SMS delivery

### Cost Information

- Twilio charges per SMS sent
- Pricing varies by destination country
- Check current pricing at: https://www.twilio.com/sms/pricing
- Consider implementing rate limiting for production

### Security Notes

- Credentials are stored securely as Supabase secrets
- Never commit Twilio credentials to version control
- OTP expires after 10 minutes
- Each OTP can only be used once

### Support

For detailed setup instructions, see `TWILIO_SETUP.md` in the project root.

For Twilio-specific issues, contact Twilio Support: https://support.twilio.com
