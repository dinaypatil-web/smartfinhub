import type { ReactNode } from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import AccountForm from './pages/AccountForm';
import Transactions from './pages/Transactions';
import TransactionForm from './pages/TransactionForm';
import Budgets from './pages/Budgets';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';

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
    name: 'Settings',
    path: '/settings',
    element: <ProtectedRoute><Settings /></ProtectedRoute>,
    visible: true,
    protected: true,
  },
];

export default routes;
