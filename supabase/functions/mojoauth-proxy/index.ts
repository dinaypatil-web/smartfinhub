/**
 * MojoAuth Proxy Edge Function
 * 
 * This function acts as a secure proxy between the frontend and MojoAuth API.
 * It handles CORS issues and keeps the API key secure on the server side.
 * 
 * Endpoints:
 * - POST /mojoauth-proxy { action: 'send', phone: '+1234567890' }
 * - POST /mojoauth-proxy { action: 'verify', state_id: 'xxx', otp: '123456' }
 * - POST /mojoauth-proxy { action: 'resend', state_id: 'xxx' }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MOJOAUTH_API_KEY = Deno.env.get('MOJOAUTH_API_KEY');
const MOJOAUTH_BASE_URL = 'https://api.mojoauth.com';

const ALLOWED_ORIGIN_REGEX = /^https?:\/\/(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|([a-z0-9-]+\.)*vercel\.app)$/i;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = ALLOWED_ORIGIN_REGEX.test(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

interface SendOTPRequest {
  action: 'send';
  phone: string;
}

interface VerifyOTPRequest {
  action: 'verify';
  state_id: string;
  otp: string;
}

interface ResendOTPRequest {
  action: 'resend';
  state_id: string;
}

type MojoAuthRequest = SendOTPRequest | VerifyOTPRequest | ResendOTPRequest;

// Regex for international E.164 phone numbers (e.g. +919876543210, 8 to 15 digits)
const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
// State ID sanitization (alphanumeric, underscores, hyphens up to 128 chars)
const STATE_ID_REGEX = /^[a-zA-Z0-9_-]{8,128}$/;
// OTP validation (numeric, 4 to 8 digits)
const OTP_REGEX = /^\d{4,8}$/;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Enforce POST method
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Check if API key is configured
    if (!MOJOAUTH_API_KEY) {
      throw new Error('MojoAuth API key not configured on server');
    }

    // Parse request body
    const body: MojoAuthRequest = await req.json();
    const { action } = body;

    let mojoAuthResponse: Response;

    // Route to appropriate MojoAuth endpoint
    switch (action) {
      case 'send': {
        const { phone } = body as SendOTPRequest;
        
        // Validate phone number format
        if (!phone || !E164_PHONE_REGEX.test(phone.trim())) {
          throw new Error('Invalid phone number format. Must be valid E.164 (e.g., +919876543210)');
        }

        // Send OTP via MojoAuth
        mojoAuthResponse = await fetch(`${MOJOAUTH_BASE_URL}/users/otp/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': MOJOAUTH_API_KEY,
          },
          body: JSON.stringify({ phone: phone.trim() }),
        });
        break;
      }

      case 'verify': {
        const { state_id, otp } = body as VerifyOTPRequest;
        
        // Strict input validation
        if (!state_id || !STATE_ID_REGEX.test(state_id.trim())) {
          throw new Error('Invalid state_id parameter format');
        }
        if (!otp || !OTP_REGEX.test(otp.trim())) {
          throw new Error('Invalid OTP format. Must be 4-8 digits');
        }

        // Verify OTP via MojoAuth
        mojoAuthResponse = await fetch(`${MOJOAUTH_BASE_URL}/users/otp/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': MOJOAUTH_API_KEY,
          },
          body: JSON.stringify({ state_id: state_id.trim(), otp: otp.trim() }),
        });
        break;
      }

      case 'resend': {
        const { state_id } = body as ResendOTPRequest;
        
        // Strict input validation
        if (!state_id || !STATE_ID_REGEX.test(state_id.trim())) {
          throw new Error('Invalid state_id parameter format');
        }

        // Resend OTP via MojoAuth
        mojoAuthResponse = await fetch(`${MOJOAUTH_BASE_URL}/users/otp/resend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': MOJOAUTH_API_KEY,
          },
          body: JSON.stringify({ state_id: state_id.trim() }),
        });
        break;
      }

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    // Check if MojoAuth request was successful
    if (!mojoAuthResponse.ok) {
      let errorMessage = `MojoAuth API error (${mojoAuthResponse.status})`;
      try {
        const responseText = await mojoAuthResponse.text();
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          if (responseText) errorMessage = `MojoAuth API error: ${responseText}`;
        }
      } catch {
        // Fallback
      }
      throw new Error(errorMessage);
    }

    // Parse successful MojoAuth response
    let responseData;
    try {
      const responseText = await mojoAuthResponse.text();
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse MojoAuth response as JSON:', parseError);
      throw new Error(`Invalid response received from authentication service`);
    }

    // Return success response
    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('MojoAuth proxy error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while processing your authentication request',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
