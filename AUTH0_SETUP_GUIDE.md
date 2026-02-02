# Auth0 Setup Guide for SmartFinHub

## Overview

SmartFinHub now supports **Sign in with Google** and **Sign in with Apple** using Auth0, while keeping Supabase for database operations and traditional email/password authentication.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     SmartFinHub                         │
│                                                         │
│  ┌──────────────┐              ┌──────────────┐       │
│  │   Auth0      │              │  Supabase    │       │
│  │              │              │              │       │
│  │ • Google     │              │ • Database   │       │
│  │ • Apple      │              │ • Profiles   │       │
│  │ • OAuth      │◄────sync────►│ • RLS        │       │
│  │ • Tokens     │              │ • Storage    │       │
│  └──────────────┘              └──────────────┘       │
│                                                         │
│  Email/Password ──────────────► Supabase Auth          │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Create Auth0 Account

1. Go to [https://auth0.com](https://auth0.com)
2. Click **Sign Up** (free tier available)
3. Create your account
4. Choose a tenant domain (e.g., `smartfinhub.auth0.com`)

---

## Step 2: Create Auth0 Application

1. In Auth0 Dashboard, go to **Applications** → **Applications**
2. Click **Create Application**
3. Enter application name: `SmartFinHub`
4. Select **Single Page Web Applications**
5. Click **Create**

---

## Step 3: Configure Application Settings

### Allowed Callback URLs
Add these URLs (replace with your actual domain):

```
http://localhost:5173,
http://localhost:5173/auth/callback,
https://your-domain.com,
https://your-domain.com/auth/callback
```

### Allowed Logout URLs
```
http://localhost:5173,
https://your-domain.com
```

### Allowed Web Origins
```
http://localhost:5173,
https://your-domain.com
```

### Allowed Origins (CORS)
```
http://localhost:5173,
https://your-domain.com
```

Click **Save Changes**

---

## Step 4: Enable Social Connections

### Google Sign-In

1. Go to **Authentication** → **Social**
2. Find **Google** and click the toggle to enable
3. Click on **Google** to configure

#### Option A: Use Auth0 Dev Keys (Quick Start)
- Toggle **Use Auth0's Dev Keys** to ON
- Click **Save**
- ⚠️ **Note**: Dev keys are for testing only, not for production

#### Option B: Use Your Own Google OAuth Credentials (Production)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Create **Web application** credentials
7. Add authorized redirect URI:
   ```
   https://YOUR-AUTH0-DOMAIN.auth0.com/login/callback
   ```
8. Copy **Client ID** and **Client Secret**
9. Paste them in Auth0 Google connection settings
10. Click **Save**

### Apple Sign-In

1. Go to **Authentication** → **Social**
2. Find **Apple** and click the toggle to enable
3. Click on **Apple** to configure

#### Apple Developer Setup
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Sign in with your Apple Developer account
3. Go to **Certificates, Identifiers & Profiles**
4. Create a **Services ID**:
   - Description: `SmartFinHub`
   - Identifier: `com.smartfinhub.signin` (or your bundle ID)
   - Enable **Sign In with Apple**
   - Configure domains and return URLs:
     - Domains: `YOUR-AUTH0-DOMAIN.auth0.com`
     - Return URLs: `https://YOUR-AUTH0-DOMAIN.auth0.com/login/callback`
5. Create a **Key** for Sign in with Apple:
   - Key Name: `SmartFinHub Auth Key`
   - Enable **Sign in with Apple**
   - Download the key file (.p8)
6. Note your **Team ID** (found in membership details)

#### Configure in Auth0
1. In Auth0 Apple connection settings:
   - **Client ID**: Your Services ID (e.g., `com.smartfinhub.signin`)
   - **Client Secret Signing Key**: Paste contents of .p8 file
   - **Key ID**: The Key ID from Apple Developer Portal
   - **Team ID**: Your Apple Team ID
2. Click **Save**

---

## Step 5: Configure Environment Variables

Create or update your `.env` file in the project root:

```env
# Auth0 Configuration
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=your-api-audience (optional)

# Existing Supabase Configuration (keep these)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Where to Find Auth0 Credentials

1. **Domain**: Found in Application Settings → Basic Information → Domain
2. **Client ID**: Found in Application Settings → Basic Information → Client ID
3. **Audience** (optional): If you have an Auth0 API, use its identifier

---

## Step 6: Apply Database Migration

Run the migration to add Auth0 support to your database:

```bash
# If using Supabase CLI
supabase db push

# Or apply the migration manually in Supabase Dashboard
# SQL Editor → New Query → Paste contents of:
# supabase/migrations/00014_add_auth0_support.sql
```

This adds the `auth0_sub` column to the profiles table for linking Auth0 users.

---

## Step 7: Test the Integration

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the login page**:
   ```
   http://localhost:5173/login
   ```

3. **Test Google Sign-In**:
   - Click the **Google** button
   - Sign in with your Google account
   - You should be redirected back to the app
   - Check that your profile is created in Supabase

4. **Test Apple Sign-In**:
   - Click the **Apple** button
   - Sign in with your Apple ID
   - You should be redirected back to the app
   - Check that your profile is created in Supabase

---

## How It Works

### Authentication Flow

```
1. User clicks "Sign in with Google/Apple"
   ↓
2. App redirects to Auth0
   ↓
3. Auth0 handles OAuth flow with Google/Apple
   ↓
4. User authenticates with Google/Apple
   ↓
5. Auth0 redirects back to app with tokens
   ↓
6. App receives Auth0 user data
   ↓
7. App syncs user to Supabase profiles table
   ↓
8. User is logged in and can use the app
```

### User Data Sync

When a user signs in with Auth0:

1. **Check if profile exists** in Supabase by email
2. **If not exists**: Create new profile with Auth0 data
3. **If exists**: Update `auth0_sub` field to link accounts
4. **Store user data**: Email, name, Auth0 sub

### Database Schema

```sql
profiles table:
- id (uuid, primary key)
- email (text, unique)
- nickname (text)
- auth0_sub (text, unique) ← NEW
- default_country (text)
- default_currency (text)
- created_at (timestamp)
```

---

## Troubleshooting

### Error: "Auth0 Configuration Required"

**Problem**: Auth0 environment variables are not set.

**Solution**:
1. Check that `.env` file exists in project root
2. Verify `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID` are set
3. Restart the development server after adding variables

### Error: "Callback URL mismatch"

**Problem**: The redirect URL is not in Auth0's allowed list.

**Solution**:
1. Go to Auth0 Application Settings
2. Add your URL to **Allowed Callback URLs**
3. Make sure to include both `http://localhost:5173` and `http://localhost:5173/auth/callback`

### Error: "Failed to create user profile"

**Problem**: Database migration not applied or RLS policies blocking insert.

**Solution**:
1. Apply the migration: `supabase/migrations/00014_add_auth0_support.sql`
2. Check Supabase RLS policies on `profiles` table
3. Ensure anonymous users can insert profiles

### Google Sign-In Not Working

**Problem**: Google OAuth credentials not configured correctly.

**Solution**:
1. Verify redirect URI in Google Cloud Console matches Auth0's callback URL
2. Check that Google+ API is enabled
3. Try using Auth0 Dev Keys first for testing

### Apple Sign-In Not Working

**Problem**: Apple credentials not configured correctly.

**Solution**:
1. Verify Services ID is enabled for Sign in with Apple
2. Check that return URL matches Auth0's callback URL
3. Ensure .p8 key file contents are pasted correctly
4. Verify Team ID and Key ID are correct

---

## Security Best Practices

### Production Checklist

- [ ] Use your own Google OAuth credentials (not Auth0 Dev Keys)
- [ ] Configure Apple Sign-In with your Apple Developer account
- [ ] Set up proper CORS origins in Auth0
- [ ] Enable MFA (Multi-Factor Authentication) in Auth0
- [ ] Set up Auth0 Rules for additional security checks
- [ ] Monitor Auth0 logs for suspicious activity
- [ ] Keep Auth0 SDK updated
- [ ] Use HTTPS in production
- [ ] Set secure cookie settings
- [ ] Implement rate limiting

### Environment Variables Security

- ✅ **DO**: Store credentials in `.env` file
- ✅ **DO**: Add `.env` to `.gitignore`
- ✅ **DO**: Use different Auth0 applications for dev/prod
- ❌ **DON'T**: Commit credentials to version control
- ❌ **DON'T**: Share Auth0 Client Secret publicly
- ❌ **DON'T**: Use dev keys in production

---

## Features

### What Works with Auth0

✅ Sign in with Google  
✅ Sign in with Apple  
✅ Automatic profile creation in Supabase  
✅ User data sync between Auth0 and Supabase  
✅ Token refresh  
✅ Logout  
✅ Session persistence  

### What Still Uses Supabase

✅ Email/Password authentication  
✅ Phone/OTP authentication  
✅ Database operations  
✅ Row Level Security (RLS)  
✅ File storage  
✅ Real-time subscriptions  

---

## Migration from Supabase OAuth

If you were previously using Supabase OAuth for Google/Apple:

### Before (Supabase OAuth)
```typescript
await supabase.auth.signInWithOAuth({
  provider: 'google'
});
```

### After (Auth0)
```typescript
await loginWithGoogle(); // From useHybridAuth hook
```

### Benefits of Auth0

1. **Better OAuth Support**: More reliable social login
2. **More Providers**: Easy to add Facebook, Twitter, LinkedIn, etc.
3. **Enterprise Features**: SAML, LDAP, Active Directory
4. **Better UX**: Customizable login page
5. **Advanced Security**: Anomaly detection, breached password detection
6. **Compliance**: SOC 2, GDPR, HIPAA ready

---

## Adding More Social Providers

Auth0 makes it easy to add more social login providers:

### Available Providers

- Facebook
- Twitter
- LinkedIn
- GitHub
- Microsoft
- Amazon
- And 30+ more

### How to Add

1. Go to **Authentication** → **Social**
2. Find the provider you want
3. Toggle it ON
4. Configure with provider credentials
5. No code changes needed!

---

## Support

### Auth0 Resources

- [Auth0 Documentation](https://auth0.com/docs)
- [Auth0 Community](https://community.auth0.com)
- [Auth0 Support](https://support.auth0.com)

### SmartFinHub Resources

- Check `src/contexts/HybridAuthContext.tsx` for auth logic
- Check `src/config/auth0.ts` for configuration
- Check `src/pages/Login.tsx` for UI implementation

---

## Summary

You now have:

✅ Auth0 integrated for social login  
✅ Google Sign-In enabled  
✅ Apple Sign-In enabled  
✅ Supabase for database operations  
✅ Hybrid authentication system  
✅ Automatic user sync  
✅ Production-ready setup  

**Next Steps**:
1. Configure Auth0 with your credentials
2. Test social login flows
3. Customize the login UI if needed
4. Add more social providers as needed
5. Deploy to production

---

*Last Updated: December 14, 2024*
