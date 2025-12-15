# ✅ OAuth Configuration Checklist - SmartFinHub

## 🎯 Your Supabase Project Details

```
Project URL: https://ftdrzbbbolueyabofatb.supabase.co
Project Ref: ftdrzbbbolueyabofatb
Dashboard: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb
```

---

## 🔧 Step 1: Configure Supabase Redirect URLs

### Go to Supabase Dashboard
1. Navigate to: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb
2. Click **Authentication** in the left sidebar
3. Click **URL Configuration** tab

### Add These URLs

**Site URL:**
```
http://localhost:5173
```

**Redirect URLs (Add both):**
```
http://localhost:5173/auth/callback
https://yourdomain.com/auth/callback
```

**Additional Redirect URLs (Optional for production):**
```
https://app-7wraacwkpcld.miaoda.tech/auth/callback
```

### Screenshot Guide
- Site URL: The base URL of your application
- Redirect URLs: Where users return after OAuth authentication
- Click **Save** after adding URLs

---

## 🔵 Step 2: Configure Google OAuth

### Part A: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select Project**
   - Project name: "SmartFinHub" (or your preferred name)

3. **Enable Google+ API**
   - Go to: APIs & Services → Library
   - Search: "Google+ API"
   - Click **Enable**

4. **Configure OAuth Consent Screen**
   - Go to: APIs & Services → OAuth consent screen
   - User Type: **External**
   - App name: **SmartFinHub**
   - User support email: Your email
   - Developer contact email: Your email
   - Scopes: Add `userinfo.email` and `userinfo.profile`
   - Test users: Add your email for testing

5. **Create OAuth 2.0 Credentials**
   - Go to: APIs & Services → Credentials
   - Click: **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: "SmartFinHub Web Client"
   
   **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   https://yourdomain.com
   ```
   
   **Authorized redirect URIs (CRITICAL):**
   ```
   https://ftdrzbbbolueyabofatb.supabase.co/auth/v1/callback
   ```
   
   - Click **Create**
   - **COPY** the Client ID and Client Secret

### Part B: Supabase Dashboard Setup

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb
   - Click **Authentication** → **Providers**

2. **Enable Google Provider**
   - Find **Google** in the list
   - Toggle **Enable Sign in with Google** to **ON**

3. **Enter Credentials**
   - **Client ID (for OAuth)**: Paste from Google Cloud Console
   - **Client Secret (for OAuth)**: Paste from Google Cloud Console
   - Click **Save**

### Verification
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 Client ID created
- [ ] Redirect URI includes: `https://ftdrzbbbolueyabofatb.supabase.co/auth/v1/callback`
- [ ] Google provider enabled in Supabase
- [ ] Client ID and Secret entered in Supabase

---

## 🍎 Step 3: Configure Apple OAuth (Optional)

### Requirements
- Apple Developer Account ($99/year)
- If you don't have this, skip Apple OAuth

### Part A: Apple Developer Portal Setup

1. **Create App ID**
   - Visit: https://developer.apple.com/account/resources/identifiers/list
   - Click **+** button
   - Select **App IDs** → **App** → Continue
   - Description: **SmartFinHub**
   - Bundle ID: `com.yourcompany.smartfinhub`
   - Enable: **Sign in with Apple**
   - Click **Continue** → **Register**

2. **Create Services ID**
   - Click **+** button again
   - Select **Services IDs** → Continue
   - Description: **SmartFinHub Web**
   - Identifier: `com.yourcompany.smartfinhub.web`
   - Enable: **Sign in with Apple**
   - Click **Configure**
   
   **Web Authentication Configuration:**
   - Primary App ID: Select your App ID
   - Domains and Subdomains:
     ```
     ftdrzbbbolueyabofatb.supabase.co
     ```
   - Return URLs:
     ```
     https://ftdrzbbbolueyabofatb.supabase.co/auth/v1/callback
     ```
   - Click **Next** → **Done** → **Continue** → **Save**

3. **Create Private Key**
   - Visit: https://developer.apple.com/account/resources/authkeys/list
   - Click **+** button
   - Key Name: **SmartFinHub Sign in with Apple Key**
   - Enable: **Sign in with Apple**
   - Click **Configure** → Select your App ID
   - Click **Save** → **Continue** → **Register**
   - Click **Download** (save the .p8 file securely!)
   - Note the **Key ID** (10 characters)

4. **Get Team ID**
   - Visit: https://developer.apple.com/account/
   - Your **Team ID** is in the top right corner (10 characters)

### Part B: Supabase Dashboard Setup

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb
   - Click **Authentication** → **Providers**

2. **Enable Apple Provider**
   - Find **Apple** in the list
   - Toggle **Enable Sign in with Apple** to **ON**

3. **Enter Credentials**
   - **Services ID**: `com.yourcompany.smartfinhub.web`
   - **Team ID**: Your 10-character Team ID
   - **Key ID**: Your 10-character Key ID
   - **Private Key**: Open .p8 file and paste entire content:
     ```
     -----BEGIN PRIVATE KEY-----
     [key content]
     -----END PRIVATE KEY-----
     ```
   - Click **Save**

### Verification
- [ ] Apple Developer account active
- [ ] App ID created with Sign in with Apple
- [ ] Services ID created and configured
- [ ] Private key downloaded and saved
- [ ] Return URL includes: `https://ftdrzbbbolueyabofatb.supabase.co/auth/v1/callback`
- [ ] Apple provider enabled in Supabase
- [ ] All credentials entered in Supabase

---

## 🧪 Step 4: Test OAuth Integration

### Test Google Sign-In

1. **Start the application**
   ```bash
   npm run dev
   ```

2. **Open browser**
   - Navigate to: http://localhost:5173/login

3. **Click "Google" button**
   - Should redirect to Google sign-in page
   - Sign in with your Google account
   - Grant permissions

4. **Verify redirect**
   - Should redirect to: http://localhost:5173/auth/callback
   - Should see: "Completing sign in..." message
   - Should redirect to: http://localhost:5173/ (dashboard)
   - Should see: "Logged in successfully!" toast notification

5. **Check Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb
   - Click **Authentication** → **Users**
   - Should see your Google account listed
   - Click **Database** → **profiles** table
   - Should see your profile created

### Test Apple Sign-In (if configured)

1. **Go to login page**
   - Navigate to: http://localhost:5173/login

2. **Click "Apple" button**
   - Should redirect to Apple sign-in page
   - Sign in with your Apple ID
   - Choose to share or hide email
   - Grant permissions

3. **Verify redirect**
   - Should redirect to: http://localhost:5173/auth/callback
   - Should see: "Completing sign in..." message
   - Should redirect to: http://localhost:5173/ (dashboard)
   - Should see: "Logged in successfully!" toast notification

4. **Check Supabase Dashboard**
   - Should see your Apple account in Users
   - Should see profile created in profiles table

---

## 🐛 Troubleshooting

### Issue: "redirect_uri_mismatch" (Google)

**Cause:** Redirect URI in Google Cloud Console doesn't match Supabase callback URL

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add exact redirect URI (no trailing slash):
   ```
   https://ftdrzbbbolueyabofatb.supabase.co/auth/v1/callback
   ```
4. Click **Save**
5. Wait 5 minutes for changes to propagate

### Issue: "Access blocked: This app's request is invalid" (Google)

**Cause:** OAuth consent screen not properly configured

**Solution:**
1. Go to Google Cloud Console → OAuth consent screen
2. Verify all required fields are filled
3. Add scopes: `userinfo.email` and `userinfo.profile`
4. Add your email as a test user
5. Save changes

### Issue: "invalid_client" (Apple)

**Cause:** Services ID, Team ID, or Key ID incorrect

**Solution:**
1. Verify Services ID matches exactly: `com.yourcompany.smartfinhub.web`
2. Verify Team ID is correct (10 characters)
3. Verify Key ID is correct (10 characters)
4. Ensure private key includes BEGIN and END lines

### Issue: "invalid_request - redirect_uri" (Apple)

**Cause:** Return URL in Apple Developer Portal doesn't match

**Solution:**
1. Go to Apple Developer Portal → Services ID
2. Click on your Services ID
3. Configure Sign in with Apple
4. Add exact return URL:
   ```
   https://ftdrzbbbolueyabofatb.supabase.co/auth/v1/callback
   ```
5. Save changes

### Issue: "No session found"

**Cause:** Redirect URLs not configured in Supabase

**Solution:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add redirect URL:
   ```
   http://localhost:5173/auth/callback
   ```
3. Click **Save**

### Issue: OAuth button does nothing

**Cause:** JavaScript error or provider not enabled

**Solution:**
1. Open browser console (F12)
2. Click OAuth button
3. Check for error messages
4. Verify provider is enabled in Supabase
5. Verify Client ID/Secret are entered

### Issue: Redirects but shows error

**Cause:** Profile creation failed or session issue

**Solution:**
1. Check Supabase logs:
   - Dashboard → Logs → Auth Logs
2. Check browser console for errors
3. Verify profiles table exists
4. Verify RLS policies allow profile creation

### Issue: "Failed to sign in with Google"

**Cause:** Google+ API not enabled or credentials incorrect

**Solution:**
1. Enable Google+ API in Google Cloud Console
2. Verify Client ID and Secret in Supabase
3. Check Supabase logs for detailed error
4. Try regenerating credentials in Google Cloud Console

---

## 📋 Final Checklist

### Supabase Configuration
- [ ] Site URL set to: `http://localhost:5173`
- [ ] Redirect URL added: `http://localhost:5173/auth/callback`
- [ ] Google provider enabled
- [ ] Google Client ID entered
- [ ] Google Client Secret entered
- [ ] Apple provider enabled (optional)
- [ ] Apple credentials entered (optional)

### Google Cloud Console
- [ ] Project created
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 Client ID created
- [ ] Redirect URI added: `https://ftdrzbbbolueyabofatb.supabase.co/auth/v1/callback`
- [ ] Client ID and Secret copied

### Apple Developer Portal (Optional)
- [ ] App ID created
- [ ] Services ID created
- [ ] Services ID configured with return URL
- [ ] Private key created and downloaded
- [ ] Team ID noted
- [ ] Key ID noted

### Testing
- [ ] Application starts without errors
- [ ] Login page displays Google button
- [ ] Login page displays Apple button (if configured)
- [ ] Google OAuth flow works end-to-end
- [ ] Apple OAuth flow works end-to-end (if configured)
- [ ] User profile created in database
- [ ] User redirected to dashboard after login
- [ ] Success toast notification appears

---

## 🎉 Success Criteria

When everything is configured correctly:

1. ✅ Click "Google" button → Redirects to Google
2. ✅ Sign in with Google → Redirects back to app
3. ✅ See "Completing sign in..." → Brief loading screen
4. ✅ Redirected to dashboard → Main app interface
5. ✅ See "Logged in successfully!" → Toast notification
6. ✅ User appears in Supabase Users → Authentication working
7. ✅ Profile created in database → Profile creation working

---

## 📚 Additional Resources

### Documentation
- **Supabase OAuth Guide**: https://supabase.com/docs/guides/auth/social-login
- **Google OAuth Guide**: https://developers.google.com/identity/protocols/oauth2
- **Apple OAuth Guide**: https://developer.apple.com/sign-in-with-apple/

### Your Project Links
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb
- **Authentication Settings**: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb/auth/providers
- **URL Configuration**: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb/auth/url-configuration
- **Users**: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb/auth/users
- **Logs**: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb/logs/auth-logs

### Support
- **Supabase Discord**: https://discord.supabase.com/
- **Supabase GitHub**: https://github.com/supabase/supabase

---

## 🔑 Key Points to Remember

1. **Redirect URI Format**
   - Google/Apple redirect to: `https://ftdrzbbbolueyabofatb.supabase.co/auth/v1/callback`
   - Supabase redirects to: `http://localhost:5173/auth/callback`
   - No trailing slashes!

2. **Testing Environment**
   - Use `http://localhost:5173` for development
   - Add test users in Google OAuth consent screen
   - Apple OAuth works the same in dev and prod

3. **Production Deployment**
   - Update Site URL to production domain
   - Add production redirect URL
   - Update Google authorized origins
   - Publish OAuth consent screen (Google)

4. **Security**
   - Never commit OAuth credentials to version control
   - Keep Client Secrets secure
   - Rotate keys periodically
   - Use HTTPS in production

---

*Last Updated: December 15, 2024*
*Project: SmartFinHub*
*Supabase Project: ftdrzbbbolueyabofatb*
