import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAllRequests, useUpdateRequest, useExecuteUsdPurchaseRequest } from '../../hooks/useRequests';
import { useAccounts } from '../../hooks/useAccounts';
import { useApp } from '../../context/AppContext';
import { RefreshCw } from 'lucide-react';
import {
  ArrowLeft, MessageCircle, CheckCircle2, X, Clock,
  AlertCircle, FileText, Layers, TrendingUp, DollarSign, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_ACTIONS = [
  { label: 'Mark as Processing', status: 'processing', cls: 'btn btn-outline', icon: <Clock size={15} /> },
  { label: 'Mark as Completed', status: 'completed', cls: 'btn btn-success', icon: <CheckCircle2 size={15} /> },
  { label: 'Reject Request', status: 'rejected', cls: 'btn btn-danger', icon: <X size={15} /> },
];

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useApp();
  const { data: requests = [], isLoading } = useAllRequests();
  const updateMutation = useUpdateRequest();
  const executeMutation = useExecuteUsdPurchaseRequest();
  
  const { cashRate: currentCashRate, bankRate: currentBankRate, payoutOptions, sourceOptions: appSourceOptions } = useApp();
  const { data: lydAccounts = [] } = useAccounts({ currency: 'LYD' });
  const { data: usdAccounts = [] } = useAccounts({ currency: 'USD' });

  const req = requests.find((r) => r.id === id);
  const selectedPayoutOption = payoutOptions?.find((p) => p.id === req?.payoutMethod);
  const reqPayoutLabel = selectedPayoutOption?.label || (req?.payoutMethod === 'cash' ? 'Cash' : req?.payoutMethod === 'bank_transfer' ? 'Bank Transfer' : req?.payoutMethod);
  const reqSourceLabel = appSourceOptions?.find(s => s.id === req?.fundSource)?.label || (req?.fundSource === 'mastercard' ? 'MasterCard' : req?.fundSource === 'bank_account' ? 'Bank Account (FCA)' : req?.fundSource);

  const currentMarketRate = selectedPayoutOption?.rate ?? (req?.payoutMethod === 'cash' ? currentCashRate : currentBankRate);
  const storedRate = req?.localAmount && req?.usdAmount ? req.localAmount / req.usdAmount : (selectedPayoutOption?.rate ?? (req?.payoutMethod === 'cash' ? req?.cashRate : req?.bankRate));

  const [note, setNote] = useState(req?.notes || '');
  const [savedNote, setSavedNote] = useState(false);
  
  // Execution modal state
  const [showExecute, setShowExecute] = useState(false);
  const defaultRate = req?.localAmount && req?.usdAmount ? req.localAmount / req.usdAmount : (req?.payoutMethod === 'cash' ? req?.cashRate : req?.bankRate);
  const [execForm, setExecForm] = useState({
    payoutAccountId: '',
    destinationUsdAccountId: '',
    executionRate: defaultRate || 0,
    feePercent: req?.feePercent || 0,
    notes: ''
  });
  const [execError, setExecError] = useState('');

  const openExecuteModal = () => {
    setExecForm({
      payoutAccountId: '',
      destinationUsdAccountId: '',
      executionRate: defaultRate || 0,
      feePercent: req?.feePercent || 0,
      notes: '',
    });
    setExecError('');
    setShowExecute(true);
  };

  const rateChanged = storedRate && Math.abs(parseFloat(execForm.executionRate || 0) - currentMarketRate) > 0.01;

  // Computed values for modal (moved from render)
  const payoutAmt = req ? (req.usdAmount * (1 - (parseFloat(execForm.feePercent) || 0) / 100) * (parseFloat(execForm.executionRate) || 0)) : 0;
  const selectedAcc = execForm.payoutAccountId ? lydAccounts.find(a => a.id === execForm.payoutAccountId) : null;
  const insufficientFunds = selectedAcc && selectedAcc.balance < payoutAmt;

  // Sale recording state (legacy logic, keep for manual override if needed)
  const [saleRate, setSaleRate] = useState(req?.saleRate?.toString() || '');
  const [saleSaved, setSaleSaved] = useState(false);
  const [saleError, setSaleError] = useState('');

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading request...</div>;

  if (!req) return (
    <div className="empty-state" style={{ padding: '80px 0' }}>
      <div className="empty-icon"><Layers size={32} /></div>
      <div className="empty-title">Request not found</div>
      <div className="empty-sub">This request ID does not exist or has been removed.</div>
      <button className="btn btn-outline" style={{ marginTop: 20 }} onClick={() => navigate('/admin/dashboard/requests')}>
        Back to Requests
      </button>
    </div>
  );

  const buyRate = req?.localAmount && req?.usdAmount ? req.localAmount / req.usdAmount : (req?.payoutMethod === 'cash' ? req?.cashRate : req?.bankRate);
  const buyLYD  = req?.localAmount || 0; // what agency paid to the customer
  const feeAmt  = req?.feeAmount || 0;
  const effUSD  = req?.effectiveUSD || req?.usdAmount || 0;

  // If a sale rate has been recorded
  const recordedSaleRate = req?.saleRate || null;
  const sellLYD  = recordedSaleRate ? (req?.usdAmount || 0) * recordedSaleRate : null;
  const profit   = sellLYD !== null ? sellLYD - buyLYD : null;

  const recordSale = () => {
    const r = parseFloat(saleRate);
    if (!saleRate || isNaN(r) || r <= 0) {
      setSaleError('Enter a valid sell rate (LYD per USD)');
      return;
    }
    setSaleError('');
    updateMutation.mutate({ id, changes: { saleRate: r } });
    setSaleSaved(true);
    setTimeout(() => setSaleSaved(false), 3000);
  };

  const setStatus = (status) => updateMutation.mutate({ id, changes: { status } });
  const saveNote  = () => {
    updateMutation.mutate({ id, changes: { notes: note } });
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 2500);
  };

  const useCurrentRate = () => {
    setExecForm(f => ({ ...f, executionRate: currentMarketRate.toString() }));
  };

  const handleExecute = () => {
    if (!execForm.payoutAccountId || !execForm.destinationUsdAccountId || !execForm.executionRate) {
      setExecError('All execution fields are required.');
      return;
    }
    executeMutation.mutate({
      requestId: id,
      payoutAccountId: execForm.payoutAccountId,
      destinationUsdAccountId: execForm.destinationUsdAccountId,
      executionRate: parseFloat(execForm.executionRate),
      feePercent: parseFloat(execForm.feePercent),
      executionNotes: execForm.notes,
      executedBy: user?.username || 'admin'
    }, {
      onSuccess: () => {
        setShowExecute(false);
      },
      onError: (err) => {
        setExecError(err.message || 'Execution failed.');
      }
    });
  };

  const wa = () => {
    if (!req.whatsapp) return;
    const number = req.whatsapp.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hello ${req.fullName}, this is RateX regarding your request ${req.id}.`);
    window.open(`https://wa.me/${number}?text=${msg}`, '_blank');
  };

  return (
    <div>
      <button className="back-link" onClick={() => navigate('/admin/dashboard/requests')}>
        <ArrowLeft size={16} /> Back to Requests
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <code style={{ fontSize: 16, fontWeight: 700, background: 'var(--bg-muted)', padding: '4px 12px', borderRadius: 8 }}>{req.id}</code>
            <span className={`badge badge-${req.status}`}><span className={`dot dot-${req.status}`} />{req.status}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Submitted {new Date(req.timestamp).toLocaleString()}</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {req.status === 'pending' && (
            <button className="btn btn-primary" onClick={openExecuteModal}>
              <CheckCircle2 size={16} /> Execute & Pay
            </button>
          )}
          <button className="btn btn-whatsapp" onClick={wa}>
            <MessageCircle size={16} /> Contact on WhatsApp
          </button>
        </div>
      </div>

      <div className="detail-grid">
        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Client Info */}
          <div className="card">
            <div className="detail-section-title">Client Information</div>
            {[
              ['Full Name', req.fullName || '—'],
              ['WhatsApp', req.whatsapp || '—'],
              ['Passport', req.passport || '—'],
              ...(req.iban ? [['IBAN', req.iban]] : []),
            ].map(([k, v]) => (
              <div className="detail-row" key={k}>
                <span className="detail-key">{k}</span>
                <span className="detail-val">{v}</span>
              </div>
            ))}
          </div>

          {/* Transaction — BUY side */}
          <div className="card">
            <div className="detail-section-title">Step 1 — Agency Buys USD from Client</div>
            {[
              ['Gross USD',      `$${req.usdAmount.toLocaleString()}`],
              ...(feeAmt > 0 ? [
                [`Service Fee (${req.feePercent || 0}%)`, `-$${feeAmt.toLocaleString('en', { maximumFractionDigits: 2 })}`],
                ['Net USD Paid For', `$${effUSD.toLocaleString('en', { maximumFractionDigits: 2 })}`],
              ] : []),
              ['Payout Method Exchange Rate',      `${buyRate} LYD / USD`],
              ['Source',        reqSourceLabel],
              ['Payout Method', reqPayoutLabel],
            ].map(([k, v]) => (
              <div className="detail-row" key={k}>
                <span className="detail-key">{k}</span>
                <span className="detail-val" style={{ fontWeight: 700 }}>{v}</span>
              </div>
            ))}

            {/* Cost box */}
            <div style={{ marginTop: 16, padding: '16px 20px', background: 'linear-gradient(135deg, var(--blue-600), #1d4ed8)', borderRadius: 'var(--radius-md)', color: '#fff' }}>
              <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                💸 Agency Paid to Client
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em' }}>
                {buyLYD.toLocaleString('en', { maximumFractionDigits: 2 })} <span style={{ fontSize: 16, opacity: 0.7 }}>LYD</span>
              </div>
            </div>
          </div>

          {/* ── SELL SIDE (Record Sale) ── */}
          <div className="card" style={{ border: recordedSaleRate ? '1.5px solid var(--green-100)' : '1.5px solid var(--border)', background: recordedSaleRate ? 'var(--green-50)' : '#fff', transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, paddingBottom: 12, borderBottom: '1px solid var(--border-light)' }}>
              <TrendingUp size={16} color="var(--green-600)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Step 2 — Agency Sells USD to Market
              </span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              After buying $<strong>{req.usdAmount.toLocaleString()}</strong> from this client, enter the rate you sold those dollars at to calculate your profit.
            </p>

            <div className="field" style={{ marginBottom: 12 }}>
              <label className="field-label">
                Rate you sold USD at <span style={{ color: 'var(--text-muted)', textTransform: 'none', fontWeight: 400 }}>(LYD per USD)</span>
              </label>
              <div className="input-prefix-wrap">
                <span className="input-prefix">≈</span>
                <input
                  type="number"
                  step="0.01"
                  className={`input input-lg${saleError ? ' error' : ''}`}
                  placeholder={`e.g. ${(buyRate + 0.1).toFixed(2)}`}
                  value={saleRate}
                  onChange={(e) => { setSaleRate(e.target.value); setSaleError(''); }}
                />
              </div>
              {saleError && <div className="field-error"><AlertCircle size={12} />{saleError}</div>}
              {saleRate && parseFloat(saleRate) > 0 && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                  You will receive: <strong style={{ color: 'var(--text-primary)' }}>
                    {(req.usdAmount * parseFloat(saleRate)).toLocaleString('en', { maximumFractionDigits: 2 })} LYD
                  </strong>
                </div>
              )}
            </div>

            {saleSaved && (
              <div className="alert alert-success" style={{ marginBottom: 12 }}>
                <CheckCircle2 size={16} /> Sale recorded successfully.
              </div>
            )}

            <button className="btn btn-success btn-sm" onClick={recordSale}>
              <DollarSign size={14} /> Record Sale
            </button>
          </div>

          {/* ── PROFIT SUMMARY ── */}
          <AnimatePresence>
            {profit !== null && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="card"
                style={{
                  background: profit >= 0
                    ? 'linear-gradient(135deg, var(--green-600), #15803d)'
                    : 'linear-gradient(135deg, var(--red-600), #b91c1c)',
                  color: '#fff',
                  border: 'none',
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  {profit >= 0 ? '💰 Net Profit on This Deal' : '⚠️ Net Loss on This Deal'}
                </div>
                <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 12 }}>
                  {profit >= 0 ? '+' : ''}{profit.toLocaleString('en', { maximumFractionDigits: 2 })} <span style={{ fontSize: 18, opacity: 0.75 }}>LYD</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                  {[
                    ['Bought at', `${buyRate} LYD/$`],
                    ['Sold at',   `${recordedSaleRate} LYD/$`],
                    ['Margin',    `${(recordedSaleRate - buyRate).toFixed(4)} LYD/$`],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div style={{ fontSize: 10, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{l}</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 12 }}>
                  {[
                    ['Paid to client', `${buyLYD.toLocaleString('en', { maximumFractionDigits: 0 })} LYD`],
                    ['Received',       `${sellLYD.toLocaleString('en', { maximumFractionDigits: 0 })} LYD`],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div style={{ fontSize: 10, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{l}</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notes */}
          <div className="card">
            <div className="detail-section-title">Admin Notes</div>
            <textarea
              className="input textarea"
              placeholder="Add internal notes about this request..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
            />
            {savedNote && <div className="alert alert-success" style={{ marginBottom: 12 }}><CheckCircle2 size={16} /> Note saved.</div>}
            <button className="btn btn-outline btn-sm" onClick={saveNote}>
              <FileText size={14} /> Save Note
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status */}
          <div className="card">
            <div className="detail-section-title">Update Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STATUS_ACTIONS.map((a) => (
                <button
                  key={a.status}
                  className={`${a.cls} btn-full`}
                  disabled={req.status === a.status}
                  onClick={() => setStatus(a.status)}
                  style={{ opacity: req.status === a.status ? 0.4 : 1 }}
                >
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-muted)' }}>
              <AlertCircle size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Current: <strong style={{ color: 'var(--text-primary)' }}>{req.status}</strong>
            </div>
          </div>

          {/* Quick P&L summary card if sale is recorded */}
          {profit !== null && (
            <div className="card">
              <div className="detail-section-title">P&L Summary</div>
              {[
                ['USD Amount',  `$${req.usdAmount.toLocaleString()}`],
                ['Buy Rate',    `${buyRate} LYD/$`],
                ['Sell Rate',   `${recordedSaleRate} LYD/$`],
                ['Cost (paid)', `${buyLYD.toLocaleString('en', { maximumFractionDigits: 0 })} LYD`],
                ['Revenue',     `${sellLYD.toLocaleString('en', { maximumFractionDigits: 0 })} LYD`],
                ['Net Profit',  `${profit.toLocaleString('en', { maximumFractionDigits: 0 })} LYD`],
              ].map(([k, v]) => (
                <div className="detail-row" key={k}>
                  <span className="detail-key">{k}</span>
                  <span className="detail-val" style={{ color: k === 'Net Profit' ? (profit >= 0 ? 'var(--green-600)' : 'var(--red-600)') : 'var(--text-primary)', fontWeight: k === 'Net Profit' ? 800 : 600 }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Timeline */}
          <div className="card">
            <div className="detail-section-title">Activity</div>
            {[
              { label: 'Request submitted', time: new Date(req.timestamp).toLocaleString(), done: true },
              { label: 'USD purchased from client', time: req.status !== 'pending' ? '✓' : 'Awaiting', done: req.status !== 'pending' },
              { label: 'USD sold to market', time: req.saleRate ? `At ${req.saleRate} LYD/$` : 'Not yet recorded', done: !!req.saleRate },
              { label: 'Profit realized', time: profit !== null ? `+${profit.toLocaleString('en', { maximumFractionDigits: 0 })} LYD` : '—', done: profit !== null && profit > 0 },
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.done ? 'var(--green-600)' : 'var(--border)', marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Execution Modal */}
      <AnimatePresence>
        {showExecute && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" style={{ maxWidth: 500 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="modal-header">
                <div className="modal-title">Execute & Post Transaction</div>
                <button className="btn-icon" onClick={() => setShowExecute(false)}><X size={18} /></button>
              </div>

              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg-muted)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Buying Gross</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>${req.usdAmount.toLocaleString()} USD</div>
                </div>

                {/* Rate Warning Banner */}
                {rateChanged && (
                  <div style={{ padding: '12px 16px', background: 'var(--red-50)', border: '1px solid var(--red-200)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <AlertCircle size={16} color="var(--red-600)" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red-700)' }}>Rate Has Changed</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--red-600)' }}>
                      Request rate: <strong>{storedRate} LYD</strong> → Current market: <strong>{currentMarketRate} LYD</strong>
                    </div>
                    <button 
                      className="btn btn-outline btn-sm" 
                      style={{ marginTop: 8, borderColor: 'var(--red-300)', color: 'var(--red-700)', fontSize: 12 }}
                      onClick={useCurrentRate}
                    >
                      <RefreshCw size={12} /> Use Current Rate ({currentMarketRate} LYD)
                    </button>
                  </div>
                )}

                <div className="field">
                  <label className="field-label">Payout LYD Account</label>
                  <select 
                    className="input" 
                    value={execForm.payoutAccountId} 
                    onChange={e => setExecForm(f => ({ ...f, payoutAccountId: e.target.value }))}
                  >
                    <option value="">Select LYD Account...</option>
                    {lydAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} — Balance: {acc.balance.toLocaleString()} LYD
                        {acc.balance < (req.usdAmount * parseFloat(execForm.executionRate || 0) * (1 - (parseFloat(execForm.feePercent) || 0) / 100)) ? ' ⚠️' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="field-label">Destination USD Account</label>
                  <select 
                    className="input" 
                    value={execForm.destinationUsdAccountId} 
                    onChange={e => setExecForm(f => ({ ...f, destinationUsdAccountId: e.target.value }))}
                  >
                    <option value="">Select USD Account...</option>
                    {usdAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} — Balance: ${acc.balance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="field">
                    <label className="field-label">
                      Execution Rate (LYD per USD)
                      <button 
                        type="button"
                        className="btn btn-outline btn-sm" 
                        style={{ marginLeft: 8, padding: '2px 8px', fontSize: 10 }}
                        onClick={useCurrentRate}
                      >
                        <RefreshCw size={10} /> Current: {currentMarketRate}
                      </button>
                    </label>
                    <input 
                      type="number" 
                      className="input" 
                      value={execForm.executionRate} 
                      onChange={e => setExecForm(f => ({ ...f, executionRate: e.target.value }))} 
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Fee Percent (%)</label>
                    <input 
                      type="number" 
                      className="input" 
                      value={execForm.feePercent} 
                      onChange={e => setExecForm(f => ({ ...f, feePercent: e.target.value }))} 
                    />
                  </div>
                </div>

                {/* Live Preview */}
                {execForm.executionRate > 0 && (
                  <div style={{ padding: 16, background: 'var(--green-50)', color: 'var(--green-700)', borderRadius: 12, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Gross USD:</span>
                      <span style={{ fontWeight: 700 }}>${req.usdAmount.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Fee USD ({execForm.feePercent}%):</span>
                      <span style={{ fontWeight: 700 }}>-${(req.usdAmount * (execForm.feePercent / 100)).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 4, marginBottom: 8 }}>
                      <span>Net Treasury Incr (USD):</span>
                      <span style={{ fontWeight: 900 }}>${(req.usdAmount * (1 - execForm.feePercent / 100)).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, marginBottom: execForm.payoutAccountId ? 8 : 0 }}>
                      <span>LYD Payout to Customer:</span>
                      <span style={{ fontWeight: 900 }}>{(req.usdAmount * (1 - execForm.feePercent / 100) * execForm.executionRate).toLocaleString()} LYD</span>
                    </div>
                    {insufficientFunds && (
                      <div style={{ padding: '8px 12px', background: 'var(--red-100)', color: 'var(--red-700)', borderRadius: 8, marginTop: 8, fontSize: 12, fontWeight: 600 }}>
                        ⚠️ Insufficient funds! Account has {selectedAcc.balance.toLocaleString()} LYD, need {payoutAmt.toLocaleString()} LYD
                      </div>
                    )}
                  </div>
                )}

                <div className="field">
                  <label className="field-label">Execution Notes</label>
                  <textarea 
                    className="input textarea" 
                    placeholder="Ref #, deal details..." 
                    rows={2} 
                    value={execForm.notes} 
                    onChange={e => setExecForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                {execError && (
                  <div className="alert alert-danger">
                    <AlertCircle size={16} /> {execError}
                  </div>
                )}
              </div>

              <div className="modal-actions" style={{ marginTop: 24 }}>
                <button className="btn btn-outline" onClick={() => setShowExecute(false)}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  disabled={executeMutation.isPending} 
                  onClick={handleExecute}
                >
                  {executeMutation.isPending ? 'Processing...' : 'Confirm Execution'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RequestDetail;
