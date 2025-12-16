# Email Authentication Guide - SmartFinHub

## Overview

SmartFinHub uses **email-only authentication** with email verification powered by Supabase's built-in email service. No third-party services or OAuth providers are required.

---

## 🔧 Supabase Configuration

### Your Project Details

```
Project URL: https://ftdrzbbbolueyabofatb.supabase.co
Project Ref: ftdrzbbbolueyabofatb
Dashboard: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb
```

---

## ✅ Step 1: Enable Email Authentication

### Go to Supabase Dashboard

1. Navigate to: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb
2. Click **Authentication** in the left sidebar
3. Click **Providers** tab

### Configure Email Provider

1. Find **Email** in the providers list
2. Ensure **Enable Email provider** is **ON** (enabled by default)
3. **Enable email confirmations** should be **ON**
4. Click **Save**

---

## 📧 Step 2: Configure Email Templates (Optional)

### Customize Email Templates

1. Go to: **Authentication** → **Email Templates**
2. You can customize the following templates:
   - **Confirm signup**: Sent when a user registers
   - **Magic Link**: For passwordless login (optional)
   - **Change Email Address**: When user changes email
   - **Reset Password**: For password reset requests

### Default Template Variables

The email templates support these variables:
- `{{ .ConfirmationURL }}` - Email verification link
- `{{ .Token }}` - Verification token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your application URL

### Example Confirmation Email Template

```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your email address:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>

<p>If you didn't request this email, you can safely ignore it.</p>
```

---

## 🌐 Step 3: Configure URL Settings

### Set Redirect URLs

1. Go to: **Authentication** → **URL Configuration**
2. Configure the following:

**Site URL:**
```
http://localhost:5173
```

**Redirect URLs (add both):**
```
http://localhost:5173/confirm-email
http://localhost:5173/reset-password
http://localhost:5173/auth/callback
```

**For Production (add your domain):**
```
https://yourdomain.com/confirm-email
https://yourdomain.com/reset-password
https://yourdomain.com/auth/callback
```

3. Click **Save**

---

## 🔐 Step 4: Configure Email Rate Limiting (Optional)

### Prevent Email Abuse

1. Go to: **Authentication** → **Rate Limits**
2. Configure rate limits for:
   - **Email signups**: Limit registrations per hour
   - **Password resets**: Limit reset requests per hour
   - **Email confirmations**: Limit verification emails

### Recommended Settings

- Email signups: 5 per hour per IP
- Password resets: 3 per hour per email
- Email confirmations: 3 per hour per email

---

## 🧪 Step 5: Test Email Authentication

### Test User Registration

1. **Start the application**
   ```bash
   npm run dev
   ```

2. **Open browser**
   - Navigate to: http://localhost:5173/register

3. **Register a new account**
   - Enter your email address
   - Create a password (minimum 6 characters)
   - Confirm password
   - Click **Create Account**

4. **Check for success message**
   - Should see: "Registration successful! Please check your email to verify your account."
   - Should be redirected to email verification page

5. **Check your email**
   - Open your email inbox
   - Look for email from: noreply@mail.app.supabase.io
   - Subject: "Confirm Your Signup"
   - Click the verification link

6. **Verify redirect**
   - Should redirect to: http://localhost:5173/confirm-email
   - Should see success message
   - Click "Go to Login"

7. **Sign in**
   - Navigate to: http://localhost:5173/login
   - Enter your email and password
   - Click **Sign In**
   - Should redirect to dashboard

### Test Password Reset

1. **Go to login page**
   - Navigate to: http://localhost:5173/login

2. **Click "Forgot password?"**
   - Enter your email address
   - Click **Send Reset Link**

3. **Check your email**
   - Look for password reset email
   - Click the reset link

4. **Reset password**
   - Should redirect to: http://localhost:5173/reset-password
   - Enter new password
   - Confirm new password
   - Click **Reset Password**

5. **Sign in with new password**
   - Should redirect to login page
   - Sign in with new password

---

## 🐛 Troubleshooting

### Issue: Not receiving verification emails

**Possible Causes:**
1. Email provider blocking Supabase emails
2. Emails going to spam folder
3. Email confirmations not enabled
4. Rate limit exceeded

**Solutions:**

1. **Check Spam Folder**
   - Look in spam/junk folder
   - Mark as "Not Spam" if found

2. **Check Supabase Email Settings**
   - Go to: Authentication → Providers → Email
   - Ensure "Enable email confirmations" is ON
   - Click Save

3. **Check Supabase Logs**
   - Go to: Dashboard → Logs → Auth Logs
   - Look for email sending errors
   - Check for rate limit errors

4. **Use a Different Email Provider**
   - Try Gmail, Outlook, or ProtonMail
   - Some corporate emails block automated emails

5. **Check Email Template**
   - Go to: Authentication → Email Templates
   - Verify "Confirm signup" template is valid
   - Test with default template

### Issue: Verification link not working

**Possible Causes:**
1. Link expired (24-hour expiration)
2. Redirect URL not configured
3. Link already used

**Solutions:**

1. **Request New Verification Email**
   - Register again with the same email
   - New verification email will be sent

2. **Check Redirect URLs**
   - Go to: Authentication → URL Configuration
   - Ensure redirect URLs include:
     - http://localhost:5173/confirm-email
     - http://localhost:5173/auth/callback

3. **Check Link Expiration**
   - Verification links expire after 24 hours
   - Request a new verification email

### Issue: "Email not confirmed" error when logging in

**Cause:** User hasn't clicked verification link

**Solution:**
1. Check email for verification link
2. Click the verification link
3. Try logging in again
4. If no email received, see "Not receiving verification emails" above

### Issue: Password reset link not working

**Possible Causes:**
1. Link expired
2. Redirect URL not configured
3. Link already used

**Solutions:**

1. **Request New Reset Link**
   - Go to login page
   - Click "Forgot password?"
   - Enter email and request new link

2. **Check Redirect URLs**
   - Ensure http://localhost:5173/reset-password is in redirect URLs

3. **Check Link Expiration**
   - Password reset links expire after 1 hour
   - Request a new link if expired

### Issue: "Invalid credentials" error

**Possible Causes:**
1. Wrong email or password
2. Email not verified
3. Account doesn't exist

**Solutions:**

1. **Verify Email Address**
   - Check for typos in email
   - Ensure you're using the correct email

2. **Verify Account Exists**
   - Go to Supabase Dashboard → Authentication → Users
   - Check if your email is listed
   - Check if "Email Confirmed" is true

3. **Reset Password**
   - Use "Forgot password?" link
   - Reset your password
   - Try logging in again

---

## 🔒 Security Best Practices

### Password Requirements

- Minimum 6 characters (enforced)
- Recommended: 12+ characters
- Use mix of uppercase, lowercase, numbers, symbols
- Don't reuse passwords from other sites

### Email Security

- Use a secure email provider
- Enable two-factor authentication on your email
- Don't share verification links
- Verification links expire after 24 hours

### Account Security

- Don't share your password
- Log out when using shared computers
- Change password regularly
- Use password manager for strong passwords

---

## 📋 Configuration Checklist

### Supabase Dashboard
- [ ] Email provider enabled
- [ ] Email confirmations enabled
- [ ] Site URL configured: http://localhost:5173
- [ ] Redirect URLs configured:
  - [ ] http://localhost:5173/confirm-email
  - [ ] http://localhost:5173/reset-password
  - [ ] http://localhost:5173/auth/callback
- [ ] Email templates reviewed (optional)
- [ ] Rate limits configured (optional)

### Application Testing
- [ ] Registration works
- [ ] Verification email received
- [ ] Verification link works
- [ ] Login works after verification
- [ ] Password reset works
- [ ] Reset email received
- [ ] Reset link works
- [ ] Can login with new password

### Production Deployment
- [ ] Update Site URL to production domain
- [ ] Add production redirect URLs
- [ ] Test email delivery in production
- [ ] Configure custom SMTP (optional)
- [ ] Set up email monitoring

---

## 🚀 Production Deployment

### Update URLs for Production

1. **Update Site URL**
   - Change from: http://localhost:5173
   - Change to: https://yourdomain.com

2. **Add Production Redirect URLs**
   ```
   https://yourdomain.com/confirm-email
   https://yourdomain.com/reset-password
   https://yourdomain.com/auth/callback
   ```

3. **Test Email Delivery**
   - Register a test account in production
   - Verify email delivery works
   - Test all email flows

### Custom SMTP (Optional)

For production, you may want to use your own SMTP server:

1. Go to: **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Configure your SMTP server:
   - Host
   - Port
   - Username
   - Password
   - Sender email
   - Sender name

**Popular SMTP Providers:**
- SendGrid
- Mailgun
- Amazon SES
- Postmark
- Resend

---

## 📚 Additional Resources

### Documentation
- **Supabase Auth Guide**: https://supabase.com/docs/guides/auth
- **Email Auth**: https://supabase.com/docs/guides/auth/auth-email
- **Email Templates**: https://supabase.com/docs/guides/auth/auth-email-templates

### Your Project Links
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb
- **Authentication Settings**: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb/auth/providers
- **URL Configuration**: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb/auth/url-configuration
- **Email Templates**: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb/auth/templates
- **Users**: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb/auth/users
- **Logs**: https://supabase.com/dashboard/project/ftdrzbbbolueyabofatb/logs/auth-logs

---

## 🎯 Key Features

### ✅ What's Included

- **Email Registration**: Users sign up with email and password
- **Email Verification**: Automatic verification email sent on registration
- **Secure Login**: Email and password authentication
- **Password Reset**: Self-service password reset via email
- **No Third-Party Dependencies**: Uses Supabase's built-in email service
- **No OAuth**: No Google, Apple, or other social login providers
- **No Phone/SMS**: No phone number or OTP authentication

### ❌ What's Not Included

- Google OAuth sign-in
- Apple OAuth sign-in
- Phone number authentication
- SMS OTP verification
- Magic link login (can be enabled if needed)
- Social media logins

---

## 💡 Tips

1. **Development Testing**
   - Use real email addresses for testing
   - Check spam folder if emails don't arrive
   - Supabase provides unlimited emails in development

2. **Email Deliverability**
   - Supabase emails may go to spam initially
   - Mark as "Not Spam" to improve deliverability
   - Consider custom SMTP for production

3. **User Experience**
   - Clear instructions on registration page
   - Helpful error messages
   - Email verification reminder
   - Easy password reset process

4. **Security**
   - Email verification prevents fake accounts
   - Password requirements enforce security
   - Rate limiting prevents abuse
   - Secure password reset flow

---

*Last Updated: December 16, 2024*
*Project: SmartFinHub*
*Authentication Method: Email Only*
*Supabase Project: ftdrzbbbolueyabofatb*
