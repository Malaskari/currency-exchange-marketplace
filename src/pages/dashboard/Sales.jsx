import React, { useState, useMemo } from 'react';
import {
  Plus, Trash2, DollarSign, TrendingUp, 
  BarChart2, X, AlertCircle, CheckCircle2,
  Search, ArrowRightLeft, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSales, useAddSale, useDeleteSale } from '../../hooks/useSales';
import { useSettings } from '../../hooks/useSettings';
import { useAccounts } from '../../hooks/useAccounts';

const CURRENCIES = ['USD', 'LYD', 'USDT'];

const EMPTY_FORM = {
  direction: 'sell', // 'sell' = you sell currency (give from, get to), 'buy' = you buy currency
  fromCurrency: 'USD',
  toCurrency: 'LYD',
  fromAccountId: '',
  toAccountId: '',
  amount: '',
  rate: '',
  feePercent: '0',
  notes: '',
};

const Sales = () => {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [search, setSearch] = useState('');

  const { data: salesData, isLoading } = useSales();
  const { data: settings } = useSettings();
  const { data: allAccounts = [] } = useAccounts();
  const addSale = useAddSale();
  const deleteSale = useDeleteSale();

  // Ensure data is an array
  const sales = useMemo(() => (salesData?.data || []).filter(Boolean), [salesData]);

  // Filter accounts based on selected currencies
  const fromAccounts = useMemo(() => {
    if (!form.fromCurrency) return [];
    return allAccounts.filter(a => a.currency === form.fromCurrency);
  }, [allAccounts, form.fromCurrency]);

  const toAccounts = useMemo(() => {
    if (!form.toCurrency) return [];
    return allAccounts.filter(a => a.currency === form.toCurrency);
  }, [allAccounts, form.toCurrency]);

  // Period filter state
  const [period, setPeriod] = useState('month');

  // Calculate period stats
  const periodStats = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0);
    
    if (period === 'day') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (period === 'week') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === 'month') startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    else if (period === 'year') startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const periodSales = sales.filter(s => new Date(s.timestamp) >= startDate);
    const totalGiven = periodSales.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalReceived = periodSales.reduce((sum, s) => sum + (s.receivedAmount || 0), 0);
    const avgRate = totalGiven > 0 ? totalReceived / totalGiven : 0;
    return { totalGiven, totalReceived, avgRate, count: periodSales.length };
  }, [sales, period]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  // Calculation
  const preview = useMemo(() => {
    const amount = parseFloat(form.amount) || 0;
    const feePct = parseFloat(form.feePercent) || 0;
    const rate = parseFloat(form.rate) || 0;
    
    const feeAmount = amount * (feePct / 100);
    const netAmount = amount - feeAmount;
    const receivedAmount = netAmount * rate;
    
    return { amount, feeAmount, netAmount, rate, receivedAmount };
  }, [form]);

  const stats = useMemo(() => {
    const totalUSD = sales.reduce((s, r) => s + (r.usdAmount || 0), 0);
    const totalRevenue = sales.reduce((s, r) => s + (r.receivedLYD || 0), 0);
    const totalCost = sales.reduce((s, r) => s + (r.usdAmount || 0) * (r.buyRate || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = sales.length > 0
      ? sales.reduce((s, r) => s + ((r.sellRate || 0) - (r.buyRate || 0)), 0) / sales.length
      : 0;
    return { totalUSD, totalRevenue, totalCost, totalProfit, avgMargin, count: sales.length };
  }, [sales]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sales;
    const q = search.toLowerCase();
    return sales.filter((s) => s.id.toLowerCase().includes(q) || (s.notes || '').toLowerCase().includes(q));
  }, [sales, search]);

  const openModal = () => {
    setForm({ 
      ...EMPTY_FORM, 
      rate: settings?.cashRate?.toString() || '4.85',
      feePercent: settings?.feePercent?.toString() || '0'
    });
    setErrors({});
    setSaved(false);
    setModal(true);
  };

  const closeModal = () => { setModal(false); setForm(EMPTY_FORM); setErrors({}); setSaved(false); };

  const submit = () => {
    const e = {};
    const amount = parseFloat(form.amount);
    const rate = parseFloat(form.rate);
    
    if (!form.amount || isNaN(amount) || amount <= 0) e.amount = 'Enter a valid amount';
    if (!form.fromAccountId) e.fromAccountId = 'Select source account';
    if (!form.toAccountId) e.toAccountId = 'Select destination account';
    if (!form.rate || isNaN(rate) || rate <= 0) e.rate = 'Enter exchange rate';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const fromAcc = allAccounts.find(a => a.id === form.fromAccountId);
    const toAcc = allAccounts.find(a => a.id === form.toAccountId);

    addSale.mutate({ 
      amount: amount, 
      rate: rate,
      sourceCurrency: fromAcc?.currency || form.fromCurrency,
      sourceAccountId: form.fromAccountId,
      sourceAccountType: fromAcc?.accountType || 'cash',
      destinationCurrency: toAcc?.currency || form.toCurrency,
      destinationAccountId: form.toAccountId,
      destinationAccountType: toAcc?.accountType || 'bank',
      feePercent: parseFloat(form.feePercent) || 0,
      notes: form.notes 
    }, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => { setSaved(false); setModal(false); setForm(EMPTY_FORM); }, 2000);
      },
      onError: (err) => {
        setErrors({ submit: err.message || 'Exchange failed. Check balances and try again.' });
      }
    });
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="page-title">Currency Exchange</div>
          <div className="page-sub">Exchange currencies and track profits.</div>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <Plus size={16} /> New Exchange
        </button>
      </div>

      {/* Period Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['day', 'week', 'month', 'year', 'all'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: period === p ? 'var(--blue-50)' : '#fff',
              color: period === p ? 'var(--blue-700)' : 'var(--text-muted)',
              fontWeight: period === p ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <motion.div className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="stat-icon si-blue"><DollarSign size={20} /></div>
          <div className="stat-value">{(periodStats.totalGiven || 0).toLocaleString()}</div>
          <div className="stat-label">Total Given ({period})</div>
        </motion.div>
        <motion.div className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="stat-icon si-green"><TrendingUp size={20} /></div>
          <div className="stat-value">{(periodStats.totalReceived || 0).toLocaleString()}</div>
          <div className="stat-label">Total Received ({period})</div>
        </motion.div>
        <motion.div className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="stat-icon" style={{ background: (periodStats.totalReceived - periodStats.totalGiven) >= 0 ? 'var(--green-100)' : 'var(--red-100)', color: (periodStats.totalReceived - periodStats.totalGiven) >= 0 ? 'var(--green-700)' : 'var(--red-700)' }}>
            {(periodStats.totalReceived - periodStats.totalGiven) >= 0 ? <TrendingUp size={20} /> : <BarChart2 size={20} />}
          </div>
          <div className="stat-value" style={{ color: (periodStats.totalReceived - periodStats.totalGiven) >= 0 ? 'var(--green-700)' : 'var(--red-700)' }}>
            {(periodStats.totalReceived - periodStats.totalGiven).toLocaleString()}
          </div>
          <div className="stat-label">Net P&L ({period})</div>
        </motion.div>
        <motion.div className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="stat-icon si-purple"><BarChart2 size={20} /></div>
          <div className="stat-value">{(periodStats.avgRate || 0).toFixed(4)}</div>
          <div className="stat-label">Avg Rate ({period})</div>
        </motion.div>
      </div>

      {/* Search & Table */}
      <div style={{ marginTop: 24 }}>
        <div className="table-heading">
          <div className="search-wrap">
            <Search size={15} className="search-icon" />
            <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} records</span>
        </div>

        <div className="table-wrap">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th className="right">You Give</th>
                  <th className="right">Rate</th>
                  <th className="right">You Get</th>
                  <th className="right">Value (USD)</th>
                  <th className="right">Profit</th>
                  <th className="right">Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-icon"><DollarSign size={28} /></div>
                        <div className="empty-title">No exchanges yet</div>
                        <div className="empty-sub">Click "New Exchange" to start.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => {
                    const fromCurr = s.sourceCurrency || 'USD';
                    const toCurr = s.destinationCurrency || 'LYD';
                    return (
                      <tr key={s.id}>
                        <td>
                          <code style={{ fontSize: 12, background: 'var(--bg-muted)', padding: '4px 8px', borderRadius: 6 }}>{s.id}</code>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            {s.timestamp ? new Date(s.timestamp).toLocaleString() : '—'}
                          </div>
                        </td>
                        <td className="right">
                          <div style={{ fontWeight: 700, color: 'var(--blue-700)' }}>
                            {(s.amount || 0).toLocaleString()}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fromCurr}</div>
                        </td>
                        <td className="right">
                          <div style={{ fontWeight: 600 }}>{(s.rate || 0).toFixed(4)}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fromCurr}/{toCurr}</div>
                        </td>
                        <td className="right">
                          <div style={{ fontWeight: 700, color: 'var(--green-700)' }}>
                            {(s.receivedAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{toCurr}</div>
                        </td>
                        <td className="right">
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            ${((s.receivedAmount || 0) / (s.rate || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>USD</div>
                        </td>
                        <td className="right">
                          {(() => {
                            const profit = s.realizedProfitUsd || 0;
                            const isProfit = profit >= 0;
                            return (
                              <div style={{ fontWeight: 700, color: isProfit ? 'var(--green-600)' : 'var(--red-600)' }}>
                                {isProfit ? '+' : ''}{profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </div>
                            );
                          })()}
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>USD</div>
                        </td>
                        <td className="right">
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: 12, 
                            fontSize: 11, 
                            fontWeight: 600,
                            background: s.status === 'completed' ? 'var(--green-50)' : 'var(--amber-50)',
                            color: s.status === 'completed' ? 'var(--green-700)' : 'var(--amber-700)'
                          }}>
                            {s.status === 'completed' ? 'DONE' : 'PENDING'}
                          </span>
                        </td>
                        <td className="right">
                          <button className="btn-icon" title="Delete" style={{ background: 'var(--red-50)', color: 'var(--red-600)' }} onClick={() => setRemoving(s.id)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

{/* Add Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && closeModal()} style={{ overflowX: 'hidden', alignItems: 'center', padding: 20 }}>
            <motion.div className="modal-card" style={{ maxWidth: 400, width: '100%', maxHeight: '100vh', overflowY: 'auto', margin: 0 }} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div className="modal-title" style={{ fontSize: 18 }}>Currency Exchange</div>
                <button className="btn-icon" onClick={closeModal}><X size={16} /></button>
              </div>

              {saved ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alert alert-success" style={{ justifyContent: 'center', padding: '32px', fontSize: 18, fontWeight: 700 }}>
                  <CheckCircle2 size={28} /> Exchange Complete!
                </motion.div>
              ) : (
                <>
                  {/* Currency Selection */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, background: 'var(--bg-muted)', padding: 8, borderRadius: 8 }}>
                    {CURRENCIES.map(c => (
                      <button 
                        key={c}
                        onClick={() => set('fromCurrency', c)}
                        style={{ 
                          flex: 1, 
                          padding: '8px', 
                          borderRadius: 6, 
                          border: form.fromCurrency === c ? '2px solid var(--blue-600)' : '1px solid var(--border)',
                          background: form.fromCurrency === c ? 'var(--blue-50)' : '#fff',
                          fontWeight: 700,
                          fontSize: 13,
                          color: form.fromCurrency === c ? 'var(--blue-700)' : 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  {/* From Account */}
                  <div className="field">
                    <label className="field-label">You Give (From Account)</label>
                    <select className="input" value={form.fromAccountId} onChange={(e) => set('fromAccountId', e.target.value)}>
                      <option value="">Select Account...</option>
                      {fromAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.accountName} - {a.balance.toLocaleString()} {a.currency}</option>
                      ))}
                    </select>
                    {errors.fromAccountId && <div className="field-error"><AlertCircle size={12} />{errors.fromAccountId}</div>}
                  </div>

                  {/* To Currency */}
                  <div style={{ marginBottom: 12 }}>
                    <label className="field-label">You Get (Currency)</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {CURRENCIES.map(c => (
                        <button 
                          key={c}
                          onClick={() => set('toCurrency', c)}
                          disabled={c === form.fromCurrency}
                          style={{ 
                            flex: 1, 
                            padding: '8px', 
                            borderRadius: 6, 
                            border: form.toCurrency === c ? '2px solid var(--green-600)' : '1px solid var(--border)',
                            background: form.toCurrency === c ? 'var(--green-50)' : '#fff',
                            fontWeight: 700,
                            fontSize: 13,
                            color: c === form.fromCurrency ? 'var(--text-muted)' : (form.toCurrency === c ? 'var(--green-700)' : 'var(--text-muted)'),
                            cursor: c === form.fromCurrency ? 'not-allowed' : 'pointer',
                            opacity: c === form.fromCurrency ? 0.5 : 1
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* To Account */}
                  <div className="field">
                    <label className="field-label">You Receive (To Account)</label>
                    <select className="input" value={form.toAccountId} onChange={(e) => set('toAccountId', e.target.value)}>
                      <option value="">Select Account...</option>
                      {toAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.accountName} - {a.balance.toLocaleString()} {a.currency}</option>
                      ))}
                    </select>
                    {errors.toAccountId && <div className="field-error"><AlertCircle size={12} />{errors.toAccountId}</div>}
                  </div>

                  {/* Amount */}
                  <div className="field">
                    <label className="field-label">Amount <span style={{ color: 'var(--red-600)' }}>*</span></label>
                    <input 
                      type="number" 
                      step="any" 
                      min="0" 
                      className={`input${errors.amount ? ' error' : ''}`} 
                      placeholder={`0.00 ${form.fromCurrency}`} 
                      value={form.amount} 
                      onChange={(e) => set('amount', e.target.value)} 
                    />
                    {errors.amount && <div className="field-error"><AlertCircle size={12} />{errors.amount}</div>}
                  </div>

                  {errors.submit && (
                    <div className="field-error" style={{ padding: 12, background: 'var(--red-50)', borderRadius: 8, marginBottom: 12 }}>
                      <AlertCircle size={14} /> {errors.submit}
                    </div>
                  )}

                  {/* Calculator Preview */}
                  {preview.amount > 0 && preview.rate > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label className="field-label">Rate <span style={{ color: 'var(--red-600)' }}>*</span></label>
                          <input 
                            type="number" 
                            step="0.0001" 
                            className={`input${errors.rate ? ' error' : ''}`} 
                            placeholder="0.0000" 
                            value={form.rate} 
                            onChange={(e) => set('rate', e.target.value)} 
                          />
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            1 {form.fromCurrency} = {form.rate || '?'} {form.toCurrency}
                          </div>
                          {errors.rate && <div className="field-error"><AlertCircle size={12} />{errors.rate}</div>}
                        </div>
                      </div>
                      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} style={{ minWidth: 120, padding: 12, background: 'var(--green-50)', borderRadius: 8, border: '1px solid var(--green-100)', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--green-700)', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>Receive</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--green-700)', lineHeight: 1.2 }}>
                          {preview.receivedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--green-600)', fontWeight: 600, marginTop: 2 }}>{form.toCurrency}</div>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="field">
                      <label className="field-label">Rate <span style={{ color: 'var(--red-600)' }}>*</span></label>
                      <input 
                        type="number" 
                        step="0.0001" 
                        className={`input${errors.rate ? ' error' : ''}`} 
                        placeholder="0.0000" 
                        value={form.rate} 
                        onChange={(e) => set('rate', e.target.value)} 
                      />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        1 {form.fromCurrency} = {form.rate || '?'} {form.toCurrency}
                      </div>
                      {errors.rate && <div className="field-error"><AlertCircle size={12} />{errors.rate}</div>}
                    </div>
                  )}

                  {/* Notes & Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <input className="input" rows={1} placeholder="Notes (optional)" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline" style={{ flex: 1 }} onClick={closeModal}>Cancel</button>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={addSale.isPending}>
                        {addSale.isPending ? '...' : 'Exchange'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {removing && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" style={{ maxWidth: 360, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, background: 'var(--red-50)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--red-600)' }}>
                <Trash2 size={28} />
              </div>
              <div className="modal-title" style={{ fontSize: 18 }}>Delete Sale?</div>
              <div className="modal-actions" style={{ justifyContent: 'center', marginTop: 20 }}>
                <button className="btn btn-outline" onClick={() => setRemoving(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => { deleteSale.mutate(removing); setRemoving(null); }}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sales;
