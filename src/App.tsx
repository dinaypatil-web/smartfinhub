import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { HybridAuthProvider, useHybridAuth } from './contexts/HybridAuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/toaster';
import { Skeleton } from './components/ui/skeleton';
import Header from '@/components/common/Header';
import Sidebar from '@/components/common/Sidebar';
import GlobalChatbot from '@/components/common/GlobalChatbot';
import routes from './routes';
import { auth0Config, isAuth0Configured } from './config/auth0';

// Loading fallback component
const PageLoader = () => (
  <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
    <Skeleton className="h-9 w-52 rounded-xl bg-muted/60" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <Skeleton className="h-32 rounded-2xl bg-muted/50" />
      <Skeleton className="h-32 rounded-2xl bg-muted/50" />
      <Skeleton className="h-32 rounded-2xl bg-muted/50" />
      <Skeleton className="h-32 rounded-2xl bg-muted/50" />
    </div>
    <Skeleton className="h-64 rounded-2xl bg-muted/40" />
  </div>
);

// Layout wrapper component that adjusts UI depending on authentication state
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useHybridAuth();

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <main className="flex-grow">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-primary/15 selection:text-primary">
      {/* Collapsible Sidebar for screens >= md */}
      <Sidebar className="hidden md:flex flex-shrink-0" />

      {/* Main panel holding topbar and page content */}
      <div className="flex flex-col flex-grow min-h-screen w-full min-w-0 overflow-x-hidden">
        <Header />
        <main className="flex-grow w-full pb-12">
          {children}
        </main>
        <GlobalChatbot />
      </div>
    </div>
  );
};

const App = () => {
  // Theme and Auth Context bindings
  const AppContent = (
    <ThemeProvider>
      <HybridAuthProvider>
        <Toaster />
        <MainLayout>
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
        </MainLayout>
      </HybridAuthProvider>
    </ThemeProvider>
  );

  // If Auth0 is not configured, skip Auth0Provider wrapper
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
