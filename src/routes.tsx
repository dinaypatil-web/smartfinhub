import type { ReactNode } from 'react';
import { lazy } from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Accounts = lazy(() => import('./pages/Accounts'));
const AccountForm = lazy(() => import('./pages/AccountForm'));
const Transactions = lazy(() => import('./pages/Transactions'));
const TransactionForm = lazy(() => import('./pages/TransactionForm'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const BackupRestore = lazy(() => import('./pages/BackupRestore'));
const AIAnalysisPage = lazy(() => import('./pages/AIAnalysisPage'));

// Auth pages loaded immediately for faster initial access
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';
import ConfirmEmail from './pages/ConfirmEmail';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  protected?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: 'Login',
    path: '/login',
    element: <Login />,
    visible: false,
  },
  {
    name: 'Register',
    path: '/register',
    element: <Register />,
    visible: false,
  },
  {
    name: 'Reset Password',
    path: '/reset-password',
    element: <ResetPassword />,
    visible: false,
  },
  {
    name: 'Auth Callback',
    path: '/auth/callback',
    element: <AuthCallback />,
    visible: false,
  },
  {
    name: 'Confirm Email',
    path: '/confirm-email',
    element: <ConfirmEmail />,
    visible: false,
  },
  {
    name: 'Dashboard',
    path: '/',
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
    visible: true,
    protected: true,
  },
  {
    name: 'Accounts',
    path: '/accounts',
    element: <ProtectedRoute><Accounts /></ProtectedRoute>,
    visible: true,
    protected: true,
  },
  {
    name: 'Add Account',
    path: '/accounts/new',
    element: <ProtectedRoute><AccountForm /></ProtectedRoute>,
    visible: false,
    protected: true,
  },
  {
    name: 'Edit Account',
    path: '/accounts/edit/:id',
    element: <ProtectedRoute><AccountForm /></ProtectedRoute>,
    visible: false,
    protected: true,
  },
  {
    name: 'Transactions',
    path: '/transactions',
    element: <ProtectedRoute><Transactions /></ProtectedRoute>,
    visible: true,
    protected: true,
  },
  {
    name: 'Add Transaction',
    path: '/transactions/new',
    element: <ProtectedRoute><TransactionForm /></ProtectedRoute>,
    visible: false,
    protected: true,
  },
  {
    name: 'Edit Transaction',
    path: '/transactions/edit/:id',
    element: <ProtectedRoute><TransactionForm /></ProtectedRoute>,
    visible: false,
    protected: true,
  },
  {
    name: 'Budgets',
    path: '/budgets',
    element: <ProtectedRoute><Budgets /></ProtectedRoute>,
    visible: true,
    protected: true,
  },
  {
    name: 'Reports',
    path: '/reports',
    element: <ProtectedRoute><Reports /></ProtectedRoute>,
    visible: true,
    protected: true,
  },
  {
    name: 'AI Analysis',
    path: '/ai-analysis',
    element: <ProtectedRoute><AIAnalysisPage /></ProtectedRoute>,
    visible: true,
    protected: true,
  },
  {
    name: 'Settings',
    path: '/settings',
    element: <ProtectedRoute><Settings /></ProtectedRoute>,
    visible: true,
    protected: true,
  },
  {
    name: 'Backup & Restore',
    path: '/backup-restore',
    element: <ProtectedRoute><BackupRestore /></ProtectedRoute>,
    visible: true,
    protected: true,
  },
];

export default routes;
