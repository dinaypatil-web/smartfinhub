/*
# Add Encryption Salt for Client-Side Encryption

## Overview
Adds encryption_salt field to profiles table to support end-to-end encryption.
Users' sensitive data will be encrypted client-side using a key derived from
their password and this salt.

## Changes
1. Add encryption_salt column to profiles table
   - Stores base64-encoded salt for PBKDF2 key derivation
   - Not sensitive (salt is meant to be stored)
   - Required for deriving encryption key from password

## Security Model
- Encryption key derived from: user password + salt
- Key never stored anywhere (only in memory during session)
- All sensitive data encrypted before sending to database
- Server/admin cannot decrypt user data (zero-knowledge)
- Salt is public information (not secret)

## Migration Safety
- Non-breaking change (adds optional column)
- Existing users will have NULL salt (encryption not yet enabled)
- New users will have salt generated on registration
- Existing users can enable encryption on next login
*/

-- Add encryption_salt column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS encryption_salt text;

-- Add comment explaining the field
COMMENT ON COLUMN profiles.encryption_salt IS 'Base64-encoded salt for PBKDF2 key derivation. Used for client-side end-to-end encryption. Not sensitive data.';
