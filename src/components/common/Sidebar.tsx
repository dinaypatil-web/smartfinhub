import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useHybridAuth } from '@/contexts/HybridAuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Building2, 
  History, 
  ArrowLeftRight, 
  PieChart, 
  BarChart3, 
  Sparkles, 
  Settings, 
  Database,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Wallet,
  Sun,
  Moon,
  Monitor,
  User
} from 'lucide-react';
import routes from '../../routes';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    return stored === 'true';
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useHybridAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  if (!user) {
    return null;
  }

  const navigation = routes.filter((route) => route.visible !== false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getRouteIcon = (path: string, isActive: boolean) => {
    const iconClass = `h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
      isActive ? 'text-primary scale-105' : 'text-muted-foreground group-hover:text-foreground'
    }`;

    switch (path) {
      case '/':
        return <LayoutDashboard className={iconClass} />;
      case '/accounts':
        return <Building2 className={iconClass} />;
      case '/loan-emi-history':
        return <History className={iconClass} />;
      case '/transactions':
        return <ArrowLeftRight className={iconClass} />;
      case '/budgets':
        return <PieChart className={iconClass} />;
      case '/reports':
        return <BarChart3 className={iconClass} />;
      case '/ai-analysis':
        return <Sparkles className={iconClass} />;
      case '/settings':
        return <Settings className={iconClass} />;
      case '/backup-restore':
        return <Database className={iconClass} />;
      case '/voice-transact':
        return <Sparkles className={iconClass} />;
      default:
        return <Wallet className={iconClass} />;
    }
  };

  return (
    <aside 
      className={`bg-card dark:bg-[#09090b] border-r border-border/70 sticky top-0 left-0 h-screen z-20 flex flex-col justify-between transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      } ${className}`}
    >
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Sidebar Header Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border/70">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 text-primary-foreground shadow-xs">
              <Wallet className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-base font-bold text-foreground tracking-tight whitespace-nowrap">
                  SmartFinHub
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase -mt-0.5">
                  Pro Finance
                </span>
              </div>
            )}
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="h-8 w-8 p-0 hidden md:flex rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-4">
          {!isCollapsed && (
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Menu
            </p>
          )}
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group duration-200 relative ${
                    isActive
                      ? 'text-primary bg-primary/10 border border-primary/20 shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  {getRouteIcon(item.path, isActive)}
                  {!isCollapsed && (
                    <span className="whitespace-nowrap transition-opacity duration-300">
                      {item.name}
                    </span>
                  )}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-foreground text-background text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-border/70 space-y-3 bg-muted/20">
        {/* Theme Segmented Control */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-1 bg-muted/60 rounded-xl border border-border/60">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'light' ? 'bg-card text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Light Mode"
            >
              <Sun className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'dark' ? 'bg-card text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Dark Mode"
            >
              <Moon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'system' ? 'bg-card text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="System Default"
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-border/60"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* User Card & Logout */}
        <div className="flex flex-col gap-1.5">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-card border border-border/70 shadow-2xs">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 flex-shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {profile?.email || 'User'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {profile?.default_currency || 'USD'} • Active
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <User className="h-4 w-4" />
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            onClick={handleSignOut}
            className={`w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors flex items-center ${
              isCollapsed ? 'justify-center p-0 h-9' : 'justify-start px-3 py-2 text-xs font-medium h-auto'
            }`}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span className="ml-2.5">Sign Out</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}
