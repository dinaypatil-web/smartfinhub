import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { HybridAuthProvider } from './contexts/HybridAuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/toaster';
import { Skeleton } from './components/ui/skeleton';
import Header from '@/components/common/Header';
import routes from './routes';
import { auth0Config, isAuth0Configured } from './config/auth0';

// Loading fallback component
const PageLoader = () => (
  <div className="container mx-auto p-6 space-y-6">
    <Skeleton className="h-12 w-64 bg-muted" />
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <Skeleton className="h-32 bg-muted" />
      <Skeleton className="h-32 bg-muted" />
      <Skeleton className="h-32 bg-muted" />
      <Skeleton className="h-32 bg-muted" />
    </div>
    <Skeleton className="h-64 bg-muted" />
  </div>
);

const App = () => {
  // If Auth0 is not configured, skip Auth0Provider wrapper
  const AppContent = (
    <ThemeProvider>
      <HybridAuthProvider>
        <Toaster />
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </main>
        </div>
      </HybridAuthProvider>
    </ThemeProvider>
  );

  // If Auth0 is not configured, return app without Auth0Provider
  if (!isAuth0Configured()) {
    return (
      <Router>
        {AppContent}
      </Router>
    );
  }

  // If Auth0 is configured, wrap with Auth0Provider
  return (
    <Router>
      <Auth0Provider
        domain={auth0Config.domain}
        clientId={auth0Config.clientId}
        authorizationParams={auth0Config.authorizationParams}
        cacheLocation={auth0Config.cacheLocation}
        useRefreshTokens={auth0Config.useRefreshTokens}
      >
        {AppContent}
      </Auth0Provider>
    </Router>
  );
};

export default App;
