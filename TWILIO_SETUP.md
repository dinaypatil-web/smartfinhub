# Twilio OTP Integration Setup Guide

This guide explains how to configure Twilio for sending OTP (One-Time Password) during the signup process in SmartFinHub.

## Prerequisites

1. A Twilio account (sign up at https://www.twilio.com)
2. A Twilio phone number capable of sending SMS
3. Access to your Supabase project dashboard

## Step 1: Get Twilio Credentials

1. Log in to your Twilio Console (https://console.twilio.com)
2. Navigate to your Account Dashboard
3. Find and copy the following credentials:
   - **Account SID** (starts with "AC...")
   - **Auth Token** (click to reveal)
4. Go to Phone Numbers → Manage → Active Numbers
5. Copy your **Twilio Phone Number** (in E.164 format, e.g., +1234567890)

## Step 2: Configure Supabase Secrets

You need to add three secrets to your Supabase project:

### Using Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to Settings → Edge Functions
3. Click on "Manage secrets"
4. Add the following secrets:

```
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
```

### Using Supabase CLI:
```bash
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid_here
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
```

## Step 3: Verify Edge Function Deployment

The `send-otp` edge function has been deployed automatically. You can verify it in:
- Supabase Dashboard → Edge Functions → send-otp

## Step 4: Test the Integration

1. Go to the registration page
2. Select the "Phone" tab
3. Choose your country code
4. Enter your phone number
5. Set a password
6. Click "Send Verification Code"
7. You should receive an SMS with a 6-digit code
8. Enter the code to complete registration

## How It Works

### Registration Flow:
1. User enters phone number and password
2. Frontend generates a 6-digit OTP
3. OTP is sent to Twilio via the `send-otp` edge function
4. OTP is stored locally in browser with 10-minute expiration
5. User enters the received OTP
6. Frontend verifies the OTP matches
7. If valid, account is created in Supabase Auth

### Security Features:
- Twilio credentials are stored securely in Supabase secrets
- OTP expires after 10 minutes
- OTP is cleared after successful verification
- Phone number validation before sending OTP
- Rate limiting through Twilio's built-in protections

## Troubleshooting

### OTP Not Received:
- Verify Twilio credentials are correct
- Check Twilio account balance
- Ensure phone number is in E.164 format
- Check Twilio logs in the console for delivery status

### Edge Function Errors:
- Check Supabase Edge Function logs
- Verify all three secrets are set correctly
- Ensure Twilio phone number has SMS capabilities

### Invalid OTP Error:
- OTP expires after 10 minutes
- Use the "Resend Code" button to get a new OTP
- Ensure you're entering the correct 6-digit code

## Cost Considerations

- Twilio charges per SMS sent (varies by country)
- Check Twilio pricing: https://www.twilio.com/sms/pricing
- Consider implementing rate limiting for production use

## Alternative: Email Registration

Users can also register using email if:
- They don't want to provide a phone number
- SMS delivery is not available in their region
- They prefer email verification

Simply use the "Email" tab on the registration page.

## Support

For Twilio-related issues:
- Twilio Support: https://support.twilio.com
- Twilio Documentation: https://www.twilio.com/docs

For SmartFinHub issues:
- Check application logs
- Review Supabase Edge Function logs
- Contact your system administrator
