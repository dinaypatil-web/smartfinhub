import { useState, useRef } from 'react';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { accountApi, transactionApi, budgetApi, interestRateApi, loanEMIPaymentApi } from '@/db/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, AlertTriangle, CheckCircle2, Database, Shield, FileJson } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BackupData {
  version: string;
  timestamp: string;
  userId: string;
  data: {
    accounts: any[];
    transactions: any[];
    budgets: any[];
    interestRates: any[];
    loanEMIPayments: any[];
  };
}

export default function BackupRestore() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [backupFile, setBackupFile] = useState<BackupData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch all user data - SECURITY: All API calls filter by user.id to ensure
      // only the current user's data is included in the backup
      const [accounts, transactions, budgets, interestRates, loanEMIPayments] = await Promise.all([
        accountApi.getAccounts(user.id),
        transactionApi.getTransactions(user.id),
        budgetApi.getBudgets(user.id),
        interestRateApi.getInterestRates(user.id),
        loanEMIPaymentApi.getLoanEMIPayments(user.id),
      ]);

      // Create backup object
      const backup: BackupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        userId: user.id,
        data: {
          accounts,
          transactions,
          budgets,
          interestRates,
          loanEMIPayments,
        },
      };

      // Convert to JSON and create download
      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `smartfinhub-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Backup Created Successfully',
        description: 'Your data has been exported to a file. Store it securely.',
      });
    } catch (error) {
      console.error('Backup error:', error);
      toast({
        title: 'Backup Failed',
        description: 'Failed to create backup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content) as BackupData;

        // Validate backup structure
        if (!backup.version || !backup.timestamp || !backup.data) {
          throw new Error('Invalid backup file format');
        }

        if (!backup.data.accounts || !backup.data.transactions) {
          throw new Error('Backup file is missing required data');
        }

        // Validate that backup belongs to current user
        if (backup.userId && backup.userId !== user.id) {
          toast({
            title: 'Unauthorized Backup File',
            description: 'This backup file belongs to a different user. You can only restore your own backups.',
            variant: 'destructive',
          });
          return;
        }

        setBackupFile(backup);
        setShowRestoreDialog(true);
      } catch (error) {
        console.error('File parse error:', error);
        toast({
          title: 'Invalid Backup File',
          description: 'The selected file is not a valid SmartFinHub backup.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!user || !backupFile) return;

    setLoading(true);
    setShowRestoreDialog(false);

    try {
      // Delete existing data
      const existingAccounts = await accountApi.getAccounts(user.id);
      const existingTransactions = await transactionApi.getTransactions(user.id);
      const existingBudgets = await budgetApi.getBudgets(user.id);

      // Delete all existing records
      await Promise.all([
        ...existingTransactions.map(t => transactionApi.deleteTransaction(t.id)),
        ...existingAccounts.map(a => accountApi.deleteAccount(a.id)),
        ...existingBudgets.map(b => budgetApi.deleteBudget(b.id)),
      ]);

      // Restore accounts first (as transactions depend on them)
      const accountIdMap = new Map<string, string>();
      for (const account of backupFile.data.accounts) {
        const oldId = account.id;
        const { id, user_id, created_at, updated_at, ...accountData } = account;
        const newAccount = await accountApi.createAccount(accountData);
        if (newAccount) {
          accountIdMap.set(oldId, newAccount.id);
        }
      }

      // Restore transactions with updated account IDs
      for (const transaction of backupFile.data.transactions) {
        const { id, user_id, created_at, updated_at, ...transactionData } = transaction;
        
        // Update account IDs to new ones
        if (transactionData.account_id) {
          transactionData.account_id = accountIdMap.get(transactionData.account_id) || transactionData.account_id;
        }
        if (transactionData.from_account_id) {
          transactionData.from_account_id = accountIdMap.get(transactionData.from_account_id) || transactionData.from_account_id;
        }
        if (transactionData.to_account_id) {
          transactionData.to_account_id = accountIdMap.get(transactionData.to_account_id) || transactionData.to_account_id;
        }

        await transactionApi.createTransaction(transactionData);
      }

      // Restore budgets
      for (const budget of backupFile.data.budgets) {
        const { id, user_id, created_at, updated_at, ...budgetData } = budget;
        await budgetApi.createOrUpdateBudget(budgetData);
      }

      // Restore interest rates with updated account IDs
      for (const rate of backupFile.data.interestRates || []) {
        const { id, user_id, created_at, updated_at, ...rateData } = rate;
        if (rateData.account_id) {
          rateData.account_id = accountIdMap.get(rateData.account_id) || rateData.account_id;
        }
        await interestRateApi.createInterestRate(rateData);
      }

      // Restore loan EMI payments with updated account IDs
      for (const payment of backupFile.data.loanEMIPayments || []) {
        const { id, user_id, created_at, updated_at, ...paymentData } = payment;
        if (paymentData.account_id) {
          paymentData.account_id = accountIdMap.get(paymentData.account_id) || paymentData.account_id;
        }
        await loanEMIPaymentApi.createLoanEMIPayment(paymentData);
      }

      toast({
        title: 'Restore Completed Successfully',
        description: 'Your data has been restored from the backup file.',
      });

      // Refresh the page to show restored data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Restore error:', error);
      toast({
        title: 'Restore Failed',
        description: 'Failed to restore data. Your existing data remains unchanged.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setBackupFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Backup & Restore</h1>
        <p className="text-muted-foreground mt-2">
          Export your financial data to a file or restore from a previous backup
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Backup Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle>Backup Data</CardTitle>
            </div>
            <CardDescription>
              Export all your accounts, transactions, and budgets to a file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Database className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">What's included:</p>
                  <ul className="text-muted-foreground list-disc list-inside mt-1">
                    <li>All accounts (Bank, Credit Card, Loan)</li>
                    <li>All transactions</li>
                    <li>Budget information</li>
                    <li>Interest rate history</li>
                    <li>Loan EMI payment records</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <Shield className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-600 dark:text-amber-500">Security Notice:</p>
                  <p className="text-muted-foreground mt-1">
                    Backup files contain sensitive financial data. Store them securely and never share them with others.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleBackup}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creating Backup...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Backup
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Restore Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <CardTitle>Restore Data</CardTitle>
            </div>
            <CardDescription>
              Import data from a previously created backup file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <FileJson className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">How it works:</p>
                  <ul className="text-muted-foreground list-disc list-inside mt-1">
                    <li>Select a backup file (.json)</li>
                    <li>Review the backup information</li>
                    <li>Confirm to restore your data</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Warning:</p>
                  <p className="text-muted-foreground mt-1">
                    Restoring will replace all your current data with the backup. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Security:</p>
                  <p className="text-muted-foreground mt-1">
                    You can only restore backups that belong to your account. Backups from other users will be rejected.
                  </p>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              id="backup-file-input"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Select Backup File
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Best Practices Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Regular Backups
              </h4>
              <p className="text-sm text-muted-foreground">
                Create backups regularly, especially before making major changes to your accounts or transactions.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Secure Storage
              </h4>
              <p className="text-sm text-muted-foreground">
                Store backup files in a secure location like encrypted cloud storage or password-protected folders.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Multiple Copies
              </h4>
              <p className="text-sm text-muted-foreground">
                Keep multiple backup copies in different locations to prevent data loss.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Test Restores
              </h4>
              <p className="text-sm text-muted-foreground">
                Periodically test your backup files to ensure they can be restored successfully.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Data Restore</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to restore data from a backup created on{' '}
                <strong>{backupFile ? new Date(backupFile.timestamp).toLocaleString() : ''}</strong>.
              </p>
              {backupFile && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="font-medium mb-2">Backup contains:</p>
                  <ul className="space-y-1">
                    <li>• {backupFile.data.accounts.length} accounts</li>
                    <li>• {backupFile.data.transactions.length} transactions</li>
                    <li>• {backupFile.data.budgets.length} budgets</li>
                    {backupFile.data.interestRates?.length > 0 && (
                      <li>• {backupFile.data.interestRates.length} interest rate records</li>
                    )}
                    {backupFile.data.loanEMIPayments?.length > 0 && (
                      <li>• {backupFile.data.loanEMIPayments.length} loan EMI payment records</li>
                    )}
                  </ul>
                </div>
              )}
              <p className="text-destructive font-medium">
                ⚠️ This will permanently delete all your current data and replace it with the backup. This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} className="bg-destructive hover:bg-destructive/90">
              Restore Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
