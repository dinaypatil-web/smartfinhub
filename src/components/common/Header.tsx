import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useHybridAuth } from '@/contexts/HybridAuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Wallet, User } from 'lucide-react';
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
  const pageTitle = activeRoute ? activeRoute.name : 'Financial Command';

  return (
    <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-10 shadow-sm w-full">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Left section: Breadcrumb/Page title on Desktop, Hamburger + Logo on Mobile */}
          <div className="flex items-center gap-4">
            {/* Mobile menu trigger */}
            <div className="md:hidden">
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-muted/80">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 max-w-full border-r-0">
                  <div className="h-full flex flex-col" onClick={() => setIsMenuOpen(false)}>
                    <Sidebar className="h-full border-r-0 shadow-none w-full" />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Title / Brand logo for mobile */}
            <div className="flex items-center">
              <Link to="/" className="flex md:hidden items-center gap-2">
                <Wallet className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold text-primary gradient-text">
                  SmartFinHub
                </span>
              </Link>
              
              {/* Page Title on Desktop */}
              <div className="hidden md:flex flex-col">
                <span className="text-lg font-bold text-foreground tracking-tight">
                  {pageTitle}
                </span>
                <span className="text-xs text-muted-foreground">
                  SmartFinHub / {pageTitle}
                </span>
              </div>
            </div>
          </div>

          {/* Right section: Profile Info & Status on Desktop, minimal icon on Mobile */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 bg-muted/30 border border-border/40 px-3 py-1.5 rounded-full">
              <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20">
                <User className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {profile?.email || 'Active User'}
              </span>
            </div>

            <div className="md:hidden">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <User className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
