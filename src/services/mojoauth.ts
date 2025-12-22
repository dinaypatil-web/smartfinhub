/**
 * MojoAuth Service for Phone Number Authentication with OTP
 * Documentation: https://mojoauth.com/docs/
 */

const MOJOAUTH_API_KEY = import.meta.env.VITE_MOJOAUTH_API_KEY;
const MOJOAUTH_BASE_URL = 'https://api.mojoauth.com';

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
    const response = await fetch(`${MOJOAUTH_BASE_URL}/oauth/otp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': MOJOAUTH_API_KEY,
      },
      body: JSON.stringify({
        phone: phoneNumber,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to send OTP: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
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
    const response = await fetch(`${MOJOAUTH_BASE_URL}/oauth/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': MOJOAUTH_API_KEY,
      },
      body: JSON.stringify({
        state_id: stateId,
        otp: otp,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to verify OTP: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
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
    const response = await fetch(`${MOJOAUTH_BASE_URL}/oauth/otp/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': MOJOAUTH_API_KEY,
      },
      body: JSON.stringify({
        state_id: stateId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to resend OTP: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
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
 * @returns boolean indicating if API key is set
 */
export function isMojoAuthConfigured(): boolean {
  return !!MOJOAUTH_API_KEY && MOJOAUTH_API_KEY !== 'your_mojoauth_api_key_here';
}
