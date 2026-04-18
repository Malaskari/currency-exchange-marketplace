import React, { useState } from 'react';
import { Plus, Trash2, Edit2, X, Check, AlertCircle, Wallet, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUsdtAccounts, useAddUsdtAccount, useUpdateUsdtAccount, useDeleteUsdtAccount, useUsdtAccountStats } from '../../hooks/useUsdtAccounts';

const EMPTY_FORM = {
  accountName: '',
  binanceEmail: '',
  usdtBalance: '',
  notes: '',
};

const UsdtAccounts = () => {
  const { data: accounts = [], isLoading } = useUsdtAccounts();
  const { data: stats } = useUsdtAccountStats();
  const addAccount = useAddUsdtAccount();
  const updateAccount = useUpdateUsdtAccount();
  const deleteAccount = useDeleteUsdtAccount();

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleting, setDeleting] = useState(null);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setErrors({});
    setModal(true);
  };

  const openEdit = (acc) => {
    setForm({
      accountName: acc.accountName,
      binanceEmail: acc.binanceEmail || '',
      usdtBalance: acc.usdtBalance.toString(),
      notes: acc.notes || '',
    });
    setEditId(acc.id);
    setErrors({});
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setForm(EMPTY_FORM);
    setEditId(null);
    setErrors({});
  };

  const submit = () => {
    const e = {};
    if (!form.accountName.trim()) e.accountName = 'Account name is required';
    if (form.usdtBalance && isNaN(parseFloat(form.usdtBalance))) e.usdtBalance = 'Balance must be a number';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const data = {
      accountName: form.accountName.trim(),
      binanceEmail: form.binanceEmail.trim() || null,
      usdtBalance: parseFloat(form.usdtBalance) || 0,
      notes: form.notes.trim() || null,
    };

    if (editId) {
      updateAccount.mutate({ id: editId, changes: data }, { onSuccess: closeModal });
    } else {
      addAccount.mutate(data, { onSuccess: closeModal });
    }
  };

  const confirmDelete = (id) => {
    deleteAccount.mutate(id, { onSuccess: () => setDeleting(null) });
  };

  const totalUsdt = stats?.totalBalance || 0;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="page-title">USDT Accounts</div>
          <div className="page-sub">Track your Binance USDT balances.</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Account
        </button>
      </div>

      {/* Total Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          marginBottom: 28,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
          border: '1.5px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 32px',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(15,23,42,0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={28} />
          </div>
          <div>
            <div style={{ fontSize: 14, opacity: 0.6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total USDT Balance</div>
            <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', marginTop: 4 }}>
              {totalUsdt.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 20, opacity: 0.7 }}>USDT</span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 14, opacity: 0.6 }}>{accounts.length} Binance Accounts</div>
          </div>
        </div>
      </motion.div>

      {/* Accounts Table */}
      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Binance Email</th>
                <th className="right">USDT Balance</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <div className="empty-icon"><Wallet size={28} /></div>
                      <div className="empty-title">No USDT accounts</div>
                      <div className="empty-sub">Add your Binance accounts to track USDT.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, background: 'var(--green-100)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-600)' }}>
                          <DollarSign size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{acc.accountName}</div>
                          {acc.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{acc.notes}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{acc.binanceEmail || '—'}</td>
                    <td className="right">
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--green-600)' }}>
                        {acc.usdtBalance.toLocaleString('en', { minimumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>USDT</span>
                    </td>
                    <td className="right">
                      <div className="table-actions">
                        <button className="btn-icon" title="Edit" onClick={() => openEdit(acc)} style={{ background: 'var(--blue-50)', color: 'var(--blue-600)' }}>
                          <Edit2 size={15} />
                        </button>
                        <button className="btn-icon" title="Delete" onClick={() => setDeleting(acc.id)} style={{ background: 'var(--red-50)', color: 'var(--red-600)' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && closeModal()}>
            <motion.div className="modal-card" style={{ maxWidth: 480 }} initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div className="modal-title">{editId ? 'Edit Account' : 'Add USDT Account'}</div>
                <button className="btn-icon" onClick={closeModal}><X size={16} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field">
                  <label className="field-label">Account Name <span style={{ color: 'var(--red-600)' }}>*</span></label>
                  <input type="text" className={`input${errors.accountName ? ' error' : ''}`} placeholder="e.g., Main Binance" value={form.accountName} onChange={(e) => set('accountName', e.target.value)} />
                  {errors.accountName && <div className="field-error"><AlertCircle size={12} />{errors.accountName}</div>}
                </div>

                <div className="field">
                  <label className="field-label">Binance Email</label>
                  <input type="email" className="input" placeholder="email@example.com (optional)" value={form.binanceEmail} onChange={(e) => set('binanceEmail', e.target.value)} />
                </div>

                <div className="field">
                  <label className="field-label">Current USDT Balance</label>
                  <input type="number" step="0.01" className={`input${errors.usdtBalance ? ' error' : ''}`} placeholder="0.00" value={form.usdtBalance} onChange={(e) => set('usdtBalance', e.target.value)} />
                  {errors.usdtBalance && <div className="field-error"><AlertCircle size={12} />{errors.usdtBalance}</div>}
                </div>

                <div className="field">
                  <label className="field-label">Notes</label>
                  <textarea className="input textarea" placeholder="Optional notes..." rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 24 }}>
                <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
                <button className="btn btn-primary" onClick={submit} disabled={addAccount.isPending || updateAccount.isPending}>
                  <Check size={15} /> {editId ? 'Update' : 'Add Account'}
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
              <div className="modal-title" style={{ fontSize: 18 }}>Delete Account?</div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8, marginBottom: 28 }}>This account will be hidden from the list.</p>
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

export default UsdtAccounts;
