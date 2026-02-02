/**
 * Encrypted Storage Layer
 * 
 * Provides transparent encryption/decryption for sensitive data fields.
 * Wraps database operations to automatically encrypt before save and decrypt after load.
 */

import type { Account, Transaction, EMITransaction } from '@/types/types';
import {
  encryptData,
  decryptData,
  encryptNumber,
  decryptNumber,
  getEncryptionKey,
} from './encryption';

/**
 * Fields to encrypt in Account objects
 */
const ACCOUNT_ENCRYPTED_FIELDS = [
  'account_number',
  'institution_name',
  'balance',
  'credit_limit',
  'loan_principal',
  'loan_tenure_months',
  'current_interest_rate',
];

/**
 * Fields to encrypt in Transaction objects
 */
const TRANSACTION_ENCRYPTED_FIELDS = [
  'amount',
  'description',
  'category',
  'from_account_name',
  'to_account_name',
];

/**
 * Fields to encrypt in EMITransaction objects
 */
const EMI_ENCRYPTED_FIELDS = [
  'purchase_amount',
  'bank_charges',
  'total_amount',
  'emi_months',
  'monthly_emi',
  'remaining_installments',
];

/**
 * Encrypt an account object
 */
export async function encryptAccount(account: Partial<Account>): Promise<Partial<Account>> {
  try {
    const key = await getEncryptionKey();
    const encrypted: any = { ...account };

    for (const field of ACCOUNT_ENCRYPTED_FIELDS) {
      if (account[field as keyof Account] !== undefined && account[field as keyof Account] !== null) {
        const value = account[field as keyof Account];
        
        if (typeof value === 'number') {
          encrypted[field] = await encryptNumber(value, key);
        } else if (typeof value === 'string' && value !== '') {
          encrypted[field] = await encryptData(value, key);
        }
      }
    }

    return encrypted;
  } catch (error) {
    console.error('Error encrypting account:', error);
    throw new Error('Failed to encrypt account data. Please try logging out and logging in again.');
  }
}

/**
 * Decrypt an account object
 */
export async function decryptAccount(account: Account): Promise<Account> {
  const key = await getEncryptionKey();
  const decrypted: any = { ...account };

  for (const field of ACCOUNT_ENCRYPTED_FIELDS) {
    if (account[field as keyof Account] !== undefined && account[field as keyof Account] !== null) {
      const value = account[field as keyof Account];
      
      if (typeof value === 'string' && value !== '') {
        try {
          // Determine if this should be a number or string
          if (['balance', 'credit_limit', 'loan_principal', 'loan_tenure_months', 'current_interest_rate'].includes(field)) {
            decrypted[field] = await decryptNumber(value, key);
          } else {
            decrypted[field] = await decryptData(value, key);
          }
        } catch (error) {
          console.error(`Failed to decrypt account field ${field}:`, error);
          // Keep original value if decryption fails
        }
      }
    }
  }

  return decrypted;
}

/**
 * Encrypt a transaction object
 */
export async function encryptTransaction(transaction: Partial<Transaction>): Promise<Partial<Transaction>> {
  try {
    const key = await getEncryptionKey();
    const encrypted: any = { ...transaction };

    for (const field of TRANSACTION_ENCRYPTED_FIELDS) {
      if (transaction[field as keyof Transaction] !== undefined && transaction[field as keyof Transaction] !== null) {
        const value = transaction[field as keyof Transaction];
        
        if (typeof value === 'number') {
          encrypted[field] = await encryptNumber(value, key);
        } else if (typeof value === 'string' && value !== '') {
          encrypted[field] = await encryptData(value, key);
        }
      }
    }

    return encrypted;
  } catch (error) {
    console.error('Error encrypting transaction:', error);
    throw new Error('Failed to encrypt transaction data. Please try logging out and logging in again.');
  }
}

/**
 * Decrypt a transaction object
 */
export async function decryptTransaction(transaction: Transaction): Promise<Transaction> {
  const key = await getEncryptionKey();
  const decrypted: any = { ...transaction };

  for (const field of TRANSACTION_ENCRYPTED_FIELDS) {
    if (transaction[field as keyof Transaction] !== undefined && transaction[field as keyof Transaction] !== null) {
      const value = transaction[field as keyof Transaction];
      
      if (typeof value === 'string' && value !== '') {
        try {
          // Determine if this should be a number or string
          if (field === 'amount') {
            decrypted[field] = await decryptNumber(value, key);
          } else {
            decrypted[field] = await decryptData(value, key);
          }
        } catch (error) {
          console.error(`Failed to decrypt transaction field ${field}:`, error);
          // Keep original value if decryption fails
        }
      }
    }
  }

  return decrypted;
}

/**
 * Encrypt an EMI transaction object
 */
export async function encryptEMI(emi: Partial<EMITransaction>): Promise<Partial<EMITransaction>> {
  try {
    const key = await getEncryptionKey();
    const encrypted: any = { ...emi };

    for (const field of EMI_ENCRYPTED_FIELDS) {
      if (emi[field as keyof EMITransaction] !== undefined && emi[field as keyof EMITransaction] !== null) {
        const value = emi[field as keyof EMITransaction];
        
        if (typeof value === 'number') {
          encrypted[field] = await encryptNumber(value, key);
        } else if (typeof value === 'string' && value !== '') {
          encrypted[field] = await encryptData(value, key);
        }
      }
    }

    return encrypted;
  } catch (error) {
    console.error('Error encrypting EMI:', error);
    throw new Error('Failed to encrypt EMI data. Please try logging out and logging in again.');
  }
}

/**
 * Decrypt an EMI transaction object
 */
export async function decryptEMI(emi: EMITransaction): Promise<EMITransaction> {
  const key = await getEncryptionKey();
  const decrypted: any = { ...emi };

  for (const field of EMI_ENCRYPTED_FIELDS) {
    if (emi[field as keyof EMITransaction] !== undefined && emi[field as keyof EMITransaction] !== null) {
      const value = emi[field as keyof EMITransaction];
      
      if (typeof value === 'string' && value !== '') {
        try {
          // All EMI encrypted fields are numbers
          decrypted[field] = await decryptNumber(value, key);
        } catch (error) {
          console.error(`Failed to decrypt EMI field ${field}:`, error);
          // Keep original value if decryption fails
        }
      }
    }
  }

  return decrypted;
}

/**
 * Decrypt array of accounts
 */
export async function decryptAccounts(accounts: Account[]): Promise<Account[]> {
  return Promise.all(accounts.map(account => decryptAccount(account)));
}

/**
 * Decrypt array of transactions
 */
export async function decryptTransactions(transactions: Transaction[]): Promise<Transaction[]> {
  return Promise.all(transactions.map(transaction => decryptTransaction(transaction)));
}

/**
 * Decrypt array of EMI transactions
 */
export async function decryptEMIs(emis: EMITransaction[]): Promise<EMITransaction[]> {
  return Promise.all(emis.map(emi => decryptEMI(emi)));
}
