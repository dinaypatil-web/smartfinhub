# Setting Up SmartFinHub on Vercel

This guide will help you configure environment variables for the SmartFinHub app on Vercel.

## Prerequisites

You should have already deployed the app to Vercel. If not, connect your GitHub repository to Vercel first.

## Required Environment Variables

The following environment variables must be set on Vercel for the app to work:

### 1. **Supabase Configuration** (Database)
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### 2. **Auth0 Configuration** (Authentication)
- `VITE_AUTH0_DOMAIN` - Your Auth0 tenant domain
- `VITE_AUTH0_CLIENT_ID` - Your Auth0 application client ID
- `VITE_AUTH0_AUDIENCE` - (Optional) Your Auth0 API audience

### 3. **Application Configuration**
- `VITE_APP_ID` - Application identifier (e.g., `app-7wraacwkpcld`)
- `VITE_API_ENV` - Environment (e.g., `production`)

## How to Set Environment Variables on Vercel

### Option 1: Using Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your SmartFinHub project
3. Click on **Settings**
4. Navigate to **Environment Variables**
5. For each variable below, click **Add New** and enter:
   - **Name**: Variable name (e.g., `VITE_SUPABASE_URL`)
   - **Value**: The actual value
   - **Environments**: Select `Production`, `Preview`, and `Development`
6. Click **Save**

### Option 2: Using Vercel CLI

```bash
# Install Vercel CLI if you haven't already
npm install -g vercel

# Login to Vercel
vercel login

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_AUTH0_DOMAIN
vercel env add VITE_AUTH0_CLIENT_ID
vercel env add VITE_AUTH0_AUDIENCE
vercel env add VITE_APP_ID
vercel env add VITE_API_ENV
```

## Getting Your Credentials

### From Supabase:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### From Auth0:
1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Select your application
3. Go to **Settings**
4. Copy:
   - **Domain** → `VITE_AUTH0_DOMAIN`
   - **Client ID** → `VITE_AUTH0_CLIENT_ID`
5. Optional: Find **API Identifier** → `VITE_AUTH0_AUDIENCE`

## After Setting Variables

1. **Redeploy your app**: Go to Vercel Dashboard → Select your project → Click **Redeploy**
   - Or push a new commit to GitHub to trigger automatic deployment

2. **Wait for deployment**: The deployment should now include the environment variables

3. **Test the app**: Visit your Vercel URL and verify the app loads properly

## Troubleshooting

### Still seeing a blank page?
1. Check your browser's developer console (F12) for errors
2. Verify all environment variables are correctly set on Vercel
3. Ensure variable names start with `VITE_` prefix
4. Trigger a new deployment after setting variables

### Variables not taking effect?
1. Clear browser cache (Ctrl+Shift+Delete)
2. Do a hard refresh (Ctrl+Shift+R)
3. Check that variables are set for "Production" environment

### Auth0 errors?
- Make sure your Auth0 application allows your Vercel domain in:
  - **Allowed Callback URLs**: `https://yourdomain.vercel.app`
  - **Allowed Web Origins**: `https://yourdomain.vercel.app`
  - **Allowed Logout URLs**: `https://yourdomain.vercel.app`

### Supabase connection errors?
- Verify the Supabase URL and key are correct
- Check that RLS policies allow anonymous access if needed
- Ensure Supabase project is active (not paused)

## Example Configuration

Here's what your Vercel Environment Variables should look like:

```
VITE_SUPABASE_URL=https://ftdrzbbbolueyabofatb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_AUTH0_DOMAIN=dev-qap6fi05a7ifozzw.us.auth0.com
VITE_AUTH0_CLIENT_ID=RyAOVR5V8cuhx4c1awrxOllZMo6GcQda
VITE_AUTH0_AUDIENCE=NHv7Gb6E9JmFZ-E86Iz3Tadh2Gebh8GxaEBIqOIcurqHvffceJCBmgnP5d-AiWxD
VITE_APP_ID=app-7wraacwkpcld
VITE_API_ENV=production
```

## Need Help?

If you're still having issues:
1. Review the Auth0 and Supabase setup guides in the project documentation
2. Check that your local `.env` file works correctly
3. Contact support with the specific error message from the browser console
