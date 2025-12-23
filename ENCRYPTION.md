# End-to-End Encryption Documentation

## Overview

This application implements **client-side end-to-end encryption** to ensure that user data remains private and secure. Even the application creator cannot view user data without the user's password.

## Security Architecture

### Zero-Knowledge Architecture

The application follows a **zero-knowledge** security model:

1. **Client-Side Encryption**: All sensitive data is encrypted in the browser before being sent to the server
2. **Password-Based Key Derivation**: Encryption keys are derived from the user's password using PBKDF2
3. **No Server-Side Keys**: The server never has access to encryption keys
4. **Memory-Only Keys**: Encryption keys are stored only in browser memory and cleared on logout
5. **Salt Storage**: Only the encryption salt (non-sensitive) is stored in the database

### Encryption Specifications

- **Algorithm**: AES-GCM (Advanced Encryption Standard - Galois/Counter Mode)
- **Key Length**: 256 bits
- **IV Length**: 96 bits (12 bytes)
- **Tag Length**: 128 bits
- **Key Derivation**: PBKDF2 (Password-Based Key Derivation Function 2)
- **PBKDF2 Iterations**: 100,000
- **Hash Function**: SHA-256
- **Salt Length**: 128 bits (16 bytes)

## How It Works

### 1. User Registration

When a user registers:

1. A random 128-bit salt is generated
2. The user's password + salt are used to derive an encryption key using PBKDF2
3. The salt is stored in the user's profile (base64-encoded)
4. The encryption key is kept in memory only
5. The user can now encrypt/decrypt their data

```typescript
// Registration flow
const encryptionSalt = await encryption.createNewKey(password);
await profileApi.updateProfile(userId, { encryption_salt: encryptionSalt });
```

### 2. User Login

When a user logs in:

1. The user's encryption salt is retrieved from their profile
2. The password + salt are used to derive the encryption key
3. The key is stored in memory for the session
4. All encrypted data can now be decrypted

```typescript
// Login flow
const userProfile = await profileApi.getProfile(userId);
if (userProfile.encryption_salt) {
  await encryption.initializeKey(password, userProfile.encryption_salt);
}
```

### 3. Data Encryption

Before saving sensitive data to the database:

1. Data is encrypted using the user's encryption key
2. Encrypted data is base64-encoded
3. Only encrypted data is sent to the server

```typescript
// Encrypt sensitive fields
const encryptedAccount = await encryption.encryptObject(account, [
  'account_number',
  'account_name',
  'balance'
]);
```

### 4. Data Decryption

When retrieving data from the database:

1. Encrypted data is fetched from the server
2. Data is decrypted using the user's encryption key
3. Decrypted data is displayed in the UI

```typescript
// Decrypt sensitive fields
const decryptedAccount = await encryption.decryptObject(account, [
  'account_number',
  'account_name',
  'balance'
], {
  balance: 'number'
});
```

### 5. User Logout

When a user logs out:

1. The encryption key is cleared from memory
2. All encrypted data becomes inaccessible
3. The user must log in again to access their data

```typescript
// Logout flow
encryption.clearKey();
```

## Encrypted Fields

The following fields are encrypted in the database:

### Accounts Table
- `account_number`
- `account_name`
- `balance`
- `bank_name`

### Transactions Table
- `description`
- `amount`

### Budgets Table
- `category`
- `amount`
- `notes`

### Loans Table
- `account_number`
- `account_name`
- `balance`
- `interest_rate`
- `principal_amount`

### Custom Bank Links Table
- `bank_name`
- `account_number`

## API Reference

### EncryptionContext

The `EncryptionContext` provides the following methods:

#### `initializeKey(password: string, salt: string): Promise<void>`
Initialize encryption key from password and salt (called on login)

#### `createNewKey(password: string): Promise<string>`
Create new encryption key and return salt (called on registration)

#### `clearKey(): void`
Clear encryption key from memory (called on logout)

#### `encrypt(data: string): Promise<string>`
Encrypt a string value

#### `decrypt(encryptedData: string): Promise<string>`
Decrypt an encrypted string

#### `encryptObject<T>(obj: T, fields: (keyof T)[]): Promise<T>`
Encrypt specific fields in an object

#### `decryptObject<T>(obj: T, fields: (keyof T)[], types?: Record<string, string>): Promise<T>`
Decrypt specific fields in an object with type conversion

#### `encryptArray<T>(array: T[], fields: (keyof T)[]): Promise<T[]>`
Encrypt specific fields in an array of objects

#### `decryptArray<T>(array: T[], fields: (keyof T)[], types?: Record<string, string>): Promise<T[]>`
Decrypt specific fields in an array of objects with type conversion

### Usage Example

```typescript
import { useEncryption } from '@/contexts/EncryptionContext';

function MyComponent() {
  const encryption = useEncryption();
  
  // Check if encryption key is ready
  if (!encryption.isKeyReady) {
    return <div>Loading...</div>;
  }
  
  // Encrypt data before saving
  const saveAccount = async (account: Account) => {
    const encrypted = await encryption.encryptObject(account, [
      'account_number',
      'account_name',
      'balance'
    ]);
    await api.saveAccount(encrypted);
  };
  
  // Decrypt data after fetching
  const loadAccount = async (id: string) => {
    const encrypted = await api.getAccount(id);
    const decrypted = await encryption.decryptObject(encrypted, [
      'account_number',
      'account_name',
      'balance'
    ], {
      balance: 'number'
    });
    return decrypted;
  };
}
```

## Security Considerations

### Password Security

⚠️ **CRITICAL**: The security of encrypted data depends entirely on the strength of the user's password.

**Password Requirements**:
- Minimum 6 characters (enforced by application)
- Recommended: 12+ characters with mixed case, numbers, and symbols
- Never reuse passwords from other services
- Use a password manager to generate and store strong passwords

### Key Management

- **Never store encryption keys**: Keys are derived from passwords and kept in memory only
- **Clear keys on logout**: Always clear keys when the user logs out
- **Session timeout**: Consider implementing automatic logout after inactivity
- **No key recovery**: If a user forgets their password, their encrypted data cannot be recovered

### Data Recovery

⚠️ **WARNING**: There is **NO WAY** to recover encrypted data if the user forgets their password.

**Important Notes**:
- The application creator cannot reset passwords and preserve encrypted data
- Password reset will result in loss of all encrypted data
- Users should be warned about this during registration
- Consider implementing a backup/export feature for critical data

### Password Changes

When implementing password changes:

1. Fetch all encrypted data
2. Decrypt with old key
3. Generate new salt and derive new key
4. Re-encrypt all data with new key
5. Update database with new salt and re-encrypted data

```typescript
// Password change flow (to be implemented)
async function changePassword(oldPassword: string, newPassword: string) {
  // 1. Verify old password
  await encryption.initializeKey(oldPassword, currentSalt);
  
  // 2. Fetch and decrypt all data
  const accounts = await fetchAndDecryptAllAccounts();
  const transactions = await fetchAndDecryptAllTransactions();
  // ... fetch all encrypted data
  
  // 3. Create new key
  const newSalt = await encryption.createNewKey(newPassword);
  
  // 4. Re-encrypt all data
  const reencryptedAccounts = await encryption.encryptArray(accounts, [...]);
  const reencryptedTransactions = await encryption.encryptArray(transactions, [...]);
  // ... re-encrypt all data
  
  // 5. Update database
  await updateAllEncryptedData(reencryptedAccounts, reencryptedTransactions, ...);
  await profileApi.updateProfile(userId, { encryption_salt: newSalt });
}
```

## Browser Compatibility

The encryption implementation uses the **Web Crypto API**, which is supported in:

- ✅ Chrome 37+
- ✅ Firefox 34+
- ✅ Safari 11+
- ✅ Edge 79+
- ✅ Opera 24+
- ✅ All modern mobile browsers

⚠️ **Note**: Web Crypto API requires HTTPS in production environments.

## Performance Considerations

### Key Derivation

- PBKDF2 with 100,000 iterations takes ~100-200ms on modern devices
- This delay occurs only during login/registration
- Consider showing a loading indicator during key derivation

### Encryption/Decryption

- AES-GCM encryption/decryption is very fast (~1ms per operation)
- Minimal impact on application performance
- Batch operations are efficient for arrays of data

### Memory Usage

- Encryption keys are small (~32 bytes)
- Minimal memory overhead
- Keys are automatically garbage collected on logout

## Testing

### Manual Testing

1. **Registration**: Create a new account and verify salt is stored
2. **Login**: Log in and verify encryption key is initialized
3. **Data Encryption**: Create data and verify it's encrypted in database
4. **Data Decryption**: Fetch data and verify it's decrypted correctly
5. **Logout**: Log out and verify key is cleared
6. **Wrong Password**: Try logging in with wrong password and verify decryption fails

### Automated Testing

```typescript
// Example test
describe('Encryption', () => {
  it('should encrypt and decrypt data correctly', async () => {
    const password = 'test-password-123';
    const salt = await encryption.createNewKey(password);
    
    const original = { name: 'John', balance: 1000 };
    const encrypted = await encryption.encryptObject(original, ['name', 'balance']);
    
    expect(encrypted.name).not.toBe(original.name);
    expect(encrypted.balance).not.toBe(original.balance);
    
    const decrypted = await encryption.decryptObject(encrypted, ['name', 'balance'], {
      balance: 'number'
    });
    
    expect(decrypted.name).toBe(original.name);
    expect(decrypted.balance).toBe(original.balance);
  });
});
```

## Troubleshooting

### "Failed to decrypt data" Error

**Causes**:
- Wrong password
- Corrupted encrypted data
- Encryption key not initialized
- Salt mismatch

**Solutions**:
- Verify user is logged in with correct password
- Check encryption key is initialized (`encryption.isKeyReady`)
- Verify salt matches user's profile
- Check database data integrity

### "Encryption key not ready" Error

**Causes**:
- User not logged in
- Encryption key not initialized
- Key cleared prematurely

**Solutions**:
- Ensure user is logged in
- Wait for key initialization to complete
- Check for premature logout/key clearing

### Performance Issues

**Causes**:
- Too many encryption operations
- Large data sets
- Slow device

**Solutions**:
- Batch encrypt/decrypt operations
- Use pagination for large data sets
- Show loading indicators during operations
- Consider caching decrypted data in memory (with caution)

## Future Enhancements

### Planned Features

1. **Password Change**: Implement secure password change with data re-encryption
2. **Backup Keys**: Optional backup key for data recovery
3. **Multi-Device Sync**: Secure key synchronization across devices
4. **Biometric Unlock**: Use device biometrics to unlock encryption key
5. **Session Timeout**: Automatic logout after inactivity
6. **Encryption Audit Log**: Track encryption/decryption operations

### Security Improvements

1. **Key Stretching**: Increase PBKDF2 iterations as devices get faster
2. **Hardware Security**: Use hardware security modules when available
3. **Memory Protection**: Implement secure memory clearing
4. **Side-Channel Protection**: Protect against timing attacks

## Compliance

This encryption implementation helps meet various compliance requirements:

- **GDPR**: Data minimization and privacy by design
- **HIPAA**: Protected health information encryption
- **PCI DSS**: Cardholder data protection
- **SOC 2**: Data security controls

⚠️ **Note**: Compliance requires more than just encryption. Consult with legal and security experts for full compliance.

## Support

For questions or issues related to encryption:

1. Check this documentation
2. Review the source code in `src/services/encryption.ts`
3. Check the EncryptionContext in `src/contexts/EncryptionContext.tsx`
4. Review the migration file for database schema

## License

This encryption implementation is part of the application and follows the same license.

---

**Last Updated**: 2025-11-30
**Version**: 1.0.0
