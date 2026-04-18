import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Building, DollarSign, X, Check, AlertCircle, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBankAccounts, useAddBankAccount, useUpdateBankAccount, useDeleteBankAccount, useBankAccountStats } from '../../hooks/useBankAccounts';

const EMPTY_FORM = {
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  balance: '',
  notes: '',
};

const BankAccounts = () => {
  const { data: accounts = [], isLoading } = useBankAccounts();
  const { data: stats } = useBankAccountStats();
  const addAccount = useAddBankAccount();
  const updateAccount = useUpdateBankAccount();
  const deleteAccount = useDeleteBankAccount();

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
      bankName: acc.bankName,
      accountNumber: acc.accountNumber,
      accountHolder: acc.accountHolder || '',
      balance: acc.balance.toString(),
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
    if (!form.bankName.trim()) e.bankName = 'Bank name is required';
    if (!form.accountNumber.trim()) e.accountNumber = 'Account number is required';
    if (form.balance && isNaN(parseFloat(form.balance))) e.balance = 'Balance must be a number';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const data = {
      bankName: form.bankName.trim(),
      accountNumber: form.accountNumber.trim(),
      accountHolder: form.accountHolder.trim() || null,
      balance: parseFloat(form.balance) || 0,
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

  const totalBalance = stats?.totalBalance || 0;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="page-title">Bank Accounts</div>
          <div className="page-sub">Manage your LYD bank accounts and track balances.</div>
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
            <Wallet size={28} />
          </div>
          <div>
            <div style={{ fontSize: 14, opacity: 0.6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Balance (LYD)</div>
            <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', marginTop: 4 }}>
              {totalBalance.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 14, opacity: 0.6 }}>{accounts.length} Active Accounts</div>
          </div>
        </div>
      </motion.div>

      {/* Accounts Table */}
      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bank</th>
                <th>Account Number</th>
                <th>Holder</th>
                <th className="right">Balance (LYD)</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <div className="empty-icon"><Building size={28} /></div>
                      <div className="empty-title">No bank accounts</div>
                      <div className="empty-sub">Add your first bank account to start tracking.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, background: 'var(--blue-100)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-600)' }}>
                          <Building size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{acc.bankName}</div>
                          {acc.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{acc.notes}</div>}
                        </div>
                      </div>
                    </td>
                    <td><code style={{ fontSize: 13, background: 'var(--bg-muted)', padding: '4px 10px', borderRadius: 6 }}>{acc.accountNumber}</code></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{acc.accountHolder || '—'}</td>
                    <td className="right">
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--green-600)' }}>
                        {acc.balance.toLocaleString('en', { minimumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>LYD</span>
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
                <div className="modal-title">{editId ? 'Edit Account' : 'Add Bank Account'}</div>
                <button className="btn-icon" onClick={closeModal}><X size={16} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field">
                  <label className="field-label">Bank Name <span style={{ color: 'var(--red-600)' }}>*</span></label>
                  <input type="text" className={`input${errors.bankName ? ' error' : ''}`} placeholder="e.g., Tunisian Bank" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />
                  {errors.bankName && <div className="field-error"><AlertCircle size={12} />{errors.bankName}</div>}
                </div>

                <div className="field">
                  <label className="field-label">Account Number <span style={{ color: 'var(--red-600)' }}>*</span></label>
                  <input type="text" className={`input${errors.accountNumber ? ' error' : ''}`} placeholder="e.g., 1234567890" value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} />
                  {errors.accountNumber && <div className="field-error"><AlertCircle size={12} />{errors.accountNumber}</div>}
                </div>

                <div className="field">
                  <label className="field-label">Account Holder</label>
                  <input type="text" className="input" placeholder="Name on account (optional)" value={form.accountHolder} onChange={(e) => set('accountHolder', e.target.value)} />
                </div>

                <div className="field">
                  <label className="field-label">Current Balance (LYD)</label>
                  <input type="number" step="0.01" className={`input${errors.balance ? ' error' : ''}`} placeholder="0.00" value={form.balance} onChange={(e) => set('balance', e.target.value)} />
                  {errors.balance && <div className="field-error"><AlertCircle size={12} />{errors.balance}</div>}
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
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8, marginBottom: 28 }}>This account will be hidden from the list. You can restore it later.</p>
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

export default BankAccounts;
