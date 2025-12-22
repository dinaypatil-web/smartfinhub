# MojoAuth Phone Authentication Setup Guide

This guide explains how to set up and configure MojoAuth for phone number authentication with OTP in SmartFinHub.

## Overview

SmartFinHub now supports phone number authentication using [MojoAuth](https://mojoauth.com), a passwordless authentication service. Users can register and sign in using their phone numbers with OTP (One-Time Password) verification.

## Features

- **Phone Number Registration**: Users can create accounts using their phone numbers
- **OTP Verification**: Secure 6-digit OTP codes sent via SMS
- **Phone Number Login**: Sign in using phone number and OTP
- **Resend OTP**: Option to resend verification codes
- **International Support**: E.164 format support for international phone numbers
- **Seamless Integration**: Works alongside existing email authentication

## Setup Instructions

### Step 1: Create a MojoAuth Account

1. Visit [https://mojoauth.com](https://mojoauth.com)
2. Click "Sign Up" or "Get Started"
3. Complete the registration process
4. Verify your email address

### Step 2: Get Your API Key

1. Log in to your MojoAuth dashboard
2. Navigate to **Settings** or **API Keys** section
3. Copy your **API Key**
4. Keep this key secure - never commit it to version control

### Step 3: Configure Environment Variables

1. Open the `.env` file in the project root
2. Find the MojoAuth configuration section:
   ```env
   # ============================================
   # MojoAuth Configuration (for Phone OTP)
   # ============================================
   VITE_MOJOAUTH_API_KEY=your_mojoauth_api_key_here
   ```
3. Replace `your_mojoauth_api_key_here` with your actual API key:
   ```env
   VITE_MOJOAUTH_API_KEY=abc123xyz456...
   ```
4. Save the file

### Step 4: Restart the Development Server

After updating the environment variables, restart your development server:

```bash
npm run dev
```

## Usage

### For Users

#### Registration with Phone Number

1. Navigate to the **Register** page
2. Click the **Phone** tab
3. Enter your phone number in international format (e.g., +1 234 567 8900)
4. Click **Send Verification Code**
5. Check your phone for the SMS with the 6-digit code
6. Enter the code in the verification field
7. Click **Verify** to complete registration

#### Sign In with Phone Number

1. Navigate to the **Login** page
2. Click the **Phone** tab
3. Enter your registered phone number
4. Click **Send Verification Code**
5. Enter the OTP code received via SMS
6. Click **Verify** to sign in

### Phone Number Format

Phone numbers must be in **E.164 format**:
- Start with `+` (plus sign)
- Include country code
- Include area code and number
- No spaces, dashes, or parentheses in the input

**Examples:**
- US: `+12345678900`
- UK: `+447123456789`
- India: `+919876543210`

**Display Format:**
The app automatically formats phone numbers for display:
- `+1 (234) 567-8900`
- `+44 (712) 345-6789`

## Technical Details

### Architecture

1. **MojoAuth Service** (`src/services/mojoauth.ts`)
   - Handles API communication with MojoAuth
   - Functions: `sendOTP()`, `verifyOTP()`, `resendOTP()`
   - Phone number validation and formatting

2. **PhoneAuth Component** (`src/components/PhoneAuth.tsx`)
   - Two-step UI: Phone input → OTP verification
   - Countdown timer for resend functionality
   - Error handling and user feedback

3. **Integration Points**
   - **Register Page**: Phone registration tab
   - **Login Page**: Phone login tab
   - **Profile API**: `getProfileByPhone()` method

### Data Flow

#### Registration Flow
```
User enters phone → MojoAuth sends OTP → User enters OTP → 
MojoAuth verifies → Create Supabase user → Update profile → 
Auto-login → Redirect to dashboard
```

#### Login Flow
```
User enters phone → MojoAuth sends OTP → User enters OTP → 
MojoAuth verifies → Find profile by phone → Sign in with Supabase → 
Redirect to dashboard
```

### Security Considerations

1. **API Key Protection**
   - API key stored in environment variables
   - Never exposed in client-side code
   - Not committed to version control

2. **Phone Number Storage**
   - Stored in encrypted Supabase database
   - Associated with user profile
   - Used for authentication lookup

3. **OTP Security**
   - 6-digit codes
   - 10-minute expiration
   - Rate limiting via MojoAuth
   - Resend cooldown (60 seconds)

## Troubleshooting

### Phone Tab Not Showing

**Problem**: The Phone tab doesn't appear on Login/Register pages

**Solution**: 
- Verify `VITE_MOJOAUTH_API_KEY` is set in `.env`
- Ensure the API key is not the placeholder value
- Restart the development server after changing `.env`

### OTP Not Received

**Problem**: User doesn't receive SMS with OTP code

**Possible Causes**:
1. **Invalid Phone Number**: Ensure E.164 format with country code
2. **MojoAuth Account**: Check your MojoAuth dashboard for:
   - Account status (active/suspended)
   - SMS credits remaining
   - API key validity
3. **Network Issues**: Check user's mobile network connectivity
4. **Spam Filter**: Check spam/junk SMS folder

### Verification Failed

**Problem**: OTP verification fails even with correct code

**Solutions**:
1. **Code Expired**: OTP codes expire after 10 minutes - request a new code
2. **Wrong Code**: Double-check the 6-digit code
3. **Network Error**: Check internet connectivity
4. **API Key**: Verify API key is correct in `.env`

### Login Error: "No account found"

**Problem**: User registered with phone but can't log in

**Solutions**:
1. Verify phone number format matches registration
2. Check if user completed registration process
3. Verify profile was created in database

## API Reference

### MojoAuth Service Functions

#### `sendOTP(phoneNumber: string)`
Sends OTP to the specified phone number.

**Parameters:**
- `phoneNumber`: Phone number in E.164 format

**Returns:**
- `Promise<SendOTPResponse>` with `state_id` for verification

**Example:**
```typescript
const response = await sendOTP('+12345678900');
console.log(response.state_id); // Use for verification
```

#### `verifyOTP(stateId: string, otp: string)`
Verifies the OTP code.

**Parameters:**
- `stateId`: State ID from `sendOTP` response
- `otp`: 6-digit OTP code entered by user

**Returns:**
- `Promise<VerifyOTPResponse>` with authentication result

**Example:**
```typescript
const result = await verifyOTP(stateId, '123456');
if (result.authenticated) {
  console.log('Verified!', result.oauth.access_token);
}
```

#### `resendOTP(stateId: string)`
Resends OTP to the same phone number.

**Parameters:**
- `stateId`: State ID from previous `sendOTP` call

**Returns:**
- `Promise<SendOTPResponse>` with new `state_id`

**Example:**
```typescript
const response = await resendOTP(stateId);
console.log('OTP resent');
```

#### `validatePhoneNumber(phoneNumber: string)`
Validates phone number format.

**Parameters:**
- `phoneNumber`: Phone number to validate

**Returns:**
- `boolean`: `true` if valid E.164 format

**Example:**
```typescript
const isValid = validatePhoneNumber('+12345678900'); // true
const isInvalid = validatePhoneNumber('1234567890'); // false (missing +)
```

## MojoAuth Dashboard

### Key Features to Configure

1. **SMS Provider**: Configure your preferred SMS gateway
2. **OTP Settings**: 
   - Code length (default: 6 digits)
   - Expiration time (default: 10 minutes)
   - Rate limiting
3. **Webhooks**: Set up webhooks for authentication events
4. **Analytics**: Monitor OTP delivery rates and authentication success

### Monitoring

Check your MojoAuth dashboard regularly for:
- SMS delivery success rate
- Failed authentication attempts
- API usage statistics
- Credit balance (if applicable)

## Cost Considerations

MojoAuth pricing typically includes:
- Free tier with limited SMS credits
- Pay-as-you-go for additional SMS
- Monthly subscription plans

Check [MojoAuth Pricing](https://mojoauth.com/pricing) for current rates.

## Support

### MojoAuth Support
- Documentation: https://mojoauth.com/docs/
- Support Email: support@mojoauth.com
- Community Forum: https://community.mojoauth.com

### SmartFinHub Support
For issues specific to the SmartFinHub integration:
1. Check this README first
2. Review error messages in browser console
3. Verify environment configuration
4. Check MojoAuth dashboard for API errors

## Additional Resources

- [MojoAuth Official Documentation](https://mojoauth.com/docs/)
- [E.164 Phone Number Format](https://en.wikipedia.org/wiki/E.164)
- [Supabase Authentication](https://supabase.com/docs/guides/auth)
- [React Best Practices](https://react.dev/learn)

## Changelog

### Version 1.0.0 (Current)
- Initial MojoAuth integration
- Phone number registration
- Phone number login
- OTP verification with resend
- E.164 format validation
- International phone number support
- Seamless integration with existing email auth
