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

  const getRouteIcon = (path: string) => {
    switch (path) {
      case '/':
        return <LayoutDashboard className="h-5 w-5 flex-shrink-0" />;
      case '/accounts':
        return <Building2 className="h-5 w-5 flex-shrink-0" />;
      case '/loan-emi-history':
        return <History className="h-5 w-5 flex-shrink-0" />;
      case '/transactions':
        return <ArrowLeftRight className="h-5 w-5 flex-shrink-0" />;
      case '/budgets':
        return <PieChart className="h-5 w-5 flex-shrink-0" />;
      case '/reports':
        return <BarChart3 className="h-5 w-5 flex-shrink-0" />;
      case '/ai-analysis':
        return <Sparkles className="h-5 w-5 flex-shrink-0" />;
      case '/settings':
        return <Settings className="h-5 w-5 flex-shrink-0" />;
      case '/backup-restore':
        return <Database className="h-5 w-5 flex-shrink-0" />;
      default:
        return <Wallet className="h-5 w-5 flex-shrink-0" />;
    }
  };

  return (
    <aside 
      className={`bg-card border-r sticky top-0 left-0 h-screen z-20 flex flex-col justify-between transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      } ${className}`}
    >
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Sidebar Header Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
              <Wallet className="h-5 w-5 text-primary animate-pulse-slow" />
            </div>
            {!isCollapsed && (
              <span className="text-lg font-bold text-primary tracking-wide whitespace-nowrap gradient-text">
                SmartFinHub
              </span>
            )}
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="h-8 w-8 p-0 hidden md:flex"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group duration-200 relative ${
                  isActive
                    ? 'text-primary bg-primary/10 border-l-4 border-primary pl-2 shadow-sm'
                    : 'text-muted-foreground hover:text-primary hover:bg-muted/60'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                {getRouteIcon(item.path)}
                {!isCollapsed && (
                  <span className="whitespace-nowrap transition-opacity duration-300">
                    {item.name}
                  </span>
                )}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t space-y-4 bg-muted/20">
        {/* Theme Toggles */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-1 bg-muted rounded-lg border border-border/60">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex justify-center py-1.5 rounded-md transition-all ${
                theme === 'light' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Light Mode"
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex justify-center py-1.5 rounded-md transition-all ${
                theme === 'dark' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Dark Mode"
            >
              <Moon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex-1 flex justify-center py-1.5 rounded-md transition-all ${
                theme === 'system' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="System Default"
            >
              <Monitor className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-colors border border-border/60"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
            </button>
          </div>
        )}

        {/* User Block & Logout */}
        <div className="flex flex-col gap-2">
          {!isCollapsed ? (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-card/50 border border-border/40">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {profile?.email || 'Active User'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {profile?.phone || 'Financial Dashboard'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <User className="h-4 w-4 text-primary" />
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            onClick={handleSignOut}
            className={`w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center ${
              isCollapsed ? 'justify-center p-0 h-9' : 'justify-start px-3 py-2.5 h-auto'
            }`}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3 font-medium">Logout</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}
