/**
 * Client-Side Encryption Utility
 * 
 * Provides end-to-end encryption for sensitive user data.
 * Uses Web Crypto API with AES-GCM encryption.
 * Encryption key is derived from user's password and never stored on server.
 */

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12, // 96 bits for GCM
  saltLength: 16, // 128 bits
  pbkdf2Iterations: 100000,
  tagLength: 128, // 128 bits authentication tag
};

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.saltLength));
}

/**
 * Convert Uint8Array to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
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
 * Derive encryption key from password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Import password as key material
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer.buffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive actual encryption key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ENCRYPTION_CONFIG.pbkdf2Iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: ENCRYPTION_CONFIG.algorithm,
      length: ENCRYPTION_CONFIG.keyLength,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Derive encryption key from user ID (for Auth0/OAuth scenarios)
 * This provides application-level encryption when password is not available
 */
export async function deriveKeyFromUserId(
  userId: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Use user ID as the key material
  // Note: This is less secure than password-based encryption but provides
  // an additional layer of protection beyond database-level encryption
  const encoder = new TextEncoder();
  const userIdBuffer = encoder.encode(userId);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    userIdBuffer.buffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive actual encryption key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ENCRYPTION_CONFIG.pbkdf2Iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: ENCRYPTION_CONFIG.algorithm,
      length: ENCRYPTION_CONFIG.keyLength,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(
  data: string,
  key: CryptoKey
): Promise<string> {
  if (!data) return '';
  
  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.ivLength));
    
    // Encrypt data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ENCRYPTION_CONFIG.algorithm,
        iv: iv.buffer,
        tagLength: ENCRYPTION_CONFIG.tagLength,
      },
      key,
      dataBuffer.buffer
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);
    
    // Return as base64
    return arrayBufferToBase64(combined);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(
  encryptedData: string,
  key: CryptoKey
): Promise<string> {
  if (!encryptedData) return '';
  
  try {
    // Convert from base64
    const combined = base64ToArrayBuffer(encryptedData);
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, ENCRYPTION_CONFIG.ivLength);
    const encryptedBuffer = combined.slice(ENCRYPTION_CONFIG.ivLength);
    
    // Decrypt data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ENCRYPTION_CONFIG.algorithm,
        iv: iv.buffer,
        tagLength: ENCRYPTION_CONFIG.tagLength,
      },
      key,
      encryptedBuffer.buffer
    );
    
    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt a number value
 */
export async function encryptNumber(
  value: number,
  key: CryptoKey
): Promise<string> {
  return encryptData(value.toString(), key);
}

/**
 * Decrypt a number value
 */
export async function decryptNumber(
  encryptedValue: string,
  key: CryptoKey
): Promise<number> {
  const decrypted = await decryptData(encryptedValue, key);
  return parseFloat(decrypted) || 0;
}

/**
 * Encrypt an object (converts to JSON first)
 */
export async function encryptObject(
  obj: any,
  key: CryptoKey
): Promise<string> {
  const json = JSON.stringify(obj);
  return encryptData(json, key);
}

/**
 * Decrypt an object (parses JSON after decryption)
 */
export async function decryptObject(
  encryptedData: string,
  key: CryptoKey
): Promise<any> {
  const json = await decryptData(encryptedData, key);
  return JSON.parse(json);
}

/**
 * Export encryption key to store in session
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Import encryption key from session storage
 */
export async function importKey(keyData: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyData);
  
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer.buffer as ArrayBuffer,
    {
      name: ENCRYPTION_CONFIG.algorithm,
      length: ENCRYPTION_CONFIG.keyLength,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encryption key manager for session
 */
class EncryptionKeyManager {
  private key: CryptoKey | null = null;
  private readonly SESSION_KEY = 'encryption_key';

  /**
   * Set encryption key for current session
   */
  async setKey(key: CryptoKey): Promise<void> {
    this.key = key;
    const exported = await exportKey(key);
    sessionStorage.setItem(this.SESSION_KEY, exported);
  }

  /**
   * Get encryption key from current session
   */
  async getKey(): Promise<CryptoKey | null> {
    if (this.key) {
      return this.key;
    }

    const stored = sessionStorage.getItem(this.SESSION_KEY);
    if (stored) {
      this.key = await importKey(stored);
      return this.key;
    }

    return null;
  }

  /**
   * Clear encryption key (on logout)
   */
  clearKey(): void {
    this.key = null;
    sessionStorage.removeItem(this.SESSION_KEY);
  }

  /**
   * Check if encryption key is available
   */
  hasKey(): boolean {
    return this.key !== null || sessionStorage.getItem(this.SESSION_KEY) !== null;
  }
}

// Singleton instance
export const keyManager = new EncryptionKeyManager();

/**
 * Get current encryption key or throw error
 */
export async function getEncryptionKey(): Promise<CryptoKey> {
  const key = await keyManager.getKey();
  if (!key) {
    throw new Error('Encryption key not available. Please log in again.');
  }
  return key;
}

/**
 * Initialize encryption for a user (Auth0/OAuth scenario)
 * Generates or retrieves salt and derives encryption key from user ID
 */
export async function initializeEncryption(
  userId: string,
  existingSalt?: string
): Promise<{ key: CryptoKey; salt: string }> {
  let salt: Uint8Array;
  
  if (existingSalt) {
    // Use existing salt
    salt = base64ToArrayBuffer(existingSalt);
  } else {
    // Generate new salt
    salt = generateSalt();
  }
  
  // Derive key from user ID
  const key = await deriveKeyFromUserId(userId, salt);
  
  // Store key in session
  await keyManager.setKey(key);
  
  return {
    key,
    salt: arrayBufferToBase64(salt),
  };
}
