import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { creditCardStatementApi, emiApi } from '@/db/api';
import type { CreditCardStatementLine, CreditCardPaymentAllocation } from '@/types/types';

interface StatementItem extends CreditCardStatementLine {
  isEMI?: boolean;
  emiDetails?: any;
}

interface CreditCardStatementSelectorProps {
  creditCardId: string;
  repaymentAmount: number;
  onAllocationsChange: (allocations: CreditCardPaymentAllocation[]) => void;
  onAdvanceCreatedChange: (amount: number) => void;
  onAdvanceUsedChange: (amount: number) => void;
  currency: string;
}

export const CreditCardStatementSelector: React.FC<CreditCardStatementSelectorProps> = ({
  creditCardId,
  repaymentAmount,
  onAllocationsChange,
  onAdvanceCreatedChange,
  onAdvanceUsedChange,
  currency
}) => {
  const [statementItems, setStatementItems] = useState<StatementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [advanceBalance, setAdvanceBalance] = useState(0);

  // Load statement items and advance balance
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get unpaid statement lines
        const items = await creditCardStatementApi.getUnpaidStatementLines(creditCardId);

        // Get advance balance
        const balance = await creditCardStatementApi.getAdvanceBalance(creditCardId);
        setAdvanceBalance(balance);

        // Fetch EMI details if needed
        const itemsWithDetails = await Promise.all(
          items.map(async (item) => {
            if (item.emi_id) {
              try {
                const emiDetails = await emiApi.getEMIById(item.emi_id);
                return {
                  ...item,
                  isEMI: true,
                  emiDetails
                };
              } catch (err) {
                console.error('Error fetching EMI details:', err);
                return item;
              }
            }
            return item;
          })
        );

        setStatementItems(itemsWithDetails);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statement items');
        console.error('Error loading statement items:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [creditCardId]);

  // Calculate totals and allocations
  useEffect(() => {
    const selectedItemsList = Array.from(selectedItems).map(itemId =>
      statementItems.find(item => item.id === itemId)
    ).filter(Boolean) as StatementItem[];

    const totalSelected = selectedItemsList.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
    const diff = repaymentAmount - totalSelected;

    let created = 0;
    let used = 0;

    if (diff > 0) {
      created = diff;
    } else if (diff < 0) {
      used = Math.min(advanceBalance, Math.abs(diff));
    }

    // Build allocations
    const allocations: CreditCardPaymentAllocation[] = selectedItemsList.map(item => ({
      statement_line_id: item.id,
      amount_paid: parseFloat(item.amount.toString()),
      transaction_id: item.transaction_id || undefined,
      emi_id: item.emi_id || undefined,
      description: item.description
    }));

    onAllocationsChange(allocations);
    onAdvanceCreatedChange(created);
    onAdvanceUsedChange(used);
  }, [selectedItems, statementItems, repaymentAmount, advanceBalance, onAllocationsChange, onAdvanceCreatedChange, onAdvanceUsedChange]);

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const selectedItemsList = Array.from(selectedItems).map(itemId =>
    statementItems.find(item => item.id === itemId)
  ).filter(Boolean) as StatementItem[];

  const totalSelected = selectedItemsList.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
  const diff = repaymentAmount - totalSelected;
  const advanceCreated = diff > 0 ? diff : 0;
  const advanceUsed = diff < 0 ? Math.min(advanceBalance, Math.abs(diff)) : 0;
  const shortFall = diff < 0 ? Math.max(0, Math.abs(diff) - advanceBalance) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="text-gray-600">Loading statement items...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Advance Balance Info */}
      {advanceBalance > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Advance Balance:</span> {currency} {advanceBalance.toFixed(2)}
            <br />
            <span className="text-xs text-blue-600">This amount will be automatically adjusted against future statements.</span>
          </p>
        </div>
      )}

      {/* Statement Items List */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b">
          <h3 className="font-semibold text-sm text-gray-700">
            Due Transactions & EMIs ({statementItems.length})
          </h3>
        </div>

        {statementItems.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500">
            <CheckCircle2 className="mx-auto mb-2 text-green-500" size={24} />
            <p>No pending transactions found</p>
          </div>
        ) : (
          <div className="divide-y max-h-96 overflow-y-auto">
            {statementItems.map(item => (
              <div key={item.id} className="hover:bg-gray-50 transition">
                <div className="flex items-start gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>{new Date(item.transaction_date).toLocaleDateString()}</span>
                          {item.isEMI && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">EMI</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {currency} {parseFloat(item.amount.toString()).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.status === 'partial' ? `Paid: ${currency} ${item.paid_amount}` : 'Pending'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expand button for EMI details */}
                  {item.isEMI && (
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="text-gray-500 hover:text-gray-700 mt-1"
                    >
                      {expandedItems.has(item.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                </div>

                {/* EMI Details */}
                {item.isEMI && expandedItems.has(item.id) && item.emiDetails && (
                  <div className="bg-gray-100 px-4 py-3 text-xs text-gray-600 space-y-1">
                    <p><span className="font-semibold">EMI Amount:</span> {currency} {item.emiDetails.emi_amount}</p>
                    <p><span className="font-semibold">Installments Remaining:</span> {item.emiDetails.remaining_installments}</p>
                    <p><span className="font-semibold">Interest Rate:</span> {item.emiDetails.interest_rate}% p.a.</p>
                    <p><span className="font-semibold">Next Due:</span> {new Date(item.emiDetails.next_due_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Selection:</span>
          <span className="font-semibold">{currency} {totalSelected.toFixed(2)}</span>
        </div>

        <div className="h-px bg-gray-200 my-1"></div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Covered by Repayment:</span>
          <span className="font-semibold">{currency} {Math.min(repaymentAmount, totalSelected).toFixed(2)}</span>
        </div>

        {advanceUsed > 0 && (
          <div className="flex justify-between text-sm text-blue-600 font-medium font-medium">
            <span>Covered by Advance Balance:</span>
            <span>{currency} {advanceUsed.toFixed(2)}</span>
          </div>
        )}

        {advanceCreated > 0 && (
          <div className="flex justify-between text-sm text-green-600 font-medium">
            <span>New Advance Created:</span>
            <span>{currency} {advanceCreated.toFixed(2)}</span>
          </div>
        )}

        {shortFall > 0 && (
          <div className="flex justify-between text-sm text-red-600 font-bold">
            <span>Shortfall (Need more funds):</span>
            <span>{currency} {shortFall.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Warning if selection doesn't match repayment */}
      {(advanceCreated > 0 || advanceUsed > 0 || shortFall > 0) && (
        <div className={`border rounded-lg p-3 flex gap-2 ${shortFall > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <AlertCircle className={shortFall > 0 ? 'text-red-600 mt-0.5' : 'text-amber-600 mt-0.5'} size={16} />
          <div className="text-sm">
            {shortFall > 0 ? (
              <p className="text-red-800 font-semibold">
                You have selected items worth more than your Repayment + Advance Balance. Amount needed: {currency} {shortFall.toFixed(2)}
              </p>
            ) : advanceCreated > 0 ? (
              <p className="text-amber-800">
                {currency} {advanceCreated.toFixed(2)} will be recorded as advance credit for next statement.
              </p>
            ) : (
              <p className="text-blue-800">
                {currency} {advanceUsed.toFixed(2)} from your existing advance balance will be consumed.
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          Error: {error}
        </div>
      )}
    </div>
  );
};
