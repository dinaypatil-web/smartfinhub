# SmartFinHub Encryption System Guide

## Overview

SmartFinHub implements **end-to-end encryption** for all sensitive user data. This means that all financial information is encrypted on the user's device before being sent to the database, ensuring that even the application creator cannot access user data.

## Security Architecture

### Zero-Knowledge Encryption

The system uses a zero-knowledge architecture where:

1. **Encryption key is derived from user's password** using PBKDF2 with 100,000 iterations
2. **Key never leaves the user's browser** - it's never sent to the server
3. **Server only stores encrypted data** - cannot decrypt without user's password
4. **Salt is stored in database** but is useless without the password

### Encryption Specifications

- **Algorithm**: AES-GCM (Advanced Encryption Standard - Galois/Counter Mode)
- **Key Size**: 256 bits
- **Key Derivation**: PBKDF2 with SHA-256, 100,000 iterations
- **IV (Initialization Vector)**: 96 bits, randomly generated for each encryption
- **Authentication Tag**: 128 bits (provided by GCM mode)
- **Salt**: 128 bits, randomly generated per user

## How It Works

### 1. User Registration/First Login

```
User enters password
    ↓
Generate random salt (128 bits)
    ↓
Derive encryption key using PBKDF2(password, salt, 100000 iterations)
    ↓
Store salt in database (profiles.encryption_salt)
    ↓
Store encryption key in sessionStorage (temporary)
```

### 2. Subsequent Logins

```
User enters password
    ↓
Retrieve salt from database
    ↓
Derive encryption key using PBKDF2(password, salt, 100000 iterations)
    ↓
Store encryption key in sessionStorage (temporary)
```

### 3. Data Encryption (Before Saving)

```
User enters financial data
    ↓
Encrypt sensitive fields using AES-GCM with encryption key
    ↓
Send encrypted data to database
    ↓
Database stores encrypted data (unreadable without key)
```

### 4. Data Decryption (When Loading)

```
Retrieve encrypted data from database
    ↓
Decrypt using encryption key from sessionStorage
    ↓
Display decrypted data to user
```

### 5. Logout/Session End

```
User logs out or closes browser
    ↓
Clear encryption key from sessionStorage
    ↓
All data remains encrypted in database
```

## Encrypted Data Fields

### Accounts Table
- `account_number` - Full account number
- `institution_name` - Bank/financial institution name
- `balance` - Current account balance
- `credit_limit` - Credit card limit
- `loan_principal` - Loan principal amount
- `loan_tenure_months` - Loan tenure
- `current_interest_rate` - Interest rate

### Transactions Table
- `amount` - Transaction amount
- `description` - Transaction description
- `category` - Transaction category
- `from_account_name` - Source account name
- `to_account_name` - Destination account name

### EMI Transactions Table
- `transaction_amount` - Original transaction amount
- `monthly_emi` - Monthly EMI amount
- `total_installments` - Total number of installments
- `remaining_installments` - Remaining installments
- `interest_rate` - EMI interest rate

## Implementation Guide

### Using Encryption in API Calls

#### Example: Creating an Account

```typescript
import { encryptAccount } from '@/utils/encryptedStorage';
import { accountApi } from '@/db/api';

// Before saving
const accountData = {
  account_name: 'My Savings',
  account_number: '1234567890',
  balance: 10000,
  // ... other fields
};

// Encrypt sensitive fields
const encryptedData = await encryptAccount(accountData);

// Save to database
await accountApi.createAccount(encryptedData);
```

#### Example: Loading Accounts

```typescript
import { decryptAccounts } from '@/utils/encryptedStorage';
import { accountApi } from '@/db/api';

// Load from database
const encryptedAccounts = await accountApi.getAccounts(userId);

// Decrypt all accounts
const decryptedAccounts = await decryptAccounts(encryptedAccounts);

// Use decrypted data
console.log(decryptedAccounts);
```

### Available Encryption Functions

#### Individual Object Encryption/Decryption

```typescript
// Accounts
await encryptAccount(account: Partial<Account>): Promise<Partial<Account>>
await decryptAccount(account: Account): Promise<Account>

// Transactions
await encryptTransaction(transaction: Partial<Transaction>): Promise<Partial<Transaction>>
await decryptTransaction(transaction: Transaction): Promise<Transaction>

// EMI Transactions
await encryptEMI(emi: Partial<EMITransaction>): Promise<Partial<EMITransaction>>
await decryptEMI(emi: EMITransaction): Promise<EMITransaction>
```

#### Batch Encryption/Decryption

```typescript
// Decrypt arrays
await decryptAccounts(accounts: Account[]): Promise<Account[]>
await decryptTransactions(transactions: Transaction[]): Promise<Transaction[]>
await decryptEMIs(emis: EMITransaction[]): Promise<EMITransaction[]>
```

#### Low-Level Encryption Functions

```typescript
// String encryption
await encryptData(data: string, key: CryptoKey): Promise<string>
await decryptData(encryptedData: string, key: CryptoKey): Promise<string>

// Number encryption
await encryptNumber(value: number, key: CryptoKey): Promise<string>
await decryptNumber(encryptedValue: string, key: CryptoKey): Promise<number>

// Object encryption
await encryptObject(obj: any, key: CryptoKey): Promise<string>
await decryptObject(encryptedData: string, key: CryptoKey): Promise<any>
```

## Key Management

### Encryption Key Manager

The `keyManager` singleton handles encryption key storage and retrieval:

```typescript
import { keyManager } from '@/utils/encryption';

// Set encryption key (after deriving from password)
await keyManager.setKey(cryptoKey);

// Get encryption key
const key = await keyManager.getKey();

// Check if key exists
const hasKey = keyManager.hasKey();

// Clear key (on logout)
keyManager.clearKey();
```

### Getting Current Encryption Key

```typescript
import { getEncryptionKey } from '@/utils/encryption';

// Get key or throw error if not available
const key = await getEncryptionKey();
```

## User Experience Flow

### 1. Login
- User enters email/phone and password
- System authenticates user
- User is redirected to encryption setup screen

### 2. Encryption Setup
- User enters password again (for key derivation)
- System checks if user has encryption salt
  - If yes: Uses existing salt
  - If no: Generates new salt and saves to database
- System derives encryption key from password + salt
- Key is stored in sessionStorage
- User is redirected to dashboard

### 3. Using the Application
- All data operations are transparent
- Encryption/decryption happens automatically
- User sees decrypted data normally

### 4. Logout
- Encryption key is cleared from sessionStorage
- User data remains encrypted in database
- Next login requires password to derive key again

## Security Considerations

### What is Protected

✅ **Account numbers** - Fully encrypted
✅ **Balances** - Cannot be read by anyone except user
✅ **Transaction amounts** - Completely private
✅ **Financial institution names** - Encrypted
✅ **Transaction descriptions** - Private
✅ **All sensitive financial data** - End-to-end encrypted

### What is NOT Encrypted

❌ **User ID** - Needed for database queries
❌ **Account types** - Needed for filtering (cash, bank, credit card, loan)
❌ **Timestamps** - Needed for sorting and filtering
❌ **Currency codes** - Needed for display
❌ **Country codes** - Needed for filtering

### Threat Model

**Protected Against:**
- Database breaches
- Malicious database administrators
- Server-side attacks
- Man-in-the-middle attacks (data is already encrypted)
- Application creator accessing user data

**NOT Protected Against:**
- User's device being compromised while logged in
- Keyloggers capturing password
- User sharing password
- Browser vulnerabilities

## Best Practices

### For Developers

1. **Always encrypt before saving**
   ```typescript
   const encrypted = await encryptAccount(data);
   await api.save(encrypted);
   ```

2. **Always decrypt after loading**
   ```typescript
   const encrypted = await api.load();
   const decrypted = await decryptAccount(encrypted);
   ```

3. **Handle decryption errors gracefully**
   ```typescript
   try {
     const decrypted = await decryptAccount(account);
   } catch (error) {
     console.error('Decryption failed:', error);
     // Show user-friendly error message
   }
   ```

4. **Never log decrypted data**
   ```typescript
   // ❌ DON'T
   console.log('Account balance:', decryptedAccount.balance);
   
   // ✅ DO
   console.log('Account loaded successfully');
   ```

### For Users

1. **Use a strong password** - Your password protects all your financial data
2. **Don't share your password** - No one, including support staff, should ever ask for it
3. **Log out when done** - Clears encryption key from browser
4. **Use secure devices** - Encryption protects data in transit and at rest, but not on compromised devices

## Technical Implementation Details

### Web Crypto API

The system uses the browser's native Web Crypto API:

```typescript
// Key derivation
const key = await crypto.subtle.deriveKey(
  {
    name: 'PBKDF2',
    salt: salt,
    iterations: 100000,
    hash: 'SHA-256',
  },
  keyMaterial,
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

// Encryption
const encrypted = await crypto.subtle.encrypt(
  {
    name: 'AES-GCM',
    iv: iv,
    tagLength: 128,
  },
  key,
  data
);

// Decryption
const decrypted = await crypto.subtle.decrypt(
  {
    name: 'AES-GCM',
    iv: iv,
    tagLength: 128,
  },
  key,
  encryptedData
);
```

### Data Format

Encrypted data is stored as base64-encoded strings:

```
[IV (12 bytes)][Encrypted Data][Authentication Tag (16 bytes)]
```

All combined and encoded as base64 for storage.

### Browser Compatibility

The encryption system works in all modern browsers that support:
- Web Crypto API
- SubtleCrypto interface
- AES-GCM algorithm
- PBKDF2 key derivation

Supported browsers:
- Chrome 37+
- Firefox 34+
- Safari 11+
- Edge 79+

## Troubleshooting

### "Encryption key not available" Error

**Cause**: User's session expired or encryption key was cleared.

**Solution**: User needs to log in again and enter password for encryption setup.

### "Failed to decrypt data" Error

**Cause**: 
- Wrong password used for key derivation
- Data corruption
- Encryption key mismatch

**Solution**:
- Verify user is using correct password
- Check if encryption salt matches user's profile
- If data is corrupted, it cannot be recovered

### Performance Considerations

- Encryption/decryption is fast (< 1ms per field on modern devices)
- Batch operations are optimized with Promise.all()
- No noticeable impact on user experience
- Key derivation (PBKDF2) takes ~100ms (intentionally slow for security)

## Future Enhancements

Potential improvements for the encryption system:

1. **Backup Key Recovery** - Allow users to set up recovery keys
2. **Multi-Device Sync** - Securely sync encryption keys across devices
3. **Biometric Authentication** - Use fingerprint/face ID for key derivation
4. **Hardware Security Module** - Support for hardware-based key storage
5. **Key Rotation** - Periodic re-encryption with new keys

## Compliance

This encryption system helps meet requirements for:

- **GDPR** (General Data Protection Regulation)
- **PCI DSS** (Payment Card Industry Data Security Standard)
- **SOC 2** (Service Organization Control 2)
- **HIPAA** (Health Insurance Portability and Accountability Act)
- **CCPA** (California Consumer Privacy Act)

## Support

For questions or issues with the encryption system:

1. Check this documentation first
2. Review the source code in `src/utils/encryption.ts`
3. Check browser console for error messages
4. Verify Web Crypto API is supported in browser

## Conclusion

The SmartFinHub encryption system provides military-grade protection for user financial data while maintaining a seamless user experience. By implementing zero-knowledge encryption, we ensure that user privacy is protected at the highest level, and even the application creator cannot access sensitive information.
