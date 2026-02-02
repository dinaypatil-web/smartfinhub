/**
 * Auth0 Configuration
 * 
 * This file contains Auth0 configuration for social login (Google, Apple)
 * while keeping Supabase for database operations.
 */

export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || '',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || '',
  authorizationParams: {
    redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    scope: 'openid profile email',
  },
  cacheLocation: 'localstorage' as const,
  useRefreshTokens: true,
};

// Check if Auth0 is properly configured
export const isAuth0Configured = () => {
  return Boolean(auth0Config.domain && auth0Config.clientId);
};
