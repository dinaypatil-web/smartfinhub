# Encryption Flow Diagram

## User Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LOGS IN                             │
│                    (Auth0 or Supabase)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Retrieve User Profile from Database                 │
│                  (includes encryption_salt)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Salt exists?   │
                    └────┬───────┬───┘
                         │ NO    │ YES
                         ▼       ▼
                  ┌──────────┐  │
                  │ Generate │  │
                  │ New Salt │  │
                  └────┬─────┘  │
                       │        │
                       ▼        ▼
┌─────────────────────────────────────────────────────────────────┐
│           Derive Encryption Key from User ID + Salt              │
│              (PBKDF2, 100,000 iterations, SHA-256)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│          Store Encryption Key in Session Storage                 │
│              (Cleared automatically on logout)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    USER IS AUTHENTICATED                         │
│                  (Can now access encrypted data)                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Encryption Flow (Saving Data)

```
┌─────────────────────────────────────────────────────────────────┐
│              User Creates/Updates Account/Transaction            │
│                  (e.g., balance: 5000.00)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  API Layer: encryptAccount()                     │
│                  or encryptTransaction()                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Retrieve Encryption Key from Session                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                For Each Sensitive Field:                         │
│                                                                  │
│  1. Generate Random IV (96 bits)                                │
│  2. Encrypt with AES-GCM                                        │
│  3. Combine IV + Encrypted Data                                 │
│  4. Encode as Base64                                            │
│                                                                  │
│  Example:                                                        │
│  5000.00 → "Xk9pL2...encrypted...base64...string"              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Store Encrypted Data in Database                    │
│                                                                  │
│  Database sees:                                                  │
│  {                                                               │
│    balance: "Xk9pL2...encrypted...base64...string",            │
│    institution_name: "Ab3dF5...encrypted...base64...string"     │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Data Decryption Flow (Loading Data)

```
┌─────────────────────────────────────────────────────────────────┐
│              User Requests Account/Transaction Data              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Fetch Encrypted Data from Database                  │
│                                                                  │
│  Database returns:                                               │
│  {                                                               │
│    balance: "Xk9pL2...encrypted...base64...string",            │
│    institution_name: "Ab3dF5...encrypted...base64...string"     │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  API Layer: decryptAccount()                     │
│                  or decryptTransaction()                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Retrieve Encryption Key from Session                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                For Each Encrypted Field:                         │
│                                                                  │
│  1. Decode from Base64                                          │
│  2. Extract IV (first 96 bits)                                  │
│  3. Extract Encrypted Data (remaining bytes)                    │
│  4. Decrypt with AES-GCM                                        │
│  5. Convert to original type (number/string)                    │
│                                                                  │
│  Example:                                                        │
│  "Xk9pL2...encrypted...base64...string" → 5000.00              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Decryption     │
                    │ Successful?    │
                    └────┬───────┬───┘
                         │ YES   │ NO
                         ▼       ▼
                  ┌──────────┐  ┌──────────────────┐
                  │ Return   │  │ Return Original  │
                  │Decrypted │  │ (Backward Compat)│
                  │   Data   │  │                  │
                  └────┬─────┘  └────┬─────────────┘
                       │             │
                       └──────┬──────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                Display Data to User                              │
│                                                                  │
│  User sees:                                                      │
│  {                                                               │
│    balance: 5000.00,                                            │
│    institution_name: "Chase Bank"                               │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DATA                                │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 1: RLS POLICIES                         │
│                                                                  │
│  ✓ Users can only access their own data                         │
│  ✓ Enforced at database level                                   │
│  ✓ Prevents unauthorized queries                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 2: APPLICATION ENCRYPTION                     │
│                                                                  │
│  ✓ Data encrypted before storage                                │
│  ✓ AES-GCM 256-bit encryption                                   │
│  ✓ Unique key per user                                          │
│  ✓ Keys never stored in database                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 3: DATABASE ENCRYPTION                        │
│                                                                  │
│  ✓ Supabase encrypts data at rest                               │
│  ✓ Automatic disk encryption                                    │
│  ✓ Managed by Supabase                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 4: TRANSPORT SECURITY                         │
│                                                                  │
│  ✓ All data transmitted over HTTPS                              │
│  ✓ TLS 1.3 encryption                                           │
│  ✓ Managed by Supabase                                          │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHYSICAL STORAGE                              │
│                  (Encrypted on disk)                             │
└─────────────────────────────────────────────────────────────────┘
```

## Attack Scenarios & Protection

### Scenario 1: Database Breach

```
┌─────────────────────────────────────────────────────────────────┐
│  Attacker gains access to database                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Attacker sees encrypted data:                                   │
│  balance: "Xk9pL2...encrypted...base64...string"               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  ❌ Cannot decrypt without encryption key                        │
│  ❌ Encryption key not stored in database                        │
│  ❌ Cannot derive key without user ID                            │
│                                                                  │
│  ✅ USER DATA IS PROTECTED                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Scenario 2: Unauthorized Database Query

```
┌─────────────────────────────────────────────────────────────────┐
│  Attacker tries to query another user's data                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  RLS Policy checks authentication                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  ❌ Query blocked by RLS                                         │
│  ❌ No data returned                                             │
│                                                                  │
│  ✅ USER DATA IS PROTECTED                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Scenario 3: Session Hijacking

```
┌─────────────────────────────────────────────────────────────────┐
│  Attacker gains access to user's active session                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Attacker has access to:                                         │
│  - Session token                                                 │
│  - Encryption key (in sessionStorage)                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  Attacker can access decrypted data                          │
│                                                                  │
│  Mitigation:                                                     │
│  - Use HTTPS only                                                │
│  - Implement session timeout                                     │
│  - Use secure cookies                                            │
│  - Monitor for suspicious activity                               │
└─────────────────────────────────────────────────────────────────┘
```

## Key Management

```
┌─────────────────────────────────────────────────────────────────┐
│                      ENCRYPTION KEY                              │
│                                                                  │
│  Derived from: User ID + Salt                                    │
│  Algorithm: PBKDF2                                               │
│  Iterations: 100,000                                             │
│  Hash: SHA-256                                                   │
│  Key Length: 256 bits                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WHERE IS IT STORED?                           │
│                                                                  │
│  ✅ Session Storage (temporary, cleared on logout)               │
│  ❌ NOT in Database                                              │
│  ❌ NOT in Local Storage                                         │
│  ❌ NOT on Server                                                │
│  ❌ NOT in Cookies                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WHAT ABOUT THE SALT?                          │
│                                                                  │
│  ✅ Stored in Database (profiles.encryption_salt)                │
│  ✅ Unique per user                                              │
│  ✅ Not secret (but useless without User ID)                     │
│  ✅ Generated once per user                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Example: Creating a Bank Account

```
USER ACTION:
  User fills form:
  - Account Name: "My Savings"
  - Institution: "Chase Bank"
  - Balance: $5,000.00

                    ↓

FRONTEND (React):
  accountApi.createAccount({
    account_name: "My Savings",
    institution_name: "Chase Bank",
    balance: 5000.00
  })

                    ↓

API LAYER (src/db/api.ts):
  encryptAccount({
    account_name: "My Savings",
    institution_name: "Chase Bank",
    balance: 5000.00
  })

                    ↓

ENCRYPTION (src/utils/encryptedStorage.ts):
  For each sensitive field:
  - institution_name: "Chase Bank"
    → "Ab3dF5Gh7...encrypted...base64"
  - balance: 5000.00
    → "Xk9pL2Mn4...encrypted...base64"

                    ↓

DATABASE (Supabase):
  INSERT INTO accounts (
    account_name,
    institution_name,
    balance
  ) VALUES (
    'My Savings',
    'Ab3dF5Gh7...encrypted...base64',
    'Xk9pL2Mn4...encrypted...base64'
  )

                    ↓

STORED IN DATABASE:
  {
    id: "uuid-123",
    account_name: "My Savings",
    institution_name: "Ab3dF5Gh7...encrypted...base64",
    balance: "Xk9pL2Mn4...encrypted...base64"
  }

                    ↓

RETURN TO USER:
  After decryption:
  {
    id: "uuid-123",
    account_name: "My Savings",
    institution_name: "Chase Bank",
    balance: 5000.00
  }
```

## Summary

**What's Encrypted**: Account balances, institution names, transaction amounts, descriptions, EMI details

**How It's Encrypted**: AES-GCM 256-bit encryption with unique keys per user

**Where Keys Are Stored**: Session storage (temporary, cleared on logout)

**Protection Level**: High - protects against database breaches and unauthorized access

**User Experience**: Transparent - encryption/decryption happens automatically
