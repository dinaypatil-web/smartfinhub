# SMS Provider Configuration Guide

## Overview
SmartFinHub supports phone number authentication, but it requires an SMS provider to be configured in your Supabase project. Without this configuration, users will receive an error when attempting to sign up or log in with their phone number.

## Current Status
⚠️ **SMS Provider Not Configured**

Users attempting to use phone authentication will see a helpful error message directing them to use email authentication instead.

## How to Configure SMS Provider

### Step 1: Access Supabase Dashboard
1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your SmartFinHub project

### Step 2: Navigate to Authentication Settings
1. Click on "Authentication" in the left sidebar
2. Click on "Providers" tab
3. Find "Phone" in the list of providers

### Step 3: Choose an SMS Provider
Supabase supports multiple SMS providers:

#### Option 1: Twilio (Recommended)
1. Sign up for a Twilio account at https://www.twilio.com
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase a phone number from Twilio
4. In Supabase, select "Twilio" as your SMS provider
5. Enter your Twilio credentials:
   - Account SID
   - Auth Token
   - Phone Number (sender)

#### Option 2: MessageBird
1. Sign up for MessageBird at https://www.messagebird.com
2. Get your API key from the MessageBird dashboard
3. In Supabase, select "MessageBird" as your SMS provider
4. Enter your MessageBird API key

#### Option 3: Vonage (formerly Nexmo)
1. Sign up for Vonage at https://www.vonage.com
2. Get your API key and secret from the Vonage dashboard
3. In Supabase, select "Vonage" as your SMS provider
4. Enter your Vonage credentials

#### Option 4: Textlocal
1. Sign up for Textlocal at https://www.textlocal.com
2. Get your API key from the Textlocal dashboard
3. In Supabase, select "Textlocal" as your SMS provider
4. Enter your Textlocal API key

### Step 4: Enable Phone Authentication
1. In the Supabase Authentication settings, enable "Phone" provider
2. Configure the following settings:
   - **Phone confirmation**: Enable this to require phone verification
   - **Phone OTP expiry**: Set the OTP expiration time (default: 60 seconds)
   - **Phone OTP length**: Set the OTP length (default: 6 digits)

### Step 5: Test the Configuration
1. Try signing up with a phone number in the SmartFinHub application
2. Verify that you receive the OTP SMS
3. Complete the verification process

## Cost Considerations

### Twilio Pricing (as of 2024)
- SMS to US/Canada: ~$0.0075 per message
- SMS to other countries: varies by country
- Monthly phone number rental: ~$1.00

### MessageBird Pricing
- SMS to US: ~$0.0075 per message
- SMS to other countries: varies by country

### Vonage Pricing
- SMS to US: ~$0.0076 per message
- SMS to other countries: varies by country

## Security Best Practices

1. **Rate Limiting**: Configure rate limiting in Supabase to prevent SMS abuse
2. **Phone Number Validation**: The application validates phone number format before sending
3. **OTP Expiry**: Keep OTP expiry time short (60-120 seconds)
4. **Secure Credentials**: Never commit SMS provider credentials to version control
5. **Monitor Usage**: Regularly check your SMS provider dashboard for unusual activity

## Troubleshooting

### Error: "Unable to get SMS provider"
**Cause**: No SMS provider is configured in Supabase
**Solution**: Follow the configuration steps above

### Error: "Invalid phone number"
**Cause**: Phone number is not in E.164 format
**Solution**: Ensure phone numbers include country code (e.g., +1234567890)

### Error: "SMS delivery failed"
**Cause**: SMS provider credentials are incorrect or account has insufficient balance
**Solution**: 
1. Verify credentials in Supabase dashboard
2. Check SMS provider account balance
3. Verify phone number is valid and can receive SMS

### OTP Not Received
**Possible Causes**:
1. SMS provider account has insufficient balance
2. Phone number is blocked or invalid
3. Network delays (wait 1-2 minutes)
4. SMS filtered as spam by carrier

**Solutions**:
1. Check SMS provider dashboard for delivery status
2. Verify phone number is correct
3. Try resending OTP
4. Check spam/blocked messages on the phone

## Alternative: Email Authentication

If SMS configuration is not feasible, users can use email authentication instead:
- Email authentication is fully configured and working
- No additional setup required
- Users receive verification links via email
- Recommended for development and testing

## Support

For issues with:
- **Supabase Configuration**: https://supabase.com/docs/guides/auth/phone-login
- **Twilio**: https://www.twilio.com/docs
- **MessageBird**: https://developers.messagebird.com
- **Vonage**: https://developer.vonage.com
- **Textlocal**: https://www.textlocal.com/developers

## Notes

- The application includes user-friendly error messages for SMS configuration issues
- Users are automatically directed to use email authentication if SMS fails
- Phone number format validation is performed before API calls
- All phone authentication features are fully implemented and ready to use once SMS provider is configured
