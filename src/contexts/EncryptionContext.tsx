/**
 * Encryption Context
 * 
 * Manages encryption key lifecycle and provides encryption/decryption
 * utilities throughout the application.
 * 
 * Security:
 * - Key stored in memory only (never persisted)
 * - Key cleared on logout
 * - Key derived from user password
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  deriveKey,
  generateSalt,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  encryptArray,
  decryptArray,
  createKeyValidator,
  validateKey,
} from '@/services/encryption';

interface EncryptionContextType {
  isKeyReady: boolean;
  initializeKey: (password: string, salt: string) => Promise<void>;
  createNewKey: (password: string) => Promise<string>;
  clearKey: () => void;
  encrypt: (data: string) => Promise<string>;
  decrypt: (encryptedData: string) => Promise<string>;
  encryptObject: <T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: (keyof T)[]
  ) => Promise<T>;
  decryptObject: <T extends Record<string, any>>(
    obj: T,
    fieldsToDecrypt: (keyof T)[],
    fieldTypes?: Partial<Record<keyof T, 'string' | 'number' | 'boolean' | 'object'>>
  ) => Promise<T>;
  encryptArray: <T extends Record<string, any>>(
    array: T[],
    fieldsToEncrypt: (keyof T)[]
  ) => Promise<T[]>;
  decryptArray: <T extends Record<string, any>>(
    array: T[],
    fieldsToDecrypt: (keyof T)[],
    fieldTypes?: Partial<Record<keyof T, 'string' | 'number' | 'boolean' | 'object'>>
  ) => Promise<T[]>;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined);

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);

  /**
   * Initialize encryption key from password and salt
   * Called on login
   */
  const initializeKey = useCallback(async (password: string, salt: string) => {
    try {
      const saltBytes = base64ToArrayBuffer(salt);
      const key = await deriveKey(password, saltBytes);
      setEncryptionKey(key);
    } catch (error) {
      console.error('Failed to initialize encryption key:', error);
      throw new Error('Failed to initialize encryption');
    }
  }, []);

  /**
   * Create new encryption key for new user
   * Called on registration
   * Returns salt as base64 string to store in profile
   */
  const createNewKey = useCallback(async (password: string): Promise<string> => {
    try {
      const salt = generateSalt();
      const key = await deriveKey(password, salt);
      setEncryptionKey(key);
      return arrayBufferToBase64(salt.buffer as ArrayBuffer);
    } catch (error) {
      console.error('Failed to create encryption key:', error);
      throw new Error('Failed to create encryption key');
    }
  }, []);

  /**
   * Clear encryption key from memory
   * Called on logout
   */
  const clearKey = useCallback(() => {
    setEncryptionKey(null);
  }, []);

  /**
   * Encrypt data
   */
  const encryptData = useCallback(async (data: string): Promise<string> => {
    if (!encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    return encrypt(data, encryptionKey);
  }, [encryptionKey]);

  /**
   * Decrypt data
   */
  const decryptData = useCallback(async (encryptedData: string): Promise<string> => {
    if (!encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    return decrypt(encryptedData, encryptionKey);
  }, [encryptionKey]);

  /**
   * Encrypt object fields
   */
  const encryptObjectData = useCallback(async <T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: (keyof T)[]
  ): Promise<T> => {
    if (!encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    return encryptObject(obj, encryptionKey, fieldsToEncrypt);
  }, [encryptionKey]);

  /**
   * Decrypt object fields
   */
  const decryptObjectData = useCallback(async <T extends Record<string, any>>(
    obj: T,
    fieldsToDecrypt: (keyof T)[],
    fieldTypes?: Partial<Record<keyof T, 'string' | 'number' | 'boolean' | 'object'>>
  ): Promise<T> => {
    if (!encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    return decryptObject(obj, encryptionKey, fieldsToDecrypt, fieldTypes);
  }, [encryptionKey]);

  /**
   * Encrypt array of objects
   */
  const encryptArrayData = useCallback(async <T extends Record<string, any>>(
    array: T[],
    fieldsToEncrypt: (keyof T)[]
  ): Promise<T[]> => {
    if (!encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    return encryptArray(array, encryptionKey, fieldsToEncrypt);
  }, [encryptionKey]);

  /**
   * Decrypt array of objects
   */
  const decryptArrayData = useCallback(async <T extends Record<string, any>>(
    array: T[],
    fieldsToDecrypt: (keyof T)[],
    fieldTypes?: Partial<Record<keyof T, 'string' | 'number' | 'boolean' | 'object'>>
  ): Promise<T[]> => {
    if (!encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    return decryptArray(array, encryptionKey, fieldsToDecrypt, fieldTypes);
  }, [encryptionKey]);

  const value: EncryptionContextType = {
    isKeyReady: encryptionKey !== null,
    initializeKey,
    createNewKey,
    clearKey,
    encrypt: encryptData,
    decrypt: decryptData,
    encryptObject: encryptObjectData,
    decryptObject: decryptObjectData,
    encryptArray: encryptArrayData,
    decryptArray: decryptArrayData,
  };

  return (
    <EncryptionContext.Provider value={value}>
      {children}
    </EncryptionContext.Provider>
  );
}

export function useEncryption() {
  const context = useContext(EncryptionContext);
  if (context === undefined) {
    throw new Error('useEncryption must be used within EncryptionProvider');
  }
  return context;
}
