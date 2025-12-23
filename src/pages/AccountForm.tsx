import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { accountApi, interestRateApi, loanEMIPaymentApi } from '@/db/api';
import type { Account, AccountType, InterestRateType, LoanEMIPayment } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Smartphone } from 'lucide-react';
import { countries } from '@/utils/countries';
import { getBanksByCountry, getBankLogo } from '@/utils/banks';
import { calculateEMI, formatLoanAmount } from '@/utils/loanCalculations';
import { detectDeviceType, getAppStoreName } from '@/utils/deviceDetection';
import BankLogo from '@/components/BankLogo';
import LoanEMIPaymentManager from '@/components/LoanEMIPaymentManager';
import { cache } from '@/utils/cache';

export default function AccountForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(!!id);
  const [manualEntry, setManualEntry] = useState(false);

  const [formData, setFormData] = useState({
    account_type: 'bank' as AccountType,
    account_name: '',
    country: profile?.default_country || 'IN',
    institution_name: '',
    institution_logo: '',
    last_4_digits: '',
    balance: '0',
    currency: profile?.default_currency || 'INR',
    loan_principal: '',
    loan_tenure_months: '',
    loan_start_date: '',
    interest_rate_type: 'fixed' as InterestRateType,
    current_interest_rate: '',
    due_date: '',
    statement_day: '',
    due_day: '',
    credit_limit: '',
  });

  const [calculatedEMI, setCalculatedEMI] = useState<number>(0);
  const [availableBanks, setAvailableBanks] = useState(getBanksByCountry(formData.country));
  const [emiPayments, setEmiPayments] = useState<Array<Omit<LoanEMIPayment, 'id' | 'user_id' | 'account_id' | 'created_at' | 'updated_at'>>>([]);

  // Calculate EMI whenever loan details change
  useEffect(() => {
    if (
      formData.account_type === 'loan' &&
      formData.loan_principal &&
      formData.current_interest_rate &&
      formData.loan_tenure_months
    ) {
      const emi = calculateEMI(
        parseFloat(formData.loan_principal),
        parseFloat(formData.current_interest_rate),
        parseInt(formData.loan_tenure_months)
      );
      setCalculatedEMI(emi);
    } else {
      setCalculatedEMI(0);
    }
  }, [formData.loan_principal, formData.current_interest_rate, formData.loan_tenure_months, formData.account_type]);

  useEffect(() => {
    if (id && user) {
      loadAccount();
    }
  }, [id, user]);

  useEffect(() => {
    const banks = getBanksByCountry(formData.country);
    setAvailableBanks(banks);
    // Reset manual entry mode when country changes
    if (banks.length > 0 && !manualEntry) {
      setManualEntry(false);
    }
  }, [formData.country]);

  const loadAccount = async () => {
    if (!id) return;
    
    setLoadingAccount(true);
    try {
      const account = await accountApi.getAccountById(id);
      if (account) {
        setFormData({
          account_type: account.account_type,
          account_name: account.account_name,
          country: account.country,
          institution_name: account.institution_name,
          institution_logo: account.institution_logo || '',
          last_4_digits: account.last_4_digits || '',
          balance: account.balance.toString(),
          currency: account.currency,
          loan_principal: account.loan_principal?.toString() || '',
          loan_tenure_months: account.loan_tenure_months?.toString() || '',
          loan_start_date: account.loan_start_date || '',
          interest_rate_type: account.interest_rate_type || 'fixed',
          current_interest_rate: account.current_interest_rate?.toString() || '',
          due_date: account.due_date?.toString() || '',
          statement_day: account.statement_day?.toString() || '',
          due_day: account.due_day?.toString() || '',
          credit_limit: account.credit_limit?.toString() || '',
        });

        if (account.account_type === 'loan') {
          const existingPayments = await loanEMIPaymentApi.getPaymentsByAccount(id);
          setEmiPayments(existingPayments);
        }
      }
    } catch (error) {
      console.error('Error loading account:', error);
      toast({
        title: 'Error',
        description: 'Failed to load account',
        variant: 'destructive',
      });
    } finally {
      setLoadingAccount(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (formData.account_type === 'loan') {
      if (!formData.loan_principal || !formData.loan_tenure_months || !formData.current_interest_rate || !formData.loan_start_date || !formData.due_date) {
        toast({
          title: 'Error',
          description: 'Please fill in all loan details including start date and due date',
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      const accountData: any = {
        user_id: user.id,
        account_type: formData.account_type,
        account_name: formData.account_name,
        country: formData.country,
        institution_name: formData.account_type === 'cash' ? 'Cash' : formData.institution_name,
        institution_logo: formData.account_type === 'cash' ? null : (formData.institution_logo || getBankLogo(formData.institution_name)),
        last_4_digits: formData.last_4_digits || null,
        balance: parseFloat(formData.balance) || 0,
        currency: formData.currency,
        loan_principal: formData.account_type === 'loan' ? parseFloat(formData.loan_principal) : null,
        loan_tenure_months: formData.account_type === 'loan' ? parseInt(formData.loan_tenure_months) : null,
        loan_start_date: formData.account_type === 'loan' ? formData.loan_start_date : null,
        interest_rate_type: formData.account_type === 'loan' ? formData.interest_rate_type : null,
        current_interest_rate: formData.account_type === 'loan' ? parseFloat(formData.current_interest_rate) : null,
        due_date: formData.account_type === 'loan' ? parseInt(formData.due_date) : null,
        statement_day: formData.account_type === 'credit_card' && formData.statement_day ? parseInt(formData.statement_day) : null,
        due_day: formData.account_type === 'credit_card' && formData.due_day ? parseInt(formData.due_day) : null,
        credit_limit: formData.account_type === 'credit_card' && formData.credit_limit ? parseFloat(formData.credit_limit) : null,
      };

      if (id) {
        await accountApi.updateAccount(id, accountData);

        if (formData.account_type === 'loan' && emiPayments.length > 0) {
          await loanEMIPaymentApi.deletePaymentsByAccount(id);
          const paymentsToSave = emiPayments.map(payment => {
            const { id: _id, created_at, updated_at, ...paymentData } = payment as any;
            return {
              ...paymentData,
              user_id: user.id,
              account_id: id,
            };
          });
          await loanEMIPaymentApi.createBulkPayments(paymentsToSave);
        }

        // Clear dashboard cache to reflect updated account
        cache.clearPattern('dashboard-');

        toast({
          title: 'Success',
          description: 'Account updated successfully',
        });
      } else {
        const newAccount = await accountApi.createAccount(accountData);
        
        if (formData.account_type === 'loan' && formData.current_interest_rate && formData.loan_start_date) {
          await interestRateApi.addInterestRate({
            account_id: newAccount.id,
            interest_rate: parseFloat(formData.current_interest_rate),
            effective_date: formData.loan_start_date,
          });

          if (emiPayments.length > 0) {
            const paymentsToSave = emiPayments.map(payment => ({
              ...payment,
              user_id: user.id,
              account_id: newAccount.id,
            }));
            await loanEMIPaymentApi.createBulkPayments(paymentsToSave);
          }
        }

        // Clear dashboard cache to reflect new account
        cache.clearPattern('dashboard-');

        toast({
          title: 'Success',
          description: 'Account created successfully',
        });
      }

      navigate('/accounts');
    } catch (error: any) {
      console.error('Error saving account:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingAccount) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Button variant="ghost" onClick={() => navigate('/accounts')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Accounts
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{id ? 'Edit Account' : 'Add New Account'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="account_type">Account Type *</Label>
              <Select
                value={formData.account_type}
                onValueChange={(value: AccountType) => setFormData({ ...formData, account_type: value })}
                disabled={!!id}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="loan">Loan Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name *</Label>
              <Input
                id="account_name"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="e.g., My Savings Account"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(country => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(country => (
                      <SelectItem key={country.currency} value={country.currency}>
                        {country.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.account_type !== 'cash' && (
              <div className="space-y-2">
                <Label htmlFor="institution_name">Bank/Institution Name *</Label>
                {availableBanks.length > 0 && !manualEntry ? (
                  <Select
                    value={formData.institution_name}
                    onValueChange={(value) => {
                      if (value === 'other') {
                        setManualEntry(true);
                        setFormData({
                          ...formData,
                          institution_name: '',
                          institution_logo: ''
                        });
                      } else {
                        const bank = availableBanks.find(b => b.name === value);
                        setFormData({
                          ...formData,
                          institution_name: value,
                          institution_logo: bank?.logo || ''
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBanks.map(bank => (
                        <SelectItem key={bank.name} value={bank.name}>
                          {bank.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other (Enter manually)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <Input
                      id="institution_name"
                      value={formData.institution_name}
                      onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                      placeholder="Enter bank name"
                      required
                    />
                    {availableBanks.length > 0 && manualEntry && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setManualEntry(false);
                          setFormData({ ...formData, institution_name: '' });
                        }}
                      >
                        ← Back to bank selection
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Logo Preview */}
                {formData.institution_name && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                    <BankLogo 
                      src={formData.institution_logo || null}
                      alt={formData.institution_name}
                      bankName={formData.institution_name}
                      className="h-12 w-12"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Logo Preview</p>
                      <p className="text-xs text-muted-foreground">
                        This logo will be displayed on your dashboard and accounts page
                      </p>
                    </div>
                  </div>
                )}

                {/* Mobile Banking App Link */}
                {formData.institution_name && (() => {
                  const selectedBank = availableBanks.find(b => b.name === formData.institution_name);
                  if (selectedBank) {
                    const deviceType = detectDeviceType();
                    const appStoreName = getAppStoreName(deviceType);
                    
                    // Get the appropriate app link based on device
                    let appLink = '';
                    if (deviceType === 'ios' && selectedBank.iosAppLink) {
                      appLink = selectedBank.iosAppLink;
                    } else if (deviceType === 'android' && selectedBank.androidAppLink) {
                      appLink = selectedBank.androidAppLink;
                    } else if (selectedBank.androidAppLink) {
                      // Fallback to Android link if device type is unknown
                      appLink = selectedBank.androidAppLink;
                    } else if (selectedBank.appLink) {
                      // Legacy support for old appLink format
                      appLink = selectedBank.appLink;
                    }
                    
                    if (appLink) {
                      return (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              <div>
                                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                                  Mobile Banking App Available
                                </p>
                                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                  Download from {appStoreName} for easy access
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                              onClick={() => window.open(appLink, '_blank')}
                            >
                              Open App
                            </Button>
                          </div>
                        </div>
                      );
                    }
                  }
                  return null;
                })()}

                {/* Custom Logo URL Input */}
                {formData.institution_name && (
                  <div className="space-y-2">
                    <Label htmlFor="institution_logo">Custom Logo URL (Optional)</Label>
                    <Input
                      id="institution_logo"
                      type="url"
                      value={formData.institution_logo}
                      onChange={(e) => setFormData({ ...formData, institution_logo: e.target.value })}
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-sm text-muted-foreground">
                      If the automatic logo is incorrect or unavailable, paste a logo URL from the internet here
                    </p>
                  </div>
                )}
              </div>
            )}

            {formData.account_type !== 'cash' && (
              <div className="space-y-2">
                <Label htmlFor="last_4_digits">Last 4 Digits (Optional)</Label>
                <Input
                  id="last_4_digits"
                  value={formData.last_4_digits}
                  onChange={(e) => setFormData({ ...formData, last_4_digits: e.target.value.slice(0, 4) })}
                  placeholder="1234"
                  maxLength={4}
                />
                <p className="text-sm text-muted-foreground">
                  Only the last 4 digits will be displayed for security
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="balance">
                {formData.account_type === 'loan' || formData.account_type === 'credit_card' 
                  ? 'Outstanding Balance *' 
                  : 'Current Balance *'}
              </Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            {formData.account_type === 'credit_card' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="statement_day">Statement Day of Month</Label>
                  <Input
                    id="statement_day"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.statement_day}
                    onChange={(e) => setFormData({ ...formData, statement_day: e.target.value })}
                    placeholder="e.g., 15"
                  />
                  <p className="text-sm text-muted-foreground">
                    Day of the month when your credit card statement is generated (1-31)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_day">Payment Due Day of Month</Label>
                  <Input
                    id="due_day"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.due_day}
                    onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                    placeholder="e.g., 25"
                  />
                  <p className="text-sm text-muted-foreground">
                    Day of the month when your credit card payment is due (1-31)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credit_limit">Credit Limit (Optional)</Label>
                  <Input
                    id="credit_limit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                    placeholder="e.g., 50000"
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum credit limit for this card. You'll be warned when approaching this limit.
                  </p>
                </div>
              </>
            )}

            {formData.account_type === 'loan' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="loan_principal">Loan Principal Amount *</Label>
                  <Input
                    id="loan_principal"
                    type="number"
                    step="0.01"
                    value={formData.loan_principal}
                    onChange={(e) => setFormData({ ...formData, loan_principal: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loan_tenure_months">Loan Tenure (Months) *</Label>
                  <Input
                    id="loan_tenure_months"
                    type="number"
                    value={formData.loan_tenure_months}
                    onChange={(e) => setFormData({ ...formData, loan_tenure_months: e.target.value })}
                    placeholder="12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loan_start_date">Loan Start Date *</Label>
                  <Input
                    id="loan_start_date"
                    type="date"
                    value={formData.loan_start_date}
                    onChange={(e) => setFormData({ ...formData, loan_start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Payment Due Date (Day of Month) *</Label>
                  <Select
                    value={formData.due_date}
                    onValueChange={(value) => setFormData({ ...formData, due_date: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day of month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Day of month when loan payment is due (e.g., 15 for 15th of every month)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interest_rate_type">Interest Rate Type *</Label>
                  <Select
                    value={formData.interest_rate_type}
                    onValueChange={(value: InterestRateType) => setFormData({ ...formData, interest_rate_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="floating">Floating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_interest_rate">Current Interest Rate (%) *</Label>
                  <Input
                    id="current_interest_rate"
                    type="number"
                    step="0.01"
                    value={formData.current_interest_rate}
                    onChange={(e) => setFormData({ ...formData, current_interest_rate: e.target.value })}
                    placeholder="5.00"
                    required
                  />
                </div>

                {calculatedEMI > 0 && (
                  <div className="space-y-2 bg-muted p-4 rounded-lg">
                    <Label className="text-sm font-medium">Calculated EMI</Label>
                    <div className="text-2xl font-bold text-primary">
                      {formatLoanAmount(calculatedEMI, formData.currency)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Monthly payment based on principal, interest rate, and tenure
                    </p>
                  </div>
                )}
              </>
            )}

            {formData.account_type === 'loan' && formData.loan_principal && formData.current_interest_rate && formData.loan_start_date && (
              <div className="col-span-2">
                <LoanEMIPaymentManager
                  loanPrincipal={parseFloat(formData.loan_principal) || 0}
                  interestRate={parseFloat(formData.current_interest_rate) || 0}
                  loanStartDate={formData.loan_start_date}
                  currency={formData.currency}
                  onPaymentsChange={setEmiPayments}
                  initialPayments={emiPayments}
                  accountId={id}
                  interestRateType={formData.interest_rate_type as 'fixed' | 'floating'}
                  dueDayOfMonth={formData.due_date ? parseInt(formData.due_date) : undefined}
                />
              </div>
            )}

            {formData.account_type !== 'loan' && (
              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {id ? 'Update Account' : 'Create Account'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/accounts')}>
                  Cancel
                </Button>
              </div>
            )}

            {formData.account_type === 'loan' && (
              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {id ? 'Update Account' : 'Create Account'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/accounts')}>
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
