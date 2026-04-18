import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Check, X, AlertCircle, CreditCard, Package, TrendingUp, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCardPurchases, useAddCardPurchase, useDeleteCardPurchase, useExecuteUsdtPurchase, useCardPurchaseStats } from '../../hooks/useCardPurchases';
import { useAccounts } from '../../hooks/useAccounts';
import { useApp } from '../../context/AppContext';

const STATUSES = ['all', 'pending', 'loaded', 'redeemed', 'cancelled'];

const EMPTY_FORM = {
  amountUsd: '',
  feePercentage: '',
  purchaseDate: new Date().toISOString().split('T')[0],
  binanceAccountId: '',
  bankAccountId: '',
  notes: '',
};

const calculateEffectiveRate = (feePercentage) => {
  const fee = parseFloat(feePercentage) || 0;
  return Math.max(0, 1 - fee / 100);
};

const calculateUsdtFromUsd = (usd, feePercentage) => {
  const u = parseFloat(usd) || 0;
  const r = calculateEffectiveRate(feePercentage);
  return u * r;
};

const CardPurchases = () => {
  const { user } = useApp();
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const { data: result, isLoading } = useCardPurchases({ status, page });
  const { data: stats } = useCardPurchaseStats();
  const purchases = result?.data || [];
  const total = result?.total || 0;
  const { data: usdAccounts = [] } = useAccounts({ currency: 'USD' });
  const { data: usdtAccounts = [] } = useAccounts({ currency: 'USDT' });
  const binanceAccounts = usdtAccounts.filter(acc => acc.accountType === 'binance');
  
  // Find Vendor accounts (case-insensitive search for "vendor" in account name)
  const vendorAccounts = usdAccounts.filter(acc => 
    acc.accountName && acc.accountName.toLowerCase().includes('vendor')
  );
  const totalVendorBalance = vendorAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  const addPurchase = useAddCardPurchase();
  const deletePurchase = useDeleteCardPurchase();
  const executePurchase = useExecuteUsdtPurchase();

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleting, setDeleting] = useState(null);
  const [saved, setSaved] = useState(false);

  const previewUsdt = useMemo(() => calculateUsdtFromUsd(form.amountUsd, form.feePercentage), [form.amountUsd, form.feePercentage]);
  const previewFeeUsd = useMemo(() => {
    const usd = parseFloat(form.amountUsd) || 0;
    return Math.max(0, usd - previewUsdt);
  }, [form.amountUsd, previewUsdt]);

  const handleExecute = (p) => {
    setRedeemPurchase(p);
    setRedeemAccountId(p.binanceAccountId || '');
    setShowRedeem(true);
  };

  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemPurchase, setRedeemPurchase] = useState(null);
  const [redeemAccountId, setRedeemAccountId] = useState('');
  const [redeemError, setRedeemError] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const confirmRedeem = () => {
    if (!redeemPurchase) return;
    if (!redeemAccountId) { setRedeemError('Select Binance account to receive USDT'); return; }
    if (!redeemPurchase.bankAccountId) { setRedeemError('Source USD account missing on voucher'); return; }

    setRedeeming(true);
    executePurchase.mutate({
      purchaseId: redeemPurchase.id,
      sourceUsdAccountId: redeemPurchase.bankAccountId,
      destinationUsdtAccountId: redeemAccountId,
      amountUsd: redeemPurchase.amountUsd,
      amountUsdt: redeemPurchase.amountUsdt,
      purchaseRate: redeemPurchase.purchaseRate,
      notes: redeemPurchase.notes || '',
      executedBy: user?.username || 'admin',
      redeemedBy: user?.username || 'admin'
    }, {
      onSuccess: () => {
        setShowRedeem(false);
        setRedeemPurchase(null);
      },
      onError: (err) => {
        setRedeemError(err.message || 'Redeem failed');
        setRedeeming(false);
      }
    });
  };

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
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
    if (!form.amountUsd || isNaN(parseFloat(form.amountUsd))) e.amountUsd = 'Enter USD amount';
    if (form.feePercentage === '' || isNaN(parseFloat(form.feePercentage))) e.feePercentage = 'Enter fee percentage';
    if (!form.bankAccountId) e.bankAccountId = 'Select USD account';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    addPurchase.mutate({
      amountUsd: parseFloat(form.amountUsd),
      amountUsdt: previewUsdt,
      purchaseRate: calculateEffectiveRate(form.feePercentage),
      purchaseDate: form.purchaseDate,
      bankAccountId: form.bankAccountId || null,
      notes: form.notes.trim() || null,
      executedBy: user?.username || 'admin'
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
    deletePurchase.mutate(id, { onSuccess: () => setDeleting(null) });
  };

  const statusBadge = (s) => {
    const colors = {
      pending: { bg: 'var(--amber-100)', color: 'var(--amber-600)' },
      loaded: { bg: 'var(--blue-100)', color: 'var(--blue-600)' },
      redeemed: { bg: 'var(--green-100)', color: 'var(--green-600)' },
      cancelled: { bg: 'var(--red-100)', color: 'var(--red-600)' },
    };
    const c = colors[s] || { bg: 'var(--gray-100)', color: 'var(--gray-600)' };
    return <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: c.bg, color: c.color }}>{s}</span>;
  };

  const totalUsd = stats?.totalUsd || 0;
  const totalUsdt = stats?.totalUsdt || 0;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="page-title">Card Purchases</div>
          <div className="page-sub">Log voucher USD amounts, calculate net USDT after fees, then confirm redeem into a Binance account.</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Log Purchase
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}>
        <motion.div className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="stat-icon si-blue"><CreditCard size={20} /></div>
          <div className="stat-value">${totalUsd.toLocaleString()}</div>
          <div className="stat-label">Total USD Spent</div>
        </motion.div>
        <motion.div className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="stat-icon si-green"><TrendingUp size={20} /></div>
          <div className="stat-value">{totalUsdt.toLocaleString()} USDT</div>
          <div className="stat-label">Total USDT Received</div>
        </motion.div>
        <motion.div className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="stat-icon si-amber"><Package size={20} /></div>
          <div className="stat-value">{(stats?.loadedUsdt || 0).toLocaleString()} USDT</div>
          <div className="stat-label">Vouchers Holding</div>
        </motion.div>
        <motion.div className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="stat-icon si-purple"><TrendingUp size={20} /></div>
          <div className="stat-value">{stats?.loaded || 0}</div>
          <div className="stat-label">Vouchers Count</div>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs" style={{ marginBottom: 16 }}>
        {STATUSES.map((s) => (
          <button key={s} className={`filter-tab${status === s ? ' active' : ''}`} onClick={() => { setStatus(s); setPage(0); }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="right">Voucher USD</th>
                <th className="right">USDT After Fees</th>
                <th className="right">Fee %</th>
                <th>Date</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
                ) : purchases.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-icon"><CreditCard size={28} /></div>
                      <div className="empty-title">No card vouchers</div>
                      <div className="empty-sub">Log your first voucher purchase and redeem it to Binance.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="right"><span style={{ fontWeight: 600, color: 'var(--red-600)' }}>${p.amountUsd.toLocaleString()}</span></td>
                    <td className="right"><span style={{ fontWeight: 600, color: 'var(--green-600)' }}>{p.amountUsdt.toLocaleString()} USDT</span></td>
                    <td className="right">{((1 - (p.purchaseRate || 1)) * 100).toFixed(2)}%</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{new Date(p.purchaseDate).toLocaleDateString()}</td>
                    <td>{statusBadge(p.status)}</td>
                    <td className="right">
                      <div className="table-actions">
                        {(p.status === 'pending' || p.status === 'loaded') && (
                          <button className="btn btn-outline btn-sm" onClick={() => handleExecute(p)} style={{ borderColor: 'var(--blue-200)', color: 'var(--blue-700)' }}>
                            <CheckCircle2 size={14} /> {p.status === 'pending' ? 'Confirm Payment' : 'Redeem'}
                          </button>
                        )}
                        <button className="btn-icon" title="Delete" onClick={() => setDeleting(p.id)} style={{ background: 'var(--red-50)', color: 'var(--red-600)' }}>
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
          <span className="table-count">Showing {purchases.length} of {total} purchases</span>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && closeModal()}>
            <motion.div className="modal-card" style={{ maxWidth: 520 }} initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div className="modal-title">Log Card Purchase</div>
                <button className="btn-icon" onClick={closeModal}><X size={16} /></button>
              </div>

              {saved ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="alert alert-success" style={{ justifyContent: 'center', padding: '24px', fontSize: 16, fontWeight: 700 }}>
                  <Check size={22} /> Purchase logged successfully!
                </motion.div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div className="field">
                        <label className="field-label">Vendor Balance USD <span style={{ color: 'var(--red-600)' }}>*</span></label>
                        {vendorAccounts.length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--green-600)', marginBottom: 4, fontWeight: 600 }}>
                            Available: ${totalVendorBalance.toLocaleString()} USD
                            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                              ({vendorAccounts.length} vendor account(s))
                            </span>
                          </div>
                        )}
                        <input type="number" step="0.01" className={`input${errors.amountUsd ? ' error' : ''}`} placeholder="0.00" value={form.amountUsd} onChange={(e) => set('amountUsd', e.target.value)} />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>The total USD balance available on the vouchers</div>
                        {errors.amountUsd && <div className="field-error"><AlertCircle size={12} />{errors.amountUsd}</div>}
                      </div>
                      <div className="field">
                        <label className="field-label">Fee Percentage <span style={{ color: 'var(--red-600)' }}>*</span></label>
                        <input type="number" step="0.01" min="0" className={`input${errors.feePercentage ? ' error' : ''}`} placeholder="e.g. 3" value={form.feePercentage} onChange={(e) => set('feePercentage', e.target.value)} />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Fees deducted before the redeemed amount reaches Binance</div>
                        {errors.feePercentage && <div className="field-error"><AlertCircle size={12} />{errors.feePercentage}</div>}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div className="field">
                        <label className="field-label">Date <span style={{ color: 'var(--red-600)' }}>*</span></label>
                        <input type="date" className={`input${errors.purchaseDate ? ' error' : ''}`} value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} />
                        {errors.purchaseDate && <div className="field-error"><AlertCircle size={12} />{errors.purchaseDate}</div>}
                      </div>
                    </div>

                    {/* Preview calculation */}
                    {parseFloat(form.amountUsd) > 0 && form.feePercentage !== '' && !isNaN(parseFloat(form.feePercentage)) && (
                      <div style={{ padding: '16px 20px', background: 'var(--green-50)', border: '1px solid var(--green-100)', borderRadius: 'var(--radius)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-600)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>💡 Preview</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Voucher value <strong>${parseFloat(form.amountUsd).toFixed(2)}</strong></span>
                          <span style={{ fontSize: 20, color: 'var(--green-600)', fontWeight: 800 }}>→</span>
                          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>You receive <strong>{previewUsdt.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</strong></span>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                          Fees deducted: <strong>${previewFeeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> at {(parseFloat(form.feePercentage) || 0).toFixed(2)}%.
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div className="field">
                        <label className="field-label">Source USD Account <span style={{ color: 'var(--red-600)' }}>*</span></label>
                        <select className={`input${errors.bankAccountId ? ' error' : ''}`} value={form.bankAccountId} onChange={(e) => set('bankAccountId', e.target.value)}>
                          <option value="">Select USD Account...</option>
                          {usdAccounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.accountName} (${acc.balance.toLocaleString()})</option>)}
                        </select>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>This account will be deducted when you confirm redeem</div>
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
                    <button className="btn btn-primary" onClick={submit} disabled={addPurchase.isPending}>
                      <Check size={15} /> Save Voucher
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redeem Confirmation */}
      <AnimatePresence>
        {showRedeem && redeemPurchase && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" style={{ maxWidth: 400 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="modal-header">
                <div className="modal-title">Confirm Redemption</div>
                <button className="btn-icon" onClick={() => setShowRedeem(false)}><X size={18} /></button>
              </div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: 16, background: 'var(--bg-muted)', borderRadius: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Voucher Value</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>${redeemPurchase.amountUsd.toLocaleString()} USD</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                    Net USDT after fees: <strong>{redeemPurchase.amountUsdt.toLocaleString()} USDT</strong>
                  </div>
                </div>
                
                <div className="field">
                  <label className="field-label">Redeem To Binance Account <span style={{ color: 'var(--red-600)' }}>*</span></label>
                  <select className="input" value={redeemAccountId} onChange={(e) => setRedeemAccountId(e.target.value)}>
                    <option value="">Select Binance Account...</option>
                    {binanceAccounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.accountName} ({acc.balance.toLocaleString()} USDT)</option>)}
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>The USDT will be added to this account</div>
                </div>

                {redeemError && <div className="field-error"><AlertCircle size={12} />{redeemError}</div>}
              </div>

              <div className="modal-actions" style={{ marginTop: 24 }}>
                <button className="btn btn-outline" onClick={() => setShowRedeem(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={confirmRedeem} disabled={redeeming}>
                  {redeeming ? 'Processing...' : 'Confirm Redeem'}
                </button>
              </div>
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
              <div className="modal-title" style={{ fontSize: 18 }}>Delete Purchase?</div>
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

export default CardPurchases;
