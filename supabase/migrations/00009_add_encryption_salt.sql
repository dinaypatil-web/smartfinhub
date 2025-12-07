/*
# Add Encryption Salt for Client-Side Encryption

## Overview
Adds encryption_salt field to profiles table to support client-side end-to-end encryption.
The salt is used to derive encryption keys from user passwords.

## Changes

### 1. New Column
- `profiles.encryption_salt` (text, nullable initially for migration)
  - Stores base64-encoded salt for PBKDF2 key derivation
  - Generated on client-side during registration/first login
  - Used to derive encryption key from user's password
  - Never transmitted in plain text with password

### 2. Security Model
- Client-side encryption: All sensitive data encrypted before sending to database
- Password-based key derivation: Encryption key derived from user password using PBKDF2
- Zero-knowledge: Server never has access to encryption key or decrypted data
- Salt storage: Salt stored in database but useless without password

## Notes
- Existing users will need to generate salt on next login
- New users will generate salt during registration
- Encryption key never stored anywhere, only derived when needed
- Session storage used for temporary key storage (cleared on logout)
*/

-- Add encryption_salt column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS encryption_salt text;

-- Add comment explaining the field
COMMENT ON COLUMN profiles.encryption_salt IS 'Base64-encoded salt for client-side encryption key derivation using PBKDF2';
