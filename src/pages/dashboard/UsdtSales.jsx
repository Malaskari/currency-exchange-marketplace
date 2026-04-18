import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Check, X, AlertCircle, DollarSign, TrendingUp, TrendingDown, User, Phone, Wallet, MoreVertical, Search, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUsdtSales, useAddUsdtSale, useDeleteUsdtSale, useExecuteUsdtSale, useUsdtSaleStats } from '../../hooks/useUsdtSales';
import { useAccounts } from '../../hooks/useAccounts';
import { useApp } from '../../context/AppContext';
import { useSettings } from '../../hooks/useSettings';

const EMPTY_FORM = {
  customerName: '',
  customerPhone: '',
  customerIban: '',
  amountUsdt: '',
  rateUsed: '',
  binanceAccountId: '',
  bankAccountId: '',
  notes: '',
};

const UsdtSales = () => {
  const { user } = useApp();
  const { data: salesData, isLoading } = useUsdtSales({ page: 0 });
  const { data: stats } = useUsdtSaleStats();
  const { data: usdtAccounts = [] } = useAccounts({ currency: 'USDT' });
  const { data: lydAccounts = [] } = useAccounts({ currency: 'LYD' });
  const { data: settings = {} } = useSettings();
  const addSale = useAddUsdtSale();
  const deleteSale = useDeleteUsdtSale();
  const executeSale = useExecuteUsdtSale();

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleting, setDeleting] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleExecute = (s) => {
    if (!s.binanceAccountId || !s.bankAccountId) {
      alert('Please specify source USDT account and destination LYD account in Edit first.');
      return;
    }
    executeSale.mutate({
      saleId: s.id,
      sourceUsdtAccountId: s.binanceAccountId,
      destinationLydAccountId: s.bankAccountId,
      amountUsdt: s.amountUsdt,
      rateUsed: s.rateUsed,
      notes: s.notes,
      executedBy: user?.username || 'admin'
    });
  };

  const sales = salesData?.data || [];

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const usdtSellRate = settings.usdtSellRate || 4.85;

  const calculatedLyd = useMemo(() => {
    const usdt = parseFloat(form.amountUsdt) || 0;
    const rate = parseFloat(form.rateUsed) || usdtSellRate;
    return usdt * rate;
  }, [form.amountUsdt, form.rateUsed, usdtSellRate]);

  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      rateUsed: usdtSellRate.toString(),
    });
    setErrors({});
    setSaved(false);
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setForm(EMPTY_FORM);
    setErrors({});
    setSaved(false);
  };

  const submit = () => {
    const e = {};
    if (!form.amountUsdt || isNaN(parseFloat(form.amountUsdt))) e.amountUsdt = 'Enter valid USDT amount';
    if (!form.rateUsed || isNaN(parseFloat(form.rateUsed))) e.rateUsed = 'Enter rate';
    if (!form.binanceAccountId) e.binanceAccountId = 'Select Binance account';
    if (!form.bankAccountId) e.bankAccountId = 'Select bank account';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const rate = parseFloat(form.rateUsed);
    const amountUsdt = parseFloat(form.amountUsdt);
    const amountLyd = amountUsdt * rate;

    addSale.mutate({
      customerName: form.customerName.trim() || null,
      customerPhone: form.customerPhone.trim() || null,
      customerIban: form.customerIban.trim() || null,
      amountUsdt,
      amountLyd,
      rateUsed: rate,
      binanceAccountId: form.binanceAccountId,
      bankAccountId: form.bankAccountId,
      notes: form.notes.trim() || null,
    }, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(closeModal, 1500);
      },
      onError: (err) => {
        alert('Error: ' + err.message);
      }
    });
  };

  const confirmDelete = (id) => {
    deleteSale.mutate(id, { onSuccess: () => setDeleting(null) });
  };

  const totalUsdtSold = stats?.totalUsdtSold || 0;
  const totalLydReceived = stats?.totalLydReceived || 0;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="page-title">USDT Sales</div>
          <div className="page-sub">Record USDT sales to customers.</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Record Sale
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <motion.div className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="stat-icon si-green"><TrendingUp size={20} /></div>
          <div className="stat-value">{totalUsdtSold.toLocaleString()} USDT</div>
          <div className="stat-label">Total USDT Sold</div>
        </motion.div>
        <motion.div className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="stat-icon si-blue"><DollarSign size={20} /></div>
          <div className="stat-value">{totalLydReceived.toLocaleString('en', { maximumFractionDigits: 0 })} LYD</div>
          <div className="stat-label">Total LYD Received</div>
        </motion.div>
        <motion.div className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="stat-icon si-amber"><TrendingDown size={20} /></div>
          <div className="stat-value">{settings.usdtSellRate || 4.85} LYD</div>
          <div className="stat-label">Current USDT Sell Rate</div>
        </motion.div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th className="right">USDT Sold</th>
                <th className="right">LYD Received</th>
                <th className="right">Rate</th>
                <th>From</th>
                <th>To</th>
                <th>Date</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <div className="empty-icon"><DollarSign size={28} /></div>
                      <div className="empty-title">No USDT sales</div>
                      <div className="empty-sub">Record your first USDT sale.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, background: 'var(--blue-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-600)' }}>
                          <User size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{s.customerName || 'Anonymous'}</div>
                          {s.customerIban && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.customerIban}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.customerPhone || '—'}</td>
                    <td className="right"><span style={{ fontWeight: 700, color: 'var(--green-600)' }}>{s.amountUsdt.toLocaleString()}</span></td>
                    <td className="right"><span style={{ fontWeight: 600 }}>{s.amountLyd.toLocaleString('en', { maximumFractionDigits: 0 })}</span></td>
                    <td className="right" style={{ fontSize: 13 }}>{s.rateUsed.toFixed(4)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.binanceAccountId ? 'Binance' : '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.bankAccountId ? 'Bank' : '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="right">
                      <div className="table-actions">
                        {s.status === 'pending' && (
                          <button className="btn-icon" title="Execute Sale" onClick={() => handleExecute(s)} style={{ background: 'var(--blue-50)', color: 'var(--blue-600)' }}>
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        <button className="btn-icon" title="Delete" onClick={() => setDeleting(s.id)} style={{ background: 'var(--red-50)', color: 'var(--red-600)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-count">{sales.length} sales recorded</span>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && closeModal()}>
            <motion.div className="modal-card" style={{ maxWidth: 520 }} initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div className="modal-title">Record USDT Sale</div>
                <button className="btn-icon" onClick={closeModal}><X size={16} /></button>
              </div>

              {saved ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="alert alert-success" style={{ justifyContent: 'center', padding: '24px', fontSize: 16, fontWeight: 700 }}>
                  <Check size={22} /> Sale recorded successfully!
                </motion.div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div className="field">
                        <label className="field-label">Customer Name</label>
                        <input type="text" className="input" placeholder="Name (optional)" value={form.customerName} onChange={(e) => set('customerName', e.target.value)} />
                      </div>
                      <div className="field">
                        <label className="field-label">Customer Phone</label>
                        <input type="tel" className="input" placeholder="Phone (optional)" value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} />
                      </div>
                    </div>

                    <div className="field">
                      <label className="field-label">Customer IBAN</label>
                      <input type="text" className="input" placeholder="LYD account for payment" value={form.customerIban} onChange={(e) => set('customerIban', e.target.value)} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div className="field">
                        <label className="field-label">Amount USDT <span style={{ color: 'var(--red-600)' }}>*</span></label>
                        <input type="number" step="0.01" className={`input${errors.amountUsdt ? ' error' : ''}`} placeholder="0.00" value={form.amountUsdt} onChange={(e) => set('amountUsdt', e.target.value)} />
                        {errors.amountUsdt && <div className="field-error"><AlertCircle size={12} />{errors.amountUsdt}</div>}
                      </div>
                      <div className="field">
                        <label className="field-label">Rate Used <span style={{ color: 'var(--red-600)' }}>*</span></label>
                        <input type="number" step="0.0001" className={`input${errors.rateUsed ? ' error' : ''}`} placeholder={usdtSellRate.toString()} value={form.rateUsed} onChange={(e) => set('rateUsed', e.target.value)} />
                        {errors.rateUsed && <div className="field-error"><AlertCircle size={12} />{errors.rateUsed}</div>}
                      </div>
                    </div>

                    {parseFloat(form.amountUsdt) > 0 && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', background: 'var(--green-600)', color: '#fff', textAlign: 'center' }}>
                        <div style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Pays</div>
                        <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{calculatedLyd.toLocaleString('en', { maximumFractionDigits: 0 })} LYD</div>
                      </motion.div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div className="field">
                        <label className="field-label">Source USDT Account</label>
                        <select className={`input${errors.binanceAccountId ? ' error' : ''}`} value={form.binanceAccountId} onChange={(e) => set('binanceAccountId', e.target.value)}>
                          <option value="">Select USDT Account...</option>
                          {usdtAccounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.accountName} ({acc.balance.toLocaleString()} USDT)</option>)}
                        </select>
                        {errors.binanceAccountId && <div className="field-error"><AlertCircle size={12} />{errors.binanceAccountId}</div>}
                      </div>
                      <div className="field">
                        <label className="field-label">Destination LYD Account</label>
                        <select className={`input${errors.bankAccountId ? ' error' : ''}`} value={form.bankAccountId} onChange={(e) => set('bankAccountId', e.target.value)}>
                          <option value="">Select LYD Account...</option>
                          {lydAccounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.accountName} (Bal: {acc.balance.toLocaleString()} LYD)</option>)}
                        </select>
                        {errors.bankAccountId && <div className="field-error"><AlertCircle size={12} />{errors.bankAccountId}</div>}
                      </div>
                    </div>

                    <div className="field">
                      <label className="field-label">Notes</label>
                      <textarea className="input textarea" placeholder="Optional notes..." rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
                    </div>
                  </div>

                  <div className="modal-actions" style={{ marginTop: 24 }}>
                    <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
                    <button className="btn btn-success" onClick={submit} disabled={addSale.isPending}>
                      <Check size={15} /> Record Sale
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleting && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" style={{ maxWidth: 360, textAlign: 'center' }} initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}>
              <div style={{ width: 56, height: 56, background: 'var(--red-50)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--red-600)' }}>
                <Trash2 size={28} />
              </div>
              <div className="modal-title" style={{ fontSize: 18 }}>Delete Sale?</div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8, marginBottom: 28 }}>This action cannot be undone.</p>
              <div className="modal-actions" style={{ justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={() => setDeleting(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => confirmDelete(deleting)}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UsdtSales;
