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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check if API key is configured
    if (!MOJOAUTH_API_KEY) {
      throw new Error('MojoAuth API key not configured');
    }

    // Parse request body
    const body: MojoAuthRequest = await req.json();
    const { action } = body;

    let mojoAuthResponse: Response;

    // Route to appropriate MojoAuth endpoint
    switch (action) {
      case 'send': {
        const { phone } = body as SendOTPRequest;
        
        // Validate phone number
        if (!phone || !phone.startsWith('+')) {
          throw new Error('Invalid phone number format. Must be in E.164 format (e.g., +1234567890)');
        }

        // Send OTP via MojoAuth
        mojoAuthResponse = await fetch(`${MOJOAUTH_BASE_URL}/users/otp/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': MOJOAUTH_API_KEY,
          },
          body: JSON.stringify({ phone }),
        });
        break;
      }

      case 'verify': {
        const { state_id, otp } = body as VerifyOTPRequest;
        
        // Validate inputs
        if (!state_id || !otp) {
          throw new Error('Missing state_id or otp');
        }

        // Verify OTP via MojoAuth
        mojoAuthResponse = await fetch(`${MOJOAUTH_BASE_URL}/users/otp/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': MOJOAUTH_API_KEY,
          },
          body: JSON.stringify({ state_id, otp }),
        });
        break;
      }

      case 'resend': {
        const { state_id } = body as ResendOTPRequest;
        
        // Validate input
        if (!state_id) {
          throw new Error('Missing state_id');
        }

        // Resend OTP via MojoAuth
        mojoAuthResponse = await fetch(`${MOJOAUTH_BASE_URL}/users/otp/resend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': MOJOAUTH_API_KEY,
          },
          body: JSON.stringify({ state_id }),
        });
        break;
      }

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    // Check if MojoAuth request was successful first
    if (!mojoAuthResponse.ok) {
      // Try to parse error response
      let errorMessage = `MojoAuth API error: ${mojoAuthResponse.statusText}`;
      try {
        const responseText = await mojoAuthResponse.text();
        // Try to parse as JSON first
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (jsonError) {
          // If not JSON, use the text as error message
          if (responseText) {
            errorMessage = `MojoAuth API error: ${responseText}`;
          }
        }
      } catch (textError) {
        // Use default error message
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
      throw new Error(`Invalid response from MojoAuth API. Please check your API key and try again.`);
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
        error: error.message || 'An error occurred while processing your request',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
