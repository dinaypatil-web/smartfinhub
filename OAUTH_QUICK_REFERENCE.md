# 🚀 OAuth Quick Reference - Google & Apple Sign-In

## ✅ What's Been Added

### Login Page
- **Google Sign-In Button** - Blue button with Google logo
- **Apple Sign-In Button** - Black button with Apple logo
- **"Or continue with" Section** - Divider with social login options

### Register Page
- **Google Sign-Up Button** - Already present
- **Apple Sign-Up Button** - Already present

### How It Works
1. User clicks Google or Apple button
2. Redirects to OAuth provider (Google/Apple)
3. User signs in with their account
4. Redirects back to `/auth/callback`
5. Profile created automatically
6. User redirected to dashboard

---

## ⚙️ Quick Setup Steps

### Google OAuth (5 Minutes)

1. **Google Cloud Console** → https://console.cloud.google.com/
   - Create project: "SmartFinHub"
   - Enable Google+ API
   - OAuth consent screen → External → Fill details
   - Create OAuth 2.0 Client ID
   - Add redirect URI: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret

2. **Supabase Dashboard** → https://supabase.com/dashboard
   - Authentication → Providers → Google
   - Enable Sign in with Google
   - Paste Client ID and Client Secret
   - Save

3. **Add Redirect URLs**
   - Authentication → URL Configuration
   - Add: `http://localhost:5173/auth/callback`
   - Add: `https://yourdomain.com/auth/callback`

### Apple OAuth (15 Minutes)

**Requirements:**
- Apple Developer Account ($99/year)

1. **Apple Developer Portal** → https://developer.apple.com/account/
   - Create App ID with Sign in with Apple
   - Create Services ID: `com.yourcompany.smartfinhub.web`
   - Configure web authentication
   - Add domain: `[YOUR-PROJECT-REF].supabase.co`
   - Add return URL: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
   - Create private key (.p8 file)
   - Note Key ID and Team ID

2. **Supabase Dashboard**
   - Authentication → Providers → Apple
   - Enable Sign in with Apple
   - Enter Services ID, Team ID, Key ID
   - Paste private key content
   - Save

3. **Add Redirect URLs** (same as Google)

---

## 🧪 Testing

### Test Google Sign-In
```bash
1. npm run dev
2. Go to http://localhost:5173/login
3. Click "Google" button
4. Sign in with Google account
5. Should redirect to dashboard
6. Check Supabase → Authentication → Users
```

### Test Apple Sign-In
```bash
1. Go to http://localhost:5173/login
2. Click "Apple" button
3. Sign in with Apple ID
4. Should redirect to dashboard
5. Check Supabase → Authentication → Users
```

---

## 🐛 Common Issues

### Google: "redirect_uri_mismatch"
**Fix:** Add exact redirect URI in Google Cloud Console:
```
https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
```

### Apple: "invalid_client"
**Fix:** Verify Services ID, Team ID, and Key ID are correct

### "No session found"
**Fix:** Add redirect URLs in Supabase → Authentication → URL Configuration

---

## 📋 Checklist

### Google OAuth
- [ ] Create Google Cloud project
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials
- [ ] Add redirect URI
- [ ] Enable in Supabase
- [ ] Test sign-in

### Apple OAuth
- [ ] Have Apple Developer account
- [ ] Create App ID
- [ ] Create Services ID
- [ ] Create private key
- [ ] Enable in Supabase
- [ ] Test sign-in

---

## 📚 Full Documentation

For detailed setup instructions, see:
- **SUPABASE_OAUTH_SETUP.md** - Complete configuration guide
- **EMAIL_VERIFICATION_SETUP.md** - Email verification guide

---

## 🎯 Key Points

✅ **Uses Supabase OAuth** - Not Auth0
✅ **Automatic Profile Creation** - No manual setup needed
✅ **Works with Existing Auth** - Email/phone login still works
✅ **Production Ready** - Just configure providers

**Cost:**
- Google OAuth: Free
- Apple OAuth: $99/year (Apple Developer account)

---

*Last Updated: December 15, 2024*
