import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import { HybridAuthProvider } from './contexts/HybridAuthContext';
import { Toaster } from './components/ui/toaster';
import Header from '@/components/common/Header';
import routes from './routes';
import { auth0Config, isAuth0Configured } from './config/auth0';

const App = () => {
  // If Auth0 is not configured, show configuration message
  if (!isAuth0Configured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-2xl w-full space-y-6 text-center">
          <h1 className="text-3xl font-bold">Auth0 Configuration Required</h1>
          <div className="bg-muted p-6 rounded-lg text-left space-y-4">
            <p className="text-sm text-muted-foreground">
              To enable Sign in with Google and Apple, please configure Auth0:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Create an Auth0 account at <a href="https://auth0.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">auth0.com</a></li>
              <li>Create a new application (Single Page Application)</li>
              <li>Enable Google and Apple social connections</li>
              <li>Add the following environment variables to your <code className="bg-background px-2 py-1 rounded">.env</code> file:</li>
            </ol>
            <pre className="bg-background p-4 rounded text-xs overflow-x-auto">
{`VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=your-api-audience (optional)`}
            </pre>
            <p className="text-sm text-muted-foreground">
              After adding the environment variables, restart the development server.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Auth0Provider
        domain={auth0Config.domain}
        clientId={auth0Config.clientId}
        authorizationParams={auth0Config.authorizationParams}
        cacheLocation={auth0Config.cacheLocation}
        useRefreshTokens={auth0Config.useRefreshTokens}
      >
        <HybridAuthProvider>
          <Toaster />
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">
              <Routes>
                {routes.map((route, index) => (
                  <Route
                    key={index}
                    path={route.path}
                    element={route.element}
                  />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </HybridAuthProvider>
      </Auth0Provider>
    </Router>
  );
};

export default App;
