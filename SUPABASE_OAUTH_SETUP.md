# 🔐 Supabase OAuth Setup Guide - Google & Apple Sign-In

## Overview

This guide explains how to configure Google and Apple OAuth authentication for SmartFinHub using **Supabase's built-in OAuth providers**. Users can sign in with their Google or Apple accounts for seamless authentication.

---

## ✅ What Has Been Implemented

### Code Changes

1. ✅ **Login Page** (`src/pages/Login.tsx`)
   - Added Google sign-in button with Google logo
   - Added Apple sign-in button with Apple logo
   - OAuth handlers using `supabase.auth.signInWithOAuth()`
   - Proper error handling and loading states
   - "Or continue with" section with social login buttons

2. ✅ **Register Page** (`src/pages/Register.tsx`)
   - Google and Apple sign-up buttons
   - OAuth handlers configured
   - Redirects to `/auth/callback` after OAuth
   - "Or sign up with" section

3. ✅ **Auth Callback Page** (`src/pages/AuthCallback.tsx`)
   - Handles OAuth callback from Supabase
   - Creates user profile automatically
   - Extracts user info from OAuth provider (name, email)
   - Redirects to dashboard after successful auth

4. ✅ **Routes** (`src/routes.tsx`)
   - `/auth/callback` route configured
   - Handles OAuth redirect properly

---

## 🔧 Supabase OAuth Configuration

### Part 1: Google OAuth Setup

#### Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project** (or select existing)
   - Click on the project dropdown at the top
   - Click "New Project"
   - Name: "SmartFinHub"
   - Click "Create"

3. **Enable Google+ API**
   - In the left sidebar, go to **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click on it and click **Enable**

4. **Configure OAuth Consent Screen**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Select **External** user type
   - Click **Create**
   
   **App Information:**
   - **App name**: SmartFinHub
   - **User support email**: Your email
   - **App logo**: (Optional)
   - **App domain**: Your domain
   - **Authorized domains**: Add your domain
   - **Developer contact email**: Your email
   - Click **Save and Continue**
   
   **Scopes:**
   - Click **Add or Remove Scopes**
   - Select: `userinfo.email` and `userinfo.profile`
   - Click **Update** → **Save and Continue**
   
   **Test users** (for development):
   - Add your email and test users' emails
   - Click **Save and Continue**

5. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: "SmartFinHub Web Client"
   
   **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   https://yourdomain.com
   ```
   
   **Authorized redirect URIs:**
   ```
   https://[YOUR-SUPABASE-PROJECT-REF].supabase.co/auth/v1/callback
   ```
   
   **To find your Supabase project ref:**
   - Go to Supabase Dashboard → Settings → API
   - Your project URL is: `https://[PROJECT-REF].supabase.co`
   - Copy the PROJECT-REF part (e.g., `abcdefghijklmnop`)
   
   - Click **Create**
   - **Copy the Client ID and Client Secret**

#### Step 2: Configure Google OAuth in Supabase

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your **SmartFinHub** project

2. **Navigate to Authentication Settings**
   - Click **Authentication** in the left sidebar
   - Click **Providers** tab
   - Find **Google** in the list

3. **Enable Google Provider**
   - Toggle **Enable Sign in with Google** to ON
   
4. **Enter Google Credentials**
   - **Client ID (for OAuth)**: Paste the Client ID from Google Cloud Console
   - **Client Secret (for OAuth)**: Paste the Client Secret from Google Cloud Console
   - Click **Save**

5. **Configure Redirect URLs**
   - Go to **Authentication** → **URL Configuration**
   - **Site URL**: `http://localhost:5173` (development) or your production URL
   - **Redirect URLs** - Add these:
   ```
   http://localhost:5173/auth/callback
   https://yourdomain.com/auth/callback
   ```
   - Click **Save**

---

### Part 2: Apple OAuth Setup

#### Step 1: Apple Developer Account Requirements

1. **Apple Developer Program**
   - Visit: https://developer.apple.com/
   - You need an **Apple Developer Account** ($99/year)
   - Sign in or create an account
   - Complete enrollment if not already done

#### Step 2: Create App ID

1. **Go to Certificates, Identifiers & Profiles**
   - Visit: https://developer.apple.com/account/resources/identifiers/list
   - Click the **+** button to create a new identifier

2. **Register an App ID**
   - Select **App IDs** → Click **Continue**
   - Select **App** → Click **Continue**
   
   **Fill in the details:**
   - **Description**: SmartFinHub
   - **Bundle ID**: Select **Explicit**
   - **Bundle ID**: `com.yourcompany.smartfinhub` (use your own reverse domain)
   
   **Capabilities:**
   - Scroll down and check **Sign in with Apple**
   - Click **Continue** → **Register**

#### Step 3: Create Services ID

1. **Create a New Identifier**
   - Click the **+** button again
   - Select **Services IDs** → Click **Continue**

2. **Register a Services ID**
   - **Description**: SmartFinHub Web
   - **Identifier**: `com.yourcompany.smartfinhub.web`
   - Check **Sign in with Apple**
   - Click **Continue** → **Register**

3. **Configure Sign in with Apple**
   - Click on the Services ID you just created
   - Check **Sign in with Apple**
   - Click **Configure** next to it
   
   **Web Authentication Configuration:**
   - **Primary App ID**: Select the App ID you created earlier
   
   **Website URLs:**
   - **Domains and Subdomains**:
   ```
   [YOUR-SUPABASE-PROJECT-REF].supabase.co
   ```
   
   - **Return URLs**:
   ```
   https://[YOUR-SUPABASE-PROJECT-REF].supabase.co/auth/v1/callback
   ```
   
   - Click **Next** → **Done** → **Continue** → **Save**

#### Step 4: Create Private Key

1. **Go to Keys Section**
   - Visit: https://developer.apple.com/account/resources/authkeys/list
   - Click the **+** button

2. **Register a New Key**
   - **Key Name**: SmartFinHub Sign in with Apple Key
   - Check **Sign in with Apple**
   - Click **Configure** next to it
   - Select your **Primary App ID**
   - Click **Save** → **Continue** → **Register**

3. **Download the Key**
   - Click **Download** to download the `.p8` file
   - **IMPORTANT**: Save this file securely, you can only download it once!
   - Note the **Key ID** (10 characters, e.g., `ABC123DEFG`)

#### Step 5: Get Team ID

1. **Find Your Team ID**
   - Go to: https://developer.apple.com/account/
   - Your **Team ID** is displayed in the top right corner (10 characters)
   - Copy this ID

#### Step 6: Configure Apple OAuth in Supabase

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your **SmartFinHub** project

2. **Navigate to Authentication Settings**
   - Click **Authentication** in the left sidebar
   - Click **Providers** tab
   - Find **Apple** in the list

3. **Enable Apple Provider**
   - Toggle **Enable Sign in with Apple** to ON

4. **Enter Apple Credentials**
   - **Services ID**: Your Services ID (e.g., `com.yourcompany.smartfinhub.web`)
   - **Team ID**: Your Apple Team ID (10 characters)
   - **Key ID**: The Key ID from the downloaded key (10 characters)
   - **Private Key**: Open the `.p8` file in a text editor and paste the entire content including:
     ```
     -----BEGIN PRIVATE KEY-----
     [key content]
     -----END PRIVATE KEY-----
     ```
   - Click **Save**

5. **Configure Redirect URLs** (if not already done)
   - Go to **Authentication** → **URL Configuration**
   - Add to **Redirect URLs**:
   ```
   http://localhost:5173/auth/callback
   https://yourdomain.com/auth/callback
   ```

---

## 🧪 Testing OAuth Integration

### Test Google Sign-In

1. **Start the Application**
   ```bash
   npm run dev
   ```

2. **Go to Login Page**
   - Navigate to: `http://localhost:5173/login`

3. **Click "Google" Button**
   - Should redirect to Google sign-in page
   - Sign in with your Google account
   - Grant permissions when prompted

4. **Verify Redirect**
   - Should redirect to `/auth/callback`
   - Should see "Completing sign in..." message
   - Should redirect to dashboard (`/`)
   - Should see "Logged in successfully!" toast

5. **Check User Profile**
   - Go to Supabase Dashboard → **Authentication** → **Users**
   - Should see your Google account listed
   - Email should be populated from Google
   - Check **Database** → **profiles** table
   - Should see profile created with your info

### Test Apple Sign-In

1. **Go to Login Page**
   - Navigate to: `http://localhost:5173/login`

2. **Click "Apple" Button**
   - Should redirect to Apple sign-in page
   - Sign in with your Apple ID
   - Choose to share or hide email
   - Grant permissions when prompted

3. **Verify Redirect**
   - Should redirect to `/auth/callback`
   - Should see "Completing sign in..." message
   - Should redirect to dashboard
   - Should see "Logged in successfully!" toast

4. **Check User Profile**
   - Go to Supabase Dashboard → **Authentication** → **Users**
   - Should see your Apple account listed
   - Email may be hidden if you chose that option
   - Check **Database** → **profiles** table
   - Should see profile created

---

## 🐛 Troubleshooting

### Google OAuth Issues

#### Problem: "Error 400: redirect_uri_mismatch"

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add the exact redirect URI (no trailing slash):
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```

#### Problem: "Access blocked: This app's request is invalid"

**Solution:**
1. Go to Google Cloud Console → OAuth consent screen
2. Add your email as a test user
3. Verify scopes include `userinfo.email` and `userinfo.profile`

#### Problem: "Failed to sign in with Google"

**Solution:**
1. Verify Client ID and Secret in Supabase dashboard
2. Enable Google+ API in Google Cloud Console
3. Check browser console for detailed errors

### Apple OAuth Issues

#### Problem: "invalid_client"

**Solution:**
1. Verify Services ID matches exactly
2. Double-check Team ID and Key ID (both 10 characters)
3. Ensure private key includes BEGIN and END lines

#### Problem: "invalid_request - redirect_uri"

**Solution:**
1. Go to Apple Developer Portal → Services ID
2. Configure Sign in with Apple
3. Add exact return URL:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```

#### Problem: "Private key format error"

**Solution:**
1. Open the .p8 file in a plain text editor
2. Copy the ENTIRE content including:
   ```
   -----BEGIN PRIVATE KEY-----
   [all the key content]
   -----END PRIVATE KEY-----
   ```
3. Paste into Supabase without modifications

### General OAuth Issues

#### Problem: "No session found" after OAuth

**Solution:**
1. Add redirect URLs in Supabase: Authentication → URL Configuration
2. Check browser privacy settings (allow cookies)
3. Disable ad blockers temporarily
4. Try in incognito/private mode

#### Problem: User profile not created

**Solution:**
1. Check browser console for errors
2. Verify profiles table exists in Supabase
3. Check Supabase logs: Dashboard → Logs → Auth Logs
4. Ensure RLS policies allow profile insertion

---

## 📊 OAuth Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "Sign in with Google/Apple"                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. supabase.auth.signInWithOAuth() called                   │
│    - Provider: 'google' or 'apple'                          │
│    - redirectTo: /auth/callback                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Redirect to OAuth provider                               │
│    - Google: accounts.google.com                            │
│    - Apple: appleid.apple.com                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. User authenticates with provider                         │
│    - Enters credentials                                     │
│    - Grants permissions                                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Provider redirects to Supabase                           │
│    - URL: [project].supabase.co/auth/v1/callback            │
│    - Includes authorization code                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Supabase exchanges code for tokens                       │
│    - Creates user session                                   │
│    - Extracts user info                                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Redirect to app: /auth/callback                          │
│    - Session in URL hash                                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. AuthCallback page processes session                      │
│    - Creates profile if needed                              │
│    - Redirects to dashboard                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Setup Checklist

### Google OAuth
- [ ] Create Google Cloud project
- [ ] Enable Google+ API
- [ ] Configure OAuth consent screen
- [ ] Create OAuth 2.0 credentials
- [ ] Add authorized redirect URIs
- [ ] Copy Client ID and Client Secret
- [ ] Enable Google in Supabase
- [ ] Enter credentials in Supabase
- [ ] Add redirect URLs in Supabase
- [ ] Test Google sign-in

### Apple OAuth
- [ ] Have Apple Developer account ($99/year)
- [ ] Create App ID with Sign in with Apple
- [ ] Create Services ID
- [ ] Configure web authentication
- [ ] Create private key (.p8 file)
- [ ] Note Key ID and Team ID
- [ ] Enable Apple in Supabase
- [ ] Enter credentials in Supabase
- [ ] Add redirect URLs in Supabase
- [ ] Test Apple sign-in

---

## 📝 Important Notes

### Development vs Production

**Development:**
- Use `http://localhost:5173`
- Add test users in Google OAuth consent screen
- Apple OAuth works the same

**Production:**
- Use HTTPS for all URLs
- Update redirect URLs to production domain
- Publish OAuth consent screen (Google)
- Update authorized domains

### Cost Considerations

**Google OAuth:**
- ✅ Free to use
- ✅ No ongoing costs

**Apple OAuth:**
- ⚠️ Requires Apple Developer account: $99/year
- ⚠️ Renewal required annually

---

## ✅ Summary

OAuth integration is now fully implemented with:

- ✅ Google and Apple sign-in buttons on login page
- ✅ Google and Apple sign-up buttons on register page
- ✅ Supabase OAuth handlers
- ✅ Automatic profile creation
- ✅ Error handling and loading states
- ✅ Redirect to dashboard after auth

**Next Steps:**
1. Configure Google OAuth in Google Cloud Console
2. Configure Apple OAuth in Apple Developer Portal (optional)
3. Enable providers in Supabase dashboard
4. Add redirect URLs in Supabase
5. Test both OAuth flows

---

*Last Updated: December 15, 2024*
