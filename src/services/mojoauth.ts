/**
 * MojoAuth Service for Phone Number Authentication with OTP
 * Documentation: https://mojoauth.com/docs/
 * 
 * This service uses a Supabase Edge Function as a proxy to MojoAuth API
 * to avoid CORS issues and keep the API key secure.
 */

import { supabase } from '@/db/supabase';

export interface SendOTPResponse {
  state_id: string;
  message?: string;
}

export interface VerifyOTPResponse {
  authenticated: boolean;
  oauth: {
    access_token: string;
    expires_in: number;
  };
  user: {
    identifier: string;
    phone?: string;
  };
}

/**
 * Send OTP to a phone number
 * @param phoneNumber - Phone number in E.164 format (e.g., +1234567890)
 * @returns Promise with state_id for verification
 */
export async function sendOTP(phoneNumber: string): Promise<SendOTPResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('mojoauth-proxy', {
      body: {
        action: 'send',
        phone: phoneNumber,
      },
    });

    if (error) {
      const errorMsg = await error?.context?.text().catch(() => error.message);
      console.error('MojoAuth sendOTP error:', errorMsg);
      throw new Error(errorMsg || 'Failed to send OTP');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to send OTP');
    }

    return data.data;
  } catch (error: any) {
    console.error('MojoAuth sendOTP error:', error);
    throw new Error(error.message || 'Failed to send OTP. Please try again.');
  }
}

/**
 * Verify OTP code
 * @param stateId - State ID received from sendOTP
 * @param otp - OTP code entered by user
 * @returns Promise with authentication result
 */
export async function verifyOTP(stateId: string, otp: string): Promise<VerifyOTPResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('mojoauth-proxy', {
      body: {
        action: 'verify',
        state_id: stateId,
        otp: otp,
      },
    });

    if (error) {
      const errorMsg = await error?.context?.text().catch(() => error.message);
      console.error('MojoAuth verifyOTP error:', errorMsg);
      throw new Error(errorMsg || 'Failed to verify OTP');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to verify OTP');
    }

    return data.data;
  } catch (error: any) {
    console.error('MojoAuth verifyOTP error:', error);
    throw new Error(error.message || 'Failed to verify OTP. Please check your code and try again.');
  }
}

/**
 * Resend OTP to the same phone number
 * @param stateId - State ID from previous sendOTP call
 * @returns Promise with new state_id
 */
export async function resendOTP(stateId: string): Promise<SendOTPResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('mojoauth-proxy', {
      body: {
        action: 'resend',
        state_id: stateId,
      },
    });

    if (error) {
      const errorMsg = await error?.context?.text().catch(() => error.message);
      console.error('MojoAuth resendOTP error:', errorMsg);
      throw new Error(errorMsg || 'Failed to resend OTP');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to resend OTP');
    }

    return data.data;
  } catch (error: any) {
    console.error('MojoAuth resendOTP error:', error);
    throw new Error(error.message || 'Failed to resend OTP. Please try again.');
  }
}

/**
 * Validate phone number format (E.164)
 * @param phoneNumber - Phone number to validate
 * @returns boolean indicating if format is valid
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // E.164 format: +[country code][number]
  // Length: 8-15 digits (excluding +)
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Format phone number for display
 * @param phoneNumber - Phone number in E.164 format
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove + and split into country code and number
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.length >= 10) {
    // Format as: +X (XXX) XXX-XXXX for display
    const countryCode = cleaned.slice(0, -10);
    const areaCode = cleaned.slice(-10, -7);
    const firstPart = cleaned.slice(-7, -4);
    const lastPart = cleaned.slice(-4);
    
    if (countryCode) {
      return `+${countryCode} (${areaCode}) ${firstPart}-${lastPart}`;
    }
    return `(${areaCode}) ${firstPart}-${lastPart}`;
  }
  
  return phoneNumber;
}

/**
 * Check if MojoAuth is configured
 * @returns boolean indicating if MojoAuth proxy is available
 */
export function isMojoAuthConfigured(): boolean {
  // MojoAuth is configured via Supabase Edge Function
  // The Edge Function securely handles the API key on the server side
  return true;
}
