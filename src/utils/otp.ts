import { supabase } from '@/db/supabase';

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via Twilio using Supabase Edge Function
 */
export async function sendOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: JSON.stringify({
        phoneNumber,
        otp,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (error) {
      const errorMsg = await error?.context?.text();
      console.error('Edge function error in send-otp:', errorMsg);
      return {
        success: false,
        error: errorMsg || 'Failed to send OTP',
      };
    }

    if (!data?.success) {
      return {
        success: false,
        error: data?.error || 'Failed to send OTP',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send OTP',
    };
  }
}

/**
 * Store OTP in localStorage with expiration (10 minutes)
 */
export function storeOTP(phoneNumber: string, otp: string): void {
  const expirationTime = Date.now() + 10 * 60 * 1000; // 10 minutes
  localStorage.setItem(`otp_${phoneNumber}`, JSON.stringify({
    otp,
    expiresAt: expirationTime,
  }));
}

/**
 * Verify OTP from localStorage
 */
export function verifyOTP(phoneNumber: string, inputOTP: string): { valid: boolean; error?: string } {
  const storedData = localStorage.getItem(`otp_${phoneNumber}`);
  
  if (!storedData) {
    return { valid: false, error: 'No OTP found. Please request a new one.' };
  }

  try {
    const { otp, expiresAt } = JSON.parse(storedData);
    
    if (Date.now() > expiresAt) {
      localStorage.removeItem(`otp_${phoneNumber}`);
      return { valid: false, error: 'OTP has expired. Please request a new one.' };
    }

    if (otp !== inputOTP) {
      return { valid: false, error: 'Invalid OTP. Please try again.' };
    }

    // Clear OTP after successful verification
    localStorage.removeItem(`otp_${phoneNumber}`);
    return { valid: true };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { valid: false, error: 'Failed to verify OTP.' };
  }
}

/**
 * Clear OTP from localStorage
 */
export function clearOTP(phoneNumber: string): void {
  localStorage.removeItem(`otp_${phoneNumber}`);
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(phoneNumber: string, countryCode: string = '91'): string {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it already starts with country code, return with +
  if (cleaned.startsWith(countryCode)) {
    return `+${cleaned}`;
  }
  
  // Add country code
  return `+${countryCode}${cleaned}`;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a valid length (typically 10-15 digits)
  return cleaned.length >= 10 && cleaned.length <= 15;
}
