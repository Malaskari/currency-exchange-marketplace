import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Trash2, Users, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL = { username: '', email: '', password: '', role: 'operations_officer' };

const Team = () => {
  const { team, addTeamMember, removeTeamMember, user } = useApp();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [removing, setRemoving] = useState(null);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const submit = () => {
    const e = {};
    if (!form.username.trim()) e.username = 'Username is required';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email is required';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    addTeamMember(form);
    setModal(false);
    setForm(INITIAL);
  };

  const confirmRemove = (id) => {
    if (id === user?.id) return; // Don't remove self
    removeTeamMember(id);
    setRemoving(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="page-title">Team Management</div>
          <div className="page-sub">Add and manage admin and operator accounts.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Add Member
        </button>
      </div>

      <div className="team-grid">
        {team.map((m, i) => (
          <motion.div className="team-card" key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div className="team-avatar">{m.username?.charAt(0).toUpperCase()}</div>
            <div className="team-name">{m.username}</div>
            <div className="team-email">{m.email}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className={`role-badge ${m.role === 'admin' ? 'role-admin' : 'role-officer'}`}>
                {m.role === 'admin' ? 'Admin' : 'Operator'}
              </span>
              {m.id !== user?.id && (
                <button
                  className="btn-icon"
                  title="Remove member"
                  style={{ background: 'var(--red-50)', color: 'var(--red-600)' }}
                  onClick={() => setRemoving(m.id)}
                >
                  <Trash2 size={14} />
                </button>
              )}
              {m.id === user?.id && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>You</span>
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
              Joined {m.joinedAt}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && setModal(false)}>
            <motion.div className="modal-card" initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.25 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                <div className="modal-title">Add Team Member</div>
                <button className="btn-icon" onClick={() => setModal(false)}><X size={16} /></button>
              </div>
              <div className="modal-sub">Create a new admin or operator account.</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { key: 'username', label: 'Username', type: 'text', placeholder: 'johndoe' },
                  { key: 'email', label: 'Email', type: 'email', placeholder: 'john@ratex.io' },
                  { key: 'password', label: 'Password', type: 'password', placeholder: 'Min 6 characters' },
                ].map((f) => (
                  <div className="field" key={f.key}>
                    <label className="field-label">{f.label}</label>
                    <input
                      type={f.type}
                      className={`input${errors[f.key] ? ' error' : ''}`}
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                    {errors[f.key] && <div className="field-error"><AlertCircle size={12} />{errors[f.key]}</div>}
                  </div>
                ))}

                <div className="field">
                  <label className="field-label">Role</label>
                  <div className="option-group">
                    {[
                      { id: 'admin', label: 'Admin (Full Access)' },
                      { id: 'operations_officer', label: 'Operator (Requests Only)' },
                    ].map((o) => (
                      <button key={o.id} type="button" className={`option-btn${form.role === o.id ? ' selected' : ''}`} onClick={() => set('role', o.id)}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn btn-outline btn-full" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={submit}><Plus size={15} /> Add Member</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Remove Modal */}
      <AnimatePresence>
        {removing && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} style={{ maxWidth: 380, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, background: 'var(--red-50)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--red-600)' }}>
                <Trash2 size={28} />
              </div>
              <div className="modal-title" style={{ fontSize: 18 }}>Remove Member?</div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8, marginBottom: 28 }}>This will permanently remove the team member's access.</p>
              <div className="modal-actions" style={{ justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={() => setRemoving(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => confirmRemove(removing)}>Remove</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Team;
