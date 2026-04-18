import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Power, Briefcase, DollarSign, Wallet, MoreVertical, Check, X, AlertCircle, ArrowDownCircle, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccounts, useAddAccount, useUpdateAccount, useAccountSummary } from '../../hooks/useAccounts';
import { useCreateManualAdjustment, useCreateManualTransfer } from '../../hooks/useTransactions';

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash / Vault', icon: <Wallet size={16} /> },
  { value: 'bank', label: 'Bank Account', icon: <Briefcase size={16} /> },
  { value: 'binance', label: 'Binance / Exchange', icon: <DollarSign size={16} /> },
  { value: 'vendor', label: 'Vendor Wallet', icon: <DollarSign size={16} /> },
  { value: 'voucher', label: 'Voucher Account', icon: <DollarSign size={16} /> },
  { value: 'other', label: 'Other', icon: <MoreVertical size={16} /> },
];

const CURRENCIES = ['LYD', 'USD', 'USDT'];

const EMPTY_FORM = {
  accountName: '',
  accountType: 'bank',
  currency: 'LYD',
  balance: '0',
  institutionName: '',
  accountNumber: '',
  iban: '',
  binanceEmail: '',
  notes: '',
};

const Accounts = () => {
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  const { data: accounts = [], isLoading } = useAccounts({ 
    currency: currencyFilter === 'all' ? null : currencyFilter 
  });
  const { data: summary = [] } = useAccountSummary();
  const { data: capitalBalances = [] } = useQuery({
    queryKey: ['capital_balances'],
    queryFn: async () => {
      const { data, error } = await supabase.from('capital_balances').select('*');
      if (error) throw error;
      return data;
    }
  });
  const addAccount = useAddAccount();
  const updateAccount = useUpdateAccount();
  const createAdjustment = useCreateManualAdjustment();
  const createTransfer = useCreateManualTransfer();

  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAccount, setDepositAccount] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [depositError, setDepositError] = useState('');
  const [depositSuccess, setDepositSuccess] = useState(false);

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferFromAccount, setTransferFromAccount] = useState(null);
  const [transferToAccountId, setTransferToAccountId] = useState('');
  const [transferAmountFrom, setTransferAmountFrom] = useState('');
  const [transferAmountTo, setTransferAmountTo] = useState('');
  const [transferRate, setTransferRate] = useState('1');
  const [transferFeePercent, setTransferFeePercent] = useState('0');
  const [transferFeeAmount, setTransferFeeAmount] = useState('0');
  const [transferNote, setTransferNote] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);

  // Capital Operations State
  const [showCapitalOp, setShowCapitalOp] = useState({ type: null, account: null }); // type: 'add' | 'cashout'
  const [capitalOpAccountId, setCapitalOpAccountId] = useState('');
  const [capitalOpAmount, setCapitalOpAmount] = useState('');
  const [capitalOpNotes, setCapitalOpNotes] = useState('');
  const [capitalOpError, setCapitalOpError] = useState('');
  const [capitalOpSuccess, setCapitalOpSuccess] = useState(false);

  const openDeposit = (acc) => {
    setDepositAccount(acc);
    setDepositAmount('');
    setDepositNote('');
    setDepositError('');
    setDepositSuccess(false);
    setShowDeposit(true);
  };

  const openTransfer = (acc) => {
    setTransferFromAccount(acc);
    setTransferToAccountId('');
    setTransferAmountFrom('');
    setTransferAmountTo('');
    setTransferRate('1');
    setTransferFeePercent('0');
    setTransferFeeAmount('0');
    setTransferNote('');
    setTransferError('');
    setTransferSuccess(false);
    setShowTransfer(true);
  };

  const handleDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) {
      setDepositError('Enter a valid amount');
      return;
    }
    createAdjustment.mutate({
      accountId: depositAccount.id,
      direction: 'credit',
      amount: amt,
      notes: depositNote || 'Deposit to account',
      executedBy: 'admin'
    }, {
      onSuccess: () => {
        setDepositSuccess(true);
        setTimeout(() => {
          setShowDeposit(false);
          setDepositSuccess(false);
        }, 1500);
      },
      onError: (err) => {
        setDepositError(err.message || 'Deposit failed');
      }
    });
  };

  const transferTargets = useMemo(() => {
    if (!transferFromAccount) return [];
    return accounts.filter((acc) => acc.id !== transferFromAccount.id && acc.isActive);
  }, [accounts, transferFromAccount]);

  const selectedTransferTo = transferTargets.find((acc) => acc.id === transferToAccountId) || null;
  const sameCurrencyTransfer = transferFromAccount && selectedTransferTo && transferFromAccount.currency === selectedTransferTo.currency;

  const recalcTransferAmountTo = (amountFromValue, rateValue, feeValue) => {
    const amountFrom = parseFloat(amountFromValue) || 0;
    const rate = parseFloat(rateValue) || 0;
    const feeAmount = parseFloat(feeValue) || 0;
    if (amountFrom <= 0) {
      setTransferAmountTo('');
      return;
    }
    const gross = sameCurrencyTransfer ? amountFrom : amountFrom * rate;
    const net = Math.max(0, gross - feeAmount);
    setTransferAmountTo(net ? net.toFixed(2) : '0');
  };

  const handleTransferAmountFromChange = (value) => {
    setTransferAmountFrom(value);
    const amountFrom = parseFloat(value) || 0;
    const feePercent = parseFloat(transferFeePercent) || 0;
    const nextFeeAmount = amountFrom > 0 ? ((sameCurrencyTransfer ? amountFrom : amountFrom * (parseFloat(transferRate) || 0)) * feePercent / 100) : 0;
    setTransferFeeAmount(nextFeeAmount ? nextFeeAmount.toFixed(2) : '0');
    recalcTransferAmountTo(value, transferRate, nextFeeAmount);
    setTransferError('');
  };

  const handleTransferTargetChange = (value) => {
    setTransferToAccountId(value);
    const nextTarget = transferTargets.find((acc) => acc.id === value);
    if (transferFromAccount && nextTarget && transferFromAccount.currency === nextTarget.currency) {
      setTransferRate('1');
    }
    recalcTransferAmountTo(transferAmountFrom, transferFromAccount && nextTarget && transferFromAccount.currency === nextTarget.currency ? '1' : transferRate, transferFeeAmount);
    setTransferError('');
  };

  const handleTransferRateChange = (value) => {
    setTransferRate(value);
    const amountFrom = parseFloat(transferAmountFrom) || 0;
    const feePercent = parseFloat(transferFeePercent) || 0;
    const basis = sameCurrencyTransfer ? amountFrom : amountFrom * (parseFloat(value) || 0);
    const nextFeeAmount = basis > 0 ? (basis * feePercent / 100) : 0;
    setTransferFeeAmount(nextFeeAmount ? nextFeeAmount.toFixed(2) : '0');
    recalcTransferAmountTo(transferAmountFrom, value, nextFeeAmount);
    setTransferError('');
  };

  const handleTransferFeePercentChange = (value) => {
    setTransferFeePercent(value);
    const amountFrom = parseFloat(transferAmountFrom) || 0;
    const rate = parseFloat(transferRate) || 0;
    const basis = sameCurrencyTransfer ? amountFrom : amountFrom * rate;
    const nextFeeAmount = basis > 0 ? (basis * ((parseFloat(value) || 0) / 100)) : 0;
    setTransferFeeAmount(nextFeeAmount ? nextFeeAmount.toFixed(2) : '0');
    recalcTransferAmountTo(transferAmountFrom, transferRate, nextFeeAmount);
    setTransferError('');
  };

  const handleTransferFeeAmountChange = (value) => {
    setTransferFeeAmount(value);
    recalcTransferAmountTo(transferAmountFrom, transferRate, value);
    setTransferError('');
  };

  const handleTransfer = () => {
    const amountFrom = parseFloat(transferAmountFrom);
    const amountTo = parseFloat(transferAmountTo);
    const rate = parseFloat(transferRate);
    const feePercent = parseFloat(transferFeePercent) || 0;
    const feeAmount = parseFloat(transferFeeAmount) || 0;

    if (!transferFromAccount) {
      setTransferError('Select a source account');
      return;
    }
    if (!transferToAccountId) {
      setTransferError('Select a destination account');
      return;
    }
    if (!amountFrom || amountFrom <= 0) {
      setTransferError('Enter a valid amount to transfer');
      return;
    }
    if (amountFrom > transferFromAccount.balance) {
      setTransferError('Insufficient balance in source account');
      return;
    }
    if (!amountTo || amountTo <= 0) {
      setTransferError('Enter a valid amount to receive');
      return;
    }
    if (!sameCurrencyTransfer && (!rate || rate <= 0)) {
      setTransferError('Enter a valid transfer rate');
      return;
    }
    if (feePercent < 0 || feeAmount < 0) {
      setTransferError('Fee values cannot be negative');
      return;
    }

    createTransfer.mutate({
      fromAccountId: transferFromAccount.id,
      toAccountId: transferToAccountId,
      amountFrom,
      amountTo,
      rate: sameCurrencyTransfer ? 1 : rate,
      feePercent,
      feeAmount,
      notes: transferNote || `Transfer from ${transferFromAccount.accountName}`,
      executedBy: 'admin',
    }, {
      onSuccess: () => {
        setTransferSuccess(true);
        setTimeout(() => {
          setShowTransfer(false);
          setTransferSuccess(false);
        }, 1500);
      },
      onError: (err) => {
        setTransferError(err.message || 'Transfer failed');
      },
    });
  };

  // Capital Operations Handlers
  const openCapitalOp = (type, acc) => {
    setShowCapitalOp({ type, account: acc });
    setCapitalOpAccountId(acc?.id || '');
    setCapitalOpAmount('');
    setCapitalOpNotes('');
    setCapitalOpError('');
    setCapitalOpSuccess(false);
  };

  const handleCapitalOp = async () => {
    const amount = parseFloat(capitalOpAmount);
    const isAdd = showCapitalOp.type === 'add';
    const selectedAcc = accounts.find(a => a.id === capitalOpAccountId);
    const currency = selectedAcc?.currency || 'USD';
    
    if (!capitalOpAccountId) {
      setCapitalOpError('Select an account');
      return;
    }
    if (!amount || amount <= 0) {
      setCapitalOpError('Enter a valid amount');
      return;
    }

    // For cashout, check balance
    if (!isAdd) {
      const acc = accounts.find(a => a.id === capitalOpAccountId);
      if (acc && acc.balance < amount) {
        setCapitalOpError('Insufficient balance');
        return;
      }
    }

    try {
      // First, do the account adjustment
      await new Promise((resolve, reject) => {
        createAdjustment.mutate({
          accountId: capitalOpAccountId,
          amount: amount,
          adjustmentDirection: isAdd ? 'credit' : 'debit',
          notes: capitalOpNotes || (isAdd ? 'Capital Added' : 'Capital Cashout'),
        }, {
          onSuccess: (data) => { resolve(data); },
          onError: (err) => { reject(err); }
        });
      });

      // Then update capital balance
      const { error: capitalError } = await window.supabase.rpc('manage_capital', {
        p_currency: currency,
        p_amount: amount,
        p_action: isAdd ? 'add' : 'cashout'
      });

      if (capitalError) throw capitalError;

      setCapitalOpSuccess(true);
      setTimeout(() => {
        setShowCapitalOp({ type: null, account: null });
        setCapitalOpSuccess(false);
      }, 1500);

    } catch (err) {
      setCapitalOpError(err.message || 'Operation failed');
    }
  };

  const filteredAccounts = accounts.filter(a => typeFilter === 'all' || a.accountType === typeFilter);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
    setModal(true);
  };

  const openEdit = (acc) => {
    setForm({
      accountName: acc.accountName,
      accountType: acc.accountType,
      currency: acc.currency,
      balance: acc.balance.toString(),
      institutionName: acc.institutionName,
      accountNumber: acc.accountNumber,
      iban: acc.iban,
      binanceEmail: acc.binanceEmail,
      notes: acc.notes,
    });
    setEditingId(acc.id);
    setErrors({});
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const handleSave = () => {
    const e = {};
    if (!form.accountName.trim()) e.accountName = 'Account name is required';
    if (!form.accountType) e.accountType = 'Select type';
    if (!form.currency) e.currency = 'Select currency';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const payload = { ...form, balance: parseFloat(form.balance || 0) };

    if (editingId) {
      updateAccount.mutate({ id: editingId, changes: payload }, { onSuccess: closeModal });
    } else {
      addAccount.mutate(payload, { onSuccess: closeModal });
    }
  };

  const toggleActive = (acc) => {
    updateAccount.mutate({ id: acc.id, changes: { isActive: !acc.isActive } });
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="page-title">Treasury Accounts</div>
          <div className="page-sub">Manage your physical and digital liquidity pools.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => setShowTransfer(true)} disabled={accounts.length < 2}>
            <ArrowRightLeft size={14} /> Transfer
          </button>
          <button className="btn" style={{ background: 'var(--green-50)', color: 'var(--green-700)', border: '1px solid var(--green-200)' }} onClick={() => setShowCapitalOp({ type: 'add', account: null })}>
            <Plus size={14} /> Add Capital
          </button>
          <button className="btn" style={{ background: 'var(--red-50)', color: 'var(--red-700)', border: '1px solid var(--red-200)' }} onClick={() => setShowCapitalOp({ type: 'cashout', account: null })}>
            <ArrowDownCircle size={14} /> Cashout
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={14} /> New Account
          </button>
        </div>
      </div>

      {/* Capital Overview */}
      <div style={{ marginBottom: 24, padding: 20, background: 'var(--bg-muted)', borderRadius: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Capital Overview</div>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
          {CURRENCIES.map(curr => {
            const capital = capitalBalances.find(c => c.currency === curr);
            const s = summary.find(it => it.currency === curr);
            const currentBalance = s?.total_balance || 0;
            const capitalAmount = capital?.total_units || 0;
            const profit = currentBalance - capitalAmount;
            const isProfit = profit >= 0;
            
            return (
              <div key={curr} style={{ minWidth: 200, flex: 1, background: '#fff', padding: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>{curr}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Capital</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{capitalAmount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Balance</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{currentBalance.toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Unrealized P&L</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: isProfit ? 'var(--green-600)' : 'var(--red-600)' }}>
                    {isProfit ? '+' : ''}{profit.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Balance Summaries */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {CURRENCIES.map(curr => {
          const s = summary.find(it => it.currency === curr);
          const capital = capitalBalances.find(c => c.currency === curr);
          const cls = curr === 'LYD' ? 'si-blue' : curr === 'USD' ? 'si-green' : 'si-purple';
          return (
            <div className="stat-card" key={curr}>
              <div className="stat-icon-row">
                <div className={`stat-icon ${cls}`}><DollarSign size={20} /></div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{curr} TOTAL</div>
              </div>
              <div className="stat-value">
                {s ? s.total_balance.toLocaleString(undefined, { minimumFractionDigits: curr === 'LYD' ? 0 : 2 }) : '0'} 
                <span style={{ fontSize: 14, marginLeft: 6, opacity: 0.6 }}>{curr}</span>
              </div>
              <div className="stat-label">{s ? `${s.account_count} account(s)` : '0 accounts'}</div>
              
              {capital && capital.total_units > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 11 }}>
                  <div style={{ color: 'var(--text-muted)' }}>Avg Cost: <span style={{ fontWeight: 700, color: 'var(--blue-600)' }}>{capital.avg_cost_basis?.toFixed(4)}</span></div>
                  <div style={{ color: 'var(--text-muted)' }}>Capital: <span style={{ fontWeight: 700 }}>{capital.total_units?.toLocaleString()}</span></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div className="period-tabs">
          {['all', ...CURRENCIES].map(c => (
            <button key={c} className={`period-tab${currencyFilter === c ? ' active' : ''}`} onClick={() => setCurrencyFilter(c)}>
              {c.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <select className="input input-sm" style={{ width: 160 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Accounts List */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Details</th>
              <th>Type</th>
              <th className="right">Current Balance</th>
              <th className="center">Status</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="center" style={{ padding: 40, color: 'var(--text-muted)' }}>Loading accounts...</td></tr>
            ) : filteredAccounts.length === 0 ? (
              <tr><td colSpan={5} className="center" style={{ padding: 60 }}>
                <div className="empty-state">
                  <div className="empty-icon"><Briefcase size={32} /></div>
                  <div className="empty-title">No treasury accounts found</div>
                  <div className="empty-sub">Add your first account to start tracking balances.</div>
                </div>
              </td></tr>
            ) : (
              filteredAccounts.map(acc => (
                <tr key={acc.id} style={{ opacity: acc.isActive ? 1 : 0.6 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 10, height: 10, borderRadius: '50%', 
                        background: acc.currency === 'LYD' ? 'var(--blue-500)' : acc.currency === 'USD' ? 'var(--green-500)' : 'var(--purple-500)' 
                      }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{acc.accountName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc.institutionName || acc.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                      {ACCOUNT_TYPES.find(t => t.value === acc.accountType)?.icon}
                      {ACCOUNT_TYPES.find(t => t.value === acc.accountType)?.label}
                    </div>
                  </td>
                  <td className="right">
                    <div style={{ fontWeight: 800, fontSize: 15 }}>
                      {acc.balance.toLocaleString(undefined, { minimumFractionDigits: acc.currency === 'LYD' ? 0 : 2 })}
                      <span style={{ fontSize: 11, marginLeft: 4, fontWeight: 600, color: 'var(--text-muted)' }}>{acc.currency}</span>
                    </div>
                  </td>
                  <td className="center">
                    <span className={`badge badge-${acc.isActive ? 'completed' : 'rejected'}`}>
                      <span className={`dot dot-${acc.isActive ? 'completed' : 'rejected'}`} />
                      {acc.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="right">
                    <div className="table-actions">
                      <button className="btn-icon" title="Add Funds" onClick={() => openDeposit(acc)} style={{ background: 'var(--green-50)', color: 'var(--green-600)' }}>
                        <ArrowDownCircle size={14} />
                      </button>
                      <button className="btn-icon" title="Transfer Out" onClick={() => openTransfer(acc)} style={{ background: 'var(--blue-50)', color: 'var(--blue-600)' }}>
                        <ArrowRightLeft size={14} />
                      </button>
                      <button className="btn-icon" title="Edit Account" onClick={() => openEdit(acc)}><Edit2 size={14} /></button>
                      <button className="btn-icon" title={acc.isActive ? "Disable" : "Enable"} onClick={() => toggleActive(acc)}>
                        <Power size={14} color={acc.isActive ? 'var(--red-500)' : 'var(--green-500)'} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDeposit && depositAccount && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" style={{ maxWidth: 400 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="modal-header">
                <div className="modal-title">Add Funds to {depositAccount.accountName}</div>
                <button className="btn-icon" onClick={() => setShowDeposit(false)}><X size={18} /></button>
              </div>

              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: '12px 16px', background: 'var(--green-50)', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Current Balance</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green-700)' }}>
                    {depositAccount.balance.toLocaleString()} {depositAccount.currency}
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Amount to Add</label>
                  <input
                    type="number"
                    className={`input input-lg${depositError ? ' error' : ''}`}
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => { setDepositAmount(e.target.value); setDepositError(''); }}
                    autoFocus
                  />
                  {depositError && <div className="field-error"><AlertCircle size={12} />{depositError}</div>}
                </div>

                <div className="field">
                  <label className="field-label">Note (optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Cash deposit, Bank transfer..."
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                  />
                </div>

                {depositSuccess && (
                  <div className="alert alert-success">
                    <Check size={16} /> Funds added successfully!
                  </div>
                )}

                {depositAmount && parseFloat(depositAmount) > 0 && (
                  <div style={{ padding: '12px 16px', background: 'var(--bg-muted)', borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>New Balance</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>
                      {(depositAccount.balance + parseFloat(depositAmount)).toLocaleString()} {depositAccount.currency}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions" style={{ marginTop: 24 }}>
                <button className="btn btn-outline" onClick={() => setShowDeposit(false)}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleDeposit}
                  disabled={createAdjustment.isPending || depositSuccess}
                >
                  {createAdjustment.isPending ? 'Adding...' : 'Add Funds'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTransfer && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" style={{ maxWidth: 460 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="modal-header">
                <div className="modal-title">Transfer Between Accounts</div>
                <button className="btn-icon" onClick={() => setShowTransfer(false)}><X size={18} /></button>
              </div>

              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field">
                  <label className="field-label">From Account</label>
                  <select className="input" value={transferFromAccount?.id || ''} onChange={(e) => openTransfer(accounts.find((acc) => acc.id === e.target.value) || null)}>
                    <option value="">Select source account...</option>
                    {accounts.length === 0 ? <option disabled>No active accounts found</option> : accounts.filter((acc) => acc.isActive).map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.accountName} - {acc.balance.toLocaleString()} {acc.currency}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="field-label">To Account</label>
                  <select className="input" value={transferToAccountId} onChange={(e) => handleTransferTargetChange(e.target.value)} disabled={!transferFromAccount}>
                    <option value="">Select destination account...</option>
                    {transferTargets.length === 0 ? <option disabled>Select source account first</option> : transferTargets.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.accountName} - {acc.balance.toLocaleString()} {acc.currency}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="field">
                    <label className="field-label">Amount Out</label>
                    <input type="number" className={`input${transferError ? ' error' : ''}`} placeholder="0.00" value={transferAmountFrom} onChange={(e) => handleTransferAmountFromChange(e.target.value)} />
                    {transferFromAccount && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{transferFromAccount.currency}</div>}
                  </div>
                  <div className="field">
                    <label className="field-label">Amount In</label>
                    <input type="number" className={`input${transferError ? ' error' : ''}`} placeholder="0.00" value={transferAmountTo} onChange={(e) => { setTransferAmountTo(e.target.value); setTransferError(''); }} disabled={!!sameCurrencyTransfer} />
                    {selectedTransferTo && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{selectedTransferTo.currency}</div>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div className="field">
                    <label className="field-label">Rate</label>
                    <input type="number" step="0.0001" className="input" placeholder="1.0000" value={transferRate} onChange={(e) => handleTransferRateChange(e.target.value)} disabled={!!sameCurrencyTransfer} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{sameCurrencyTransfer ? 'Same currency: fixed at 1' : 'Destination per source'}</div>
                  </div>
                  <div className="field">
                    <label className="field-label">Fee %</label>
                    <input type="number" step="0.01" className="input" placeholder="0.00" value={transferFeePercent} onChange={(e) => handleTransferFeePercentChange(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="field-label">Fee Amount</label>
                    <input type="number" step="0.01" className="input" placeholder="0.00" value={transferFeeAmount} onChange={(e) => handleTransferFeeAmountChange(e.target.value)} />
                    {selectedTransferTo && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{selectedTransferTo.currency}</div>}
                  </div>
                </div>

                {sameCurrencyTransfer && (
                  <div style={{ padding: '12px 16px', background: 'var(--bg-muted)', borderRadius: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    Same currency transfer: amount in is amount out minus any fee.
                  </div>
                )}

                {transferAmountFrom && transferAmountTo && parseFloat(transferAmountFrom) > 0 && parseFloat(transferAmountTo) > 0 && (
                  <div style={{ padding: '12px 16px', background: 'var(--bg-muted)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Rate</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{(parseFloat(transferRate) || 0).toFixed(4)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Fee</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{(parseFloat(transferFeeAmount) || 0).toFixed(2)} {selectedTransferTo?.currency || ''}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Net In</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{(parseFloat(transferAmountTo) || 0).toFixed(2)} {selectedTransferTo?.currency || ''}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="field">
                  <label className="field-label">Note (optional)</label>
                  <input type="text" className="input" placeholder="Internal transfer note..." value={transferNote} onChange={(e) => setTransferNote(e.target.value)} />
                </div>

                {transferError && <div className="field-error"><AlertCircle size={12} />{transferError}</div>}

                {transferSuccess && (
                  <div className="alert alert-success">
                    <Check size={16} /> Transfer completed successfully!
                  </div>
                )}
              </div>

              <div className="modal-actions" style={{ marginTop: 24 }}>
                <button className="btn btn-outline" onClick={() => setShowTransfer(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleTransfer} disabled={createTransfer.isPending || transferSuccess}>
                  {createTransfer.isPending ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capital Operations Modal */}
      <AnimatePresence>
        {showCapitalOp.type && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && setShowCapitalOp({ type: null, account: null })}>
            <motion.div className="modal-card" style={{ maxWidth: 400 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="modal-header">
                <div className="modal-title" style={{ color: showCapitalOp.type === 'add' ? 'var(--green-700)' : 'var(--red-700)' }}>
                  {showCapitalOp.type === 'add' ? 'Add Capital' : 'Cashout Capital'}
                </div>
                <button className="btn-icon" onClick={() => setShowCapitalOp({ type: null, account: null })}><X size={18} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
                <div className="field">
                  <label className="field-label">Select Account</label>
                  <select className="input" value={capitalOpAccountId} onChange={(e) => setCapitalOpAccountId(e.target.value)}>
                    <option value="">Choose account...</option>
                    {filteredAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.accountName} ({a.balance.toLocaleString()} {a.currency})</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="field-label">Amount</label>
                  <input 
                    type="number" 
                    className={`input input-lg${capitalOpError ? ' error' : ''}`} 
                    placeholder="0.00" 
                    value={capitalOpAmount} 
                    onChange={(e) => { setCapitalOpAmount(e.target.value); setCapitalOpError(''); }} 
                  />
                </div>

                <div className="field">
                  <label className="field-label">Notes</label>
                  <input 
                    className="input" 
                    placeholder={showCapitalOp.type === 'add' ? "Initial capital, investment..." : "Profit withdrawal, expense..."} 
                    value={capitalOpNotes} 
                    onChange={(e) => setCapitalOpNotes(e.target.value)} 
                  />
                </div>

                {capitalOpError && (
                  <div className="field-error" style={{ padding: 10 }}><AlertCircle size={14} /> {capitalOpError}</div>
                )}

                {capitalOpSuccess && (
                  <div className="alert alert-success" style={{ padding: 12 }}><Check size={16} /> Operation completed!</div>
                )}

                <div className="modal-actions">
                  <button className="btn btn-outline" onClick={() => setShowCapitalOp({ type: null, account: null })}>Cancel</button>
                  <button 
                    className={`btn ${showCapitalOp.type === 'add' ? 'btn-success' : 'btn-primary'}`} 
                    style={{ background: showCapitalOp.type === 'add' ? 'var(--green-600)' : 'var(--red-600)' }}
                    onClick={handleCapitalOp} 
                    disabled={createAdjustment.isPending || capitalOpSuccess}
                  >
                    {createAdjustment.isPending ? 'Processing...' : (showCapitalOp.type === 'add' ? 'Confirm Capital Add' : 'Confirm Cashout')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" style={{ maxWidth: 500 }} initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="modal-header">
                <div className="modal-title">{editingId ? 'Edit Account' : 'New Treasury Account'}</div>
                <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
                <div className="field">
                  <label className="field-label">Official Account Name</label>
                  <input className={`input${errors.accountName ? ' error' : ''}`} placeholder="e.g. Main Cash Vault LYD" value={form.accountName} onChange={e => set('accountName', e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="field">
                    <label className="field-label">Account Type</label>
                    <select className="input" value={form.accountType} onChange={e => set('accountType', e.target.value)}>
                      {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Currency</label>
                    <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Institution / Bank Name</label>
                  <input className="input" placeholder="e.g. Jumhouria Bank" value={form.institutionName} onChange={e => set('institutionName', e.target.value)} />
                </div>

                {form.accountType === 'binance' ? (
                  <div className="field">
                    <label className="field-label">Binance Email</label>
                    <input className="input" placeholder="email@example.com" value={form.binanceEmail} onChange={e => set('binanceEmail', e.target.value)} />
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="field">
                      <label className="field-label">Account Number</label>
                      <input className="input" placeholder="..." value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="field-label">IBAN</label>
                      <input className="input" placeholder="LY..." value={form.iban} onChange={e => set('iban', e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="field">
                  <label className="field-label">Notes</label>
                  <textarea className="input textarea" placeholder="Internal notes..." rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 24 }}>
                <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={addAccount.isPending || updateAccount.isPending}>
                  {editingId ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Accounts;
