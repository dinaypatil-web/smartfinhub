/*
# Add Auth0 Support to Profiles

## Overview
This migration adds Auth0 integration support to the profiles table,
allowing users to sign in with Google or Apple via Auth0 while keeping
Supabase for database operations.

## Changes
1. Add `auth0_sub` column to store Auth0 user ID
2. Add index on `auth0_sub` for faster lookups
3. Add index on `email` for Auth0 user sync

## Notes
- auth0_sub is nullable to support both Auth0 and Supabase auth users
- Email is used to link Auth0 users with Supabase profiles
- Existing users are not affected
*/

-- Add auth0_sub column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS auth0_sub text UNIQUE;

-- Add index on auth0_sub for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_auth0_sub ON profiles(auth0_sub);

-- Add index on email for Auth0 user sync (if not exists)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add comment
COMMENT ON COLUMN profiles.auth0_sub IS 'Auth0 user ID (sub claim) for social login users';
