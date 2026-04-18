import React, { useState } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useAccounts } from '../../hooks/useAccounts';
import { ArrowDownRight, ArrowUpRight, ArrowRight, RefreshCw, Filter, Search, MoreVertical, CreditCard, DollarSign, Wallet, Layers, HelpCircle, FileText } from 'lucide-react';

const TXN_TYPES = [
  { value: 'all', label: 'All Transactions' },
  { value: 'usd_purchase', label: 'USD Purchase', icon: <DollarSign size={14} />, color: 'var(--green-600)' },
  { value: 'usdt_purchase', label: 'USDT Purchase', icon: <CreditCard size={14} />, color: 'var(--blue-600)' },
  { value: 'usdt_sale', label: 'USDT Sale', icon: <Layers size={14} />, color: 'var(--amber-600)' },
  { value: 'transfer', label: 'Treasury Transfer', icon: <ArrowRight size={14} />, color: 'var(--purple-600)' },
  { value: 'manual_adjustment', label: 'Manual Adjustment', icon: <HelpCircle size={14} />, color: 'var(--slate-600)' },
];

const Transactions = () => {
  const [type, setType] = useState('all');
  const [accountId, setAccountId] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useTransactions({ type, accountId, page });
  const { data: accounts = [] } = useAccounts({ isActive: null });

  const transactions = data?.data || [];

  const getTxnIcon = (type) => {
    const t = TXN_TYPES.find(it => it.value === type);
    return t ? t.icon : <FileText size={14} />;
  };

  const getTxnColor = (type) => {
    const t = TXN_TYPES.find(it => it.value === type);
    return t ? t.color : 'var(--text-muted)';
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="page-title">Financial Ledger</div>
          <div className="page-sub">Audit-ready history of all account movements and transactions.</div>
        </div>
        <button className="btn btn-outline" onClick={() => setPage(0)}><RefreshCw size={14} /> Refresh</button>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="period-tabs">
          {TXN_TYPES.map(t => (
            <button key={t.value} className={`period-tab${type === t.value ? ' active' : ''}`} onClick={() => { setType(t.value); setPage(0); }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="input input-sm" style={{ width: 180 }} value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(0); }}>
            <option value="">Filter by Account...</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.accountName} ({acc.currency})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date / Time</th>
              <th>Type</th>
              <th>Movement</th>
              <th className="right">Net Amount Out</th>
              <th className="right">Net Amount In</th>
              <th className="right">Rate / Fee</th>
              <th className="right">Ref</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="center" style={{ padding: 40, color: 'var(--text-muted)' }}>Loading ledger...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={7} className="center" style={{ padding: 60 }}>
                <div className="empty-state">
                  <div className="empty-icon"><FileText size={32} /></div>
                  <div className="empty-title">No transactions found</div>
                  <div className="empty-sub">Your financial history is currently empty.</div>
                </div>
              </td></tr>
            ) : (
              transactions.map(t => (
                <tr key={t.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(t.createdAt).toLocaleDateString()}</div>
                    {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: getTxnColor(t.transactionType) }}>
                        {getTxnIcon(t.transactionType)}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{t.transactionType.replace('_', ' ')}</div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>
                      {t.fromAccountId ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: 'var(--text-muted)' }}>From:</span>
                          <span style={{ fontWeight: 600 }}>{t.fromAccountName}</span>
                        </div>
                      ) : null}
                      {t.toAccountId ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: 'var(--text-muted)' }}>To:</span>
                          <span style={{ fontWeight: 600, color: 'var(--green-600)' }}>{t.toAccountName}</span>
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="right">
                    {t.fromAccountId ? (
                      <span style={{ color: 'var(--red-600)', fontWeight: 700 }}>
                        -{t.amountFrom.toLocaleString(undefined, { minimumFractionDigits: 2 })} {t.fromCurrency}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="right">
                    {t.toAccountId ? (
                      <span style={{ color: 'var(--green-600)', fontWeight: 700 }}>
                        +{t.amountTo.toLocaleString(undefined, { minimumFractionDigits: 2 })} {t.toCurrency}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="right">
                    <div style={{ fontSize: 12 }}>
                      {t.rate ? <div style={{ fontWeight: 600 }}>{t.rate.toFixed(4)} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>rate</span></div> : null}
                      {t.feeAmount > 0 ? <div style={{ color: 'var(--red-500)' }}>{t.feeAmount.toFixed(2)} <span style={{ fontSize: 10 }}>fee</span></div> : null}
                    </div>
                  </td>
                  <td className="right">
                    <div style={{ fontSize: 11, background: 'var(--bg-muted)', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>{t.referenceId || t.id.slice(0, 8)}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (Simplified) */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span style={{ fontSize: 13, padding: '6px 14px', border: '1px solid var(--border)', background: 'white', borderRadius: 8 }}>Page {page + 1}</span>
        <button className="btn btn-outline btn-sm" disabled={transactions.length < 50} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
};

export default Transactions;
