/**
 * Client-Side Encryption Service
 * 
 * Provides end-to-end encryption for sensitive user data.
 * Uses Web Crypto API with AES-GCM encryption and PBKDF2 key derivation.
 * 
 * Security Features:
 * - All encryption/decryption happens client-side
 * - Encryption key derived from user password (never stored)
 * - Key stored in memory only during session
 * - Server only stores encrypted data
 * - App creator cannot view user data
 */

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12, // 96 bits for GCM
  saltLength: 16, // 128 bits
  pbkdf2Iterations: 100000, // OWASP recommended minimum
  tagLength: 128, // Authentication tag length
};

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.saltLength));
}

/**
 * Convert Uint8Array to base64 string for storage
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string back to Uint8Array
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive encryption key from password and salt using PBKDF2
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  // Import password as key material
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES key using PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations: ENCRYPTION_CONFIG.pbkdf2Iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: ENCRYPTION_CONFIG.algorithm,
      length: ENCRYPTION_CONFIG.keyLength,
    },
    false, // Not extractable for security
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Encrypt data using AES-GCM
 * Returns base64-encoded string: iv + encrypted data
 */
export async function encrypt(data: string, key: CryptoKey): Promise<string> {
  if (!data) return '';
  
  try {
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.ivLength));
    
    // Encrypt data
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ENCRYPTION_CONFIG.algorithm,
        iv: iv,
        tagLength: ENCRYPTION_CONFIG.tagLength,
      },
      key,
      dataBuffer
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    // Return as base64
    return arrayBufferToBase64(combined.buffer);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-GCM
 * Expects base64-encoded string: iv + encrypted data
 */
export async function decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
  if (!encryptedData) return '';
  
  try {
    // Decode from base64
    const combined = base64ToArrayBuffer(encryptedData);
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, ENCRYPTION_CONFIG.ivLength);
    const data = combined.slice(ENCRYPTION_CONFIG.ivLength);

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ENCRYPTION_CONFIG.algorithm,
        iv: iv,
        tagLength: ENCRYPTION_CONFIG.tagLength,
      },
      key,
      data.buffer
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - invalid key or corrupted data');
  }
}

/**
 * Encrypt an object's sensitive fields
 */
export async function encryptObject<T extends Record<string, any>>(
  obj: T,
  key: CryptoKey,
  fieldsToEncrypt: (keyof T)[]
): Promise<T> {
  const encrypted = { ...obj };
  
  for (const field of fieldsToEncrypt) {
    const value = obj[field];
    if (value !== null && value !== undefined) {
      // Convert to string if not already
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      encrypted[field] = await encrypt(stringValue, key) as any;
    }
  }
  
  return encrypted;
}

/**
 * Decrypt an object's encrypted fields
 */
export async function decryptObject<T extends Record<string, any>>(
  obj: T,
  key: CryptoKey,
  fieldsToDecrypt: (keyof T)[],
  fieldTypes?: Partial<Record<keyof T, 'string' | 'number' | 'boolean' | 'object'>>
): Promise<T> {
  const decrypted = { ...obj };
  
  for (const field of fieldsToDecrypt) {
    const value = obj[field];
    if (value && typeof value === 'string') {
      try {
        const decryptedValue = await decrypt(value, key);
        
        // Convert back to original type if specified
        if (fieldTypes && fieldTypes[field]) {
          const type = fieldTypes[field];
          if (type === 'number') {
            decrypted[field] = parseFloat(decryptedValue) as any;
          } else if (type === 'boolean') {
            decrypted[field] = (decryptedValue === 'true') as any;
          } else if (type === 'object') {
            decrypted[field] = JSON.parse(decryptedValue) as any;
          } else {
            decrypted[field] = decryptedValue as any;
          }
        } else {
          decrypted[field] = decryptedValue as any;
        }
      } catch (error) {
        console.error(`Failed to decrypt field ${String(field)}:`, error);
        // Keep encrypted value if decryption fails
      }
    }
  }
  
  return decrypted;
}

/**
 * Encrypt array of objects
 */
export async function encryptArray<T extends Record<string, any>>(
  array: T[],
  key: CryptoKey,
  fieldsToEncrypt: (keyof T)[]
): Promise<T[]> {
  return Promise.all(
    array.map(item => encryptObject(item, key, fieldsToEncrypt))
  );
}

/**
 * Decrypt array of objects
 */
export async function decryptArray<T extends Record<string, any>>(
  array: T[],
  key: CryptoKey,
  fieldsToDecrypt: (keyof T)[],
  fieldTypes?: Partial<Record<keyof T, 'string' | 'number' | 'boolean' | 'object'>>
): Promise<T[]> {
  return Promise.all(
    array.map(item => decryptObject(item, key, fieldsToDecrypt, fieldTypes))
  );
}

/**
 * Test if encryption key is valid by attempting to decrypt a test value
 */
export async function validateKey(key: CryptoKey, testEncryptedValue: string): Promise<boolean> {
  try {
    await decrypt(testEncryptedValue, key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a test encrypted value for key validation
 */
export async function createKeyValidator(key: CryptoKey): Promise<string> {
  return encrypt('valid_key_test', key);
}
