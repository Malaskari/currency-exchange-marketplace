import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CreditCard, Building, ChevronRight, Check, X, Clock, Layers, Plus, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRequestsList, useUpdateRequest, useAddRequest } from '../../hooks/useRequests';
import { useApp } from '../../context/AppContext';

const STATUSES = ['all', 'pending', 'processing', 'completed', 'rejected'];
const PAGE_SIZE = 50;

const RequestsManager = () => {
  const navigate = useNavigate();
  const { user, cashRate, bankRate, payoutOptions } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);

  const { data: requests = [], isLoading } = useRequestsList({ status: filter, page, search });
  const updateRequest = useUpdateRequest();
  const addRequest = useAddRequest();

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: '#fef3c7', color: '#d97706' },
      processing: { bg: '#dbeafe', color: '#2563eb' },
      completed: { bg: '#dcfce7', color: '#16a34a' },
      rejected: { bg: '#fee2e2', color: '#dc2626' },
    };
    const s = styles[status] || { bg: '#f3f4f6', color: '#6b7280' };
    return (
      <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
        {status}
      </span>
    );
  };

  const [showInternalRequest, setShowInternalRequest] = useState(false);
  const [intForm, setIntForm] = useState({ fullName: '', whatsapp: '', usdAmount: '', payoutMethod: 'cash', fundSource: 'cash' });
  const [intError, setIntError] = useState('');
  const isAdmin = user?.role === 'Admin';

  const handleIntSubmit = async () => {
    if (!intForm.fullName || !intForm.usdAmount) { setIntError('Name and amount required'); return; }
    const amount = parseFloat(intForm.usdAmount);
    if (isNaN(amount) || amount <= 0) { setIntError('Valid amount required'); return; }

    // Use hook addRequest properly 
    // Note: hook will calculate rate from payoutOptions automatically 
    addRequest.mutate({
      data: {
        fullName: intForm.fullName,
        whatsapp: intForm.whatsapp,
        usdAmount: amount,
        payoutMethod: intForm.payoutMethod,
        fundSource: intForm.fundSource,
        createdByRole: 'internal',
        createdByUsername: user?.username
      },
      rates: { cashRate, bankRate, payoutOptions }
    }, {
      onSuccess: () => {
        setShowInternalRequest(false);
        setIntForm({ fullName: '', whatsapp: '', usdAmount: '', payoutMethod: 'cash', fundSource: 'cash' });
      },
      onError: (err) => setIntError(err.message || 'Failed')
    });
  };

  const updateStatus = (id, status) => {
    if (!isAdmin) { console.warn("Only admins can change status"); return; }
    updateRequest.mutate({ id, changes: { status }, updatedBy: user?.username });
  };

  return (
    <div>
      <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16}}>
        <div>
          <div className="page-title">Exchange Pipeline</div>
          <div className="page-sub">Review and manage all incoming USD exchange requests.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowInternalRequest(true)}>
          <Plus size={16} /> Internal Request
        </button>
      </div>

      <div className="table-heading">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search name, ID, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
      </div>

      <div className="filter-tabs">
        {STATUSES.map((s) => (
          <button key={s} className={`filter-tab${filter === s ? ' active' : ''}`} onClick={() => { setFilter(s); setPage(0); }}>
            {s === 'all' ? `All` : `${s.charAt(0).toUpperCase() + s.slice(1)}`}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Client</th>
                <th>Method</th>
                <th className="right">USD</th>
                <th className="right">LYD Payout</th>
                <th className="center">Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-icon"><Layers size={28} /></div>
                      <div className="empty-title">No requests found</div>
                      <div className="empty-sub">Try adjusting your search or filter.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/dashboard/requests/${r.id}`)}>
                    <td>
                      <code style={{ fontSize: 12, background: 'var(--bg-muted)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{r.id}</code>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, background: 'var(--blue-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-600)', fontSize: 14, fontWeight: 700 }}>
                          {(r.fullName || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{r.fullName || '—'}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.whatsapp || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {r.fundSource === 'mastercard' ? <CreditCard size={14} /> : <Building size={14} />}
                        {r.payoutMethod === 'cash' ? 'Cash' : 'Bank'}
                      </div>
                    </td>
                    <td className="right">
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>${r.usdAmount.toLocaleString()}</span>
                    </td>
                    <td className="right">
                      <span style={{ fontWeight: 600 }}>{r.localAmount.toLocaleString('en', { maximumFractionDigits: 0 })}</span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>LYD</div>
                    </td>
                    <td className="center">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="right" onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {isAdmin && r.status === 'pending' && (
                          <>
                            <button className="btn-icon" title="Approve" style={{ background: '#dcfce7', color: '#16a34a' }}
                              onClick={() => updateStatus(r.id, 'completed')}>
                              <Check size={15} />
                            </button>
                            <button className="btn-icon" title="Reject" style={{ background: '#fee2e2', color: '#dc2626' }}
                              onClick={() => updateStatus(r.id, 'rejected')}>
                              <X size={15} />
                            </button>
                            <button className="btn-icon" title="Processing" style={{ background: '#dbeafe', color: '#2563eb' }}
                              onClick={() => updateStatus(r.id, 'processing')}>
                              <Clock size={15} />
                            </button>
                          </>
                        )}
                        <button className="btn-icon" title="View" onClick={() => navigate(`/admin/dashboard/requests/${r.id}`)}>
                          <ChevronRight size={15} />
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
          <span className="table-count">{requests.length} requests</span>
          <div className="pagination">
            <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
            <button className="page-btn active">{page + 1}</button>
            <button className="page-btn" disabled={requests.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {/* Internal Request Modal */}
      <AnimatePresence>
        {showInternalRequest && (
          <div className="modal-overlay" onClick={() => setShowInternalRequest(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Create Internal Request</div>
                <button className="btn-icon" onClick={() => setShowInternalRequest(false)}><X size={16} /></button>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:16, marginTop:20}}>
                <div className="field">
                  <label className="field-label">Client Name</label>
                  <input className="input" value={intForm.fullName} onChange={e => setIntForm({...intForm, fullName: e.target.value})} placeholder="Client name" />
                </div>
                <div className="field">
                  <label className="field-label">WhatsApp (Optional)</label>
                  <input className="input" value={intForm.whatsapp} onChange={e => setIntForm({...intForm, whatsapp: e.target.value})} placeholder="+218..." />
                </div>
                <div className="field">
                  <label className="field-label">USD Amount</label>
                  <input type="number" className="input" value={intForm.usdAmount} onChange={e => setIntForm({...intForm, usdAmount: e.target.value})} placeholder="0.00" />
                </div>
                <div className="field">
                  <label className="field-label">Payout Method</label>
                  <select className="input" value={intForm.payoutMethod} onChange={e => setIntForm({...intForm, payoutMethod: e.target.value})}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    {(payoutOptions || []).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Fund Source</label>
                  <select className="input" value={intForm.fundSource} onChange={e => setIntForm({...intForm, fundSource: e.target.value})}>
                    <option value="cash">Cash USD</option>
                    <option value="bank_account">Bank Account</option>
                  </select>
                </div>
                {intError && <div className="field-error">{intError}</div>}
              </div>
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => setShowInternalRequest(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleIntSubmit} disabled={addRequest.isPending}>
                  {addRequest.isPending ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RequestsManager;
