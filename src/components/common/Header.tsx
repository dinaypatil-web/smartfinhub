import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useHybridAuth } from '@/contexts/HybridAuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Wallet, User, Sparkles } from 'lucide-react';
import Sidebar from './Sidebar';
import routes from '../../routes';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user, profile } = useHybridAuth();

  if (!user) {
    return null;
  }

  // Find active page name
  const activeRoute = routes.find(r => r.path === location.pathname);
  const pageTitle = activeRoute ? activeRoute.name : 'Dashboard';

  return (
    <header className="bg-card/85 dark:bg-[#09090b]/85 backdrop-blur-xl border-b border-border/70 sticky top-0 z-30 w-full transition-colors duration-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Left section: Breadcrumb/Page title on Desktop, Hamburger + Logo on Mobile */}
          <div className="flex items-center gap-4">
            {/* Mobile menu trigger */}
            <div className="md:hidden">
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-muted">
                    <Menu className="h-5 w-5 text-foreground" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 max-w-full border-r border-border/80">
                  <div className="h-full flex flex-col" onClick={() => setIsMenuOpen(false)}>
                    <Sidebar className="h-full border-r-0 shadow-none w-full" />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Title / Brand logo for mobile */}
            <div className="flex items-center">
              <Link to="/" className="flex md:hidden items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
                  <Wallet className="h-4 w-4" />
                </div>
                <span className="text-base font-bold tracking-tight text-foreground">
                  SmartFinHub
                </span>
              </Link>
              
              {/* Page Title on Desktop */}
              <div className="hidden md:flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground tracking-tight">
                    {pageTitle}
                  </span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Sync
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  SmartFinHub • Personal Wealth Management
                </span>
              </div>
            </div>
          </div>

          {/* Right section: AI Assistant shortcut + Profile Pill */}
          <div className="flex items-center gap-3">
            <Link to="/voice-transact" className="hidden sm:inline-flex">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full px-3.5 gap-2 text-xs font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>AI Assistant</span>
              </Button>
            </Link>

            <div className="flex items-center gap-2.5 bg-muted/50 border border-border/70 pl-2 pr-3 py-1.5 rounded-full shadow-2xs">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-medium text-foreground max-w-[140px] sm:max-w-[180px] truncate">
                {profile?.email || 'User'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
