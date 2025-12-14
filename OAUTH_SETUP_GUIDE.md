# OAuth Setup Guide for SmartFinHub

This guide explains how to configure Google and Apple OAuth authentication for SmartFinHub using Supabase.

## Overview

SmartFinHub now supports three authentication methods:
1. **Email/Password** - Traditional email-based authentication
2. **Phone/OTP** - Phone number with SMS verification
3. **Social OAuth** - Google and Apple sign-in

## Prerequisites

- Active Supabase project
- Access to Supabase Dashboard
- Google Cloud Console account (for Google OAuth)
- Apple Developer account (for Apple OAuth)

---

## Part 1: Google OAuth Setup

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted:
   - User Type: External
   - App name: SmartFinHub
   - User support email: Your email
   - Developer contact: Your email
6. For Application type, select **Web application**
7. Add authorized redirect URIs:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```
   Replace `[YOUR-PROJECT-REF]` with your Supabase project reference ID

8. Click **Create**
9. Copy the **Client ID** and **Client Secret**

### Step 2: Configure Google OAuth in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list and click to expand
5. Enable Google provider
6. Enter the credentials:
   - **Client ID**: Paste the Client ID from Google
   - **Client Secret**: Paste the Client Secret from Google
7. Click **Save**

### Step 3: Test Google OAuth

1. Open your SmartFinHub application
2. Navigate to the Login or Register page
3. Click the **Google** button
4. You should be redirected to Google's sign-in page
5. After successful authentication, you'll be redirected back to SmartFinHub

---

## Part 2: Apple OAuth Setup

### Step 1: Create Apple Service ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** in the sidebar
4. Click the **+** button to create a new identifier
5. Select **Services IDs** and click **Continue**
6. Fill in the details:
   - Description: SmartFinHub
   - Identifier: com.yourcompany.smartfinhub (use your own domain)
7. Click **Continue** and then **Register**

### Step 2: Configure Sign in with Apple

1. Select the Service ID you just created
2. Enable **Sign in with Apple**
3. Click **Configure**
4. Add your domain and return URLs:
   - **Domains and Subdomains**: `[YOUR-PROJECT-REF].supabase.co`
   - **Return URLs**: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
5. Click **Save** and then **Continue**
6. Click **Register**

### Step 3: Create Apple Private Key

1. In the Apple Developer Portal, go to **Keys**
2. Click the **+** button to create a new key
3. Enter a key name (e.g., "SmartFinHub Auth Key")
4. Enable **Sign in with Apple**
5. Click **Configure** and select your Primary App ID
6. Click **Save** and then **Continue**
7. Click **Register**
8. **Download the key file** (.p8 file) - you can only download this once!
9. Note the **Key ID** displayed on the page

### Step 4: Get Your Team ID

1. In the Apple Developer Portal, click your name in the top right
2. Your **Team ID** is displayed in the membership details

### Step 5: Configure Apple OAuth in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Apple** in the list and click to expand
5. Enable Apple provider
6. Enter the credentials:
   - **Services ID**: Your Service ID (e.g., com.yourcompany.smartfinhub)
   - **Team ID**: Your Apple Team ID
   - **Key ID**: The Key ID from Step 3
   - **Private Key**: Open the .p8 file in a text editor and paste the entire contents
7. Click **Save**

### Step 6: Test Apple OAuth

1. Open your SmartFinHub application
2. Navigate to the Login or Register page
3. Click the **Apple** button
4. You should be redirected to Apple's sign-in page
5. After successful authentication, you'll be redirected back to SmartFinHub

---

## Part 3: Application Configuration

### Redirect URL Configuration

The application is configured to redirect to `/auth/callback` after OAuth authentication. This route:

1. Retrieves the session from Supabase
2. Checks if a user profile exists
3. Creates a profile if needed (using OAuth user metadata)
4. Redirects to the dashboard

### Profile Creation for OAuth Users

When a user signs in with Google or Apple for the first time, the application automatically creates a profile with:

- **ID**: Supabase user ID
- **Email**: From OAuth provider (if available)
- **Nickname**: Derived from OAuth metadata (full_name, name, or email)
- **Role**: Default 'user' role

### Customizing OAuth Behavior

You can customize the OAuth flow by editing:

- **Login/Register handlers**: `src/pages/Login.tsx` and `src/pages/Register.tsx`
- **Callback handler**: `src/pages/AuthCallback.tsx`
- **Profile creation logic**: `src/pages/AuthCallback.tsx` (lines 20-35)

---

## Troubleshooting

### Google OAuth Issues

**Problem**: "redirect_uri_mismatch" error
- **Solution**: Ensure the redirect URI in Google Cloud Console exactly matches your Supabase callback URL

**Problem**: "Access blocked: This app's request is invalid"
- **Solution**: Complete the OAuth consent screen configuration in Google Cloud Console

### Apple OAuth Issues

**Problem**: "invalid_client" error
- **Solution**: Verify that your Service ID, Team ID, and Key ID are correct in Supabase

**Problem**: "invalid_request" error
- **Solution**: Ensure your return URL in Apple Developer Portal matches your Supabase callback URL

**Problem**: Private key error
- **Solution**: Make sure you copied the entire contents of the .p8 file, including the header and footer lines

### General Issues

**Problem**: User redirected to login after OAuth
- **Solution**: Check browser console for errors. Ensure the callback route is properly configured in `src/routes.tsx`

**Problem**: Profile not created after OAuth
- **Solution**: Check Supabase logs and ensure the profiles table has proper permissions

---

## Security Considerations

1. **Never commit OAuth credentials** to version control
2. **Use environment variables** for sensitive configuration (if needed)
3. **Enable Row Level Security (RLS)** on the profiles table
4. **Regularly rotate** OAuth secrets and keys
5. **Monitor authentication logs** in Supabase Dashboard

---

## Testing Checklist

- [ ] Google OAuth sign-in works on Login page
- [ ] Google OAuth sign-up works on Register page
- [ ] Apple OAuth sign-in works on Login page
- [ ] Apple OAuth sign-up works on Register page
- [ ] User profile is created automatically after OAuth
- [ ] User is redirected to dashboard after successful OAuth
- [ ] Error messages display correctly for OAuth failures
- [ ] OAuth works on both desktop and mobile browsers

---

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Supabase OAuth Providers Guide](https://supabase.com/docs/guides/auth/social-login)

---

## Support

If you encounter issues not covered in this guide:

1. Check the browser console for error messages
2. Review Supabase authentication logs
3. Verify all credentials are correctly entered
4. Ensure redirect URLs match exactly (including https://)
5. Test with different browsers to rule out browser-specific issues

---

## Summary

You have successfully integrated Google and Apple OAuth authentication into SmartFinHub! Users can now:

- Sign in with their Google account
- Sign in with their Apple ID
- Continue using email/password authentication
- Use phone/OTP authentication

All authentication methods create the same user profile structure and provide access to the same features.
