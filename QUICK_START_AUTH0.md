# Quick Start: Auth0 Social Login

## 🚀 Get Started in 5 Minutes

SmartFinHub now supports **Sign in with Google** and **Sign in with Apple**!

---

## Step 1: Create Auth0 Account (2 minutes)

1. Go to [https://auth0.com/signup](https://auth0.com/signup)
2. Sign up for free
3. Choose a tenant name (e.g., `smartfinhub`)

---

## Step 2: Create Application (1 minute)

1. In Auth0 Dashboard → **Applications** → **Create Application**
2. Name: `SmartFinHub`
3. Type: **Single Page Web Applications**
4. Click **Create**

---

## Step 3: Configure URLs (1 minute)

In your application settings, add:

**Allowed Callback URLs**:
```
http://localhost:5173
```

**Allowed Logout URLs**:
```
http://localhost:5173
```

**Allowed Web Origins**:
```
http://localhost:5173
```

Click **Save Changes**

---

## Step 4: Enable Social Login (1 minute)

### Google
1. Go to **Authentication** → **Social**
2. Find **Google** → Toggle ON
3. Toggle **Use Auth0's Dev Keys** → ON
4. Click **Save**

### Apple (Optional)
1. Find **Apple** → Toggle ON
2. Configure with your Apple Developer credentials
3. Or skip for now and use Google only

---

## Step 5: Add Environment Variables (30 seconds)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your Auth0 credentials:

```env
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
```

**Where to find these**:
- Domain: Application Settings → Domain
- Client ID: Application Settings → Client ID

---

## Step 6: Start the App

```bash
npm install
npm run dev
```

Navigate to `http://localhost:5173/login`

---

## ✅ Done!

You should now see:
- **Google** button on login page
- **Apple** button on login page
- Click to sign in with one click!

---

## 🎯 What You Get

✅ One-click sign-in with Google  
✅ One-click sign-in with Apple  
✅ No password to remember  
✅ Automatic profile creation  
✅ Secure authentication  

---

## 📚 Need More Help?

- **Detailed Setup**: See `AUTH0_SETUP_GUIDE.md`
- **Technical Details**: See `AUTH0_INTEGRATION_SUMMARY.md`
- **Troubleshooting**: See `AUTH0_SETUP_GUIDE.md` → Troubleshooting section

---

## 🔧 Production Setup

For production, you'll need to:

1. **Use your own Google OAuth credentials** (not Auth0 dev keys)
2. **Configure Apple Sign-In** with Apple Developer account
3. **Add production URLs** to Auth0 settings
4. **Enable security features** in Auth0

See `AUTH0_SETUP_GUIDE.md` for production setup instructions.

---

## 🆘 Common Issues

### "Auth0 Configuration Required"
→ Add credentials to `.env` and restart server

### "Callback URL mismatch"
→ Add `http://localhost:5173` to Allowed Callback URLs in Auth0

### Google button not working
→ Make sure "Use Auth0's Dev Keys" is enabled for Google

---

## 🎉 That's It!

You're ready to use social login in SmartFinHub!

**Questions?** Check the detailed guides in the project root.

---

*Last Updated: December 14, 2024*
