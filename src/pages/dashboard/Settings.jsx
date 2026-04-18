import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useSettings, useUpdateSetting } from '../../hooks/useSettings';
import { Save, CheckCircle, AlertCircle, CreditCard, Building, DollarSign, Plus, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Toggle = ({ enabled, onChange, label, desc }) => (
  <div
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px',
      background: enabled ? 'var(--green-50)' : 'var(--bg-subtle)',
      border: `1.5px solid ${enabled ? 'var(--green-100)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      cursor: 'pointer',
      transition: 'all 0.2s',
      userSelect: 'none',
    }}
    onClick={() => onChange(!enabled)}
  >
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: enabled ? 'var(--green-600)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {enabled ? 'Active' : 'Inactive'}
      </span>
      <div
        style={{
          width: 44, height: 24,
          borderRadius: 12,
          background: enabled ? 'var(--green-600)' : 'var(--border)',
          position: 'relative',
          transition: 'background 0.2s',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 3, left: enabled ? 23 : 3,
            width: 18, height: 18,
            background: '#fff',
            borderRadius: '50%',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            transition: 'left 0.2s',
          }}
        />
      </div>
    </div>
  </div>
);

const DEFAULT_SOURCE_OPTIONS = [
  { id: 'mastercard', label: 'MasterCard', icon: '💳' },
  { id: 'bank_account', label: 'Bank Account (FCA)', icon: '🏦' },
  { id: 'cash', label: 'Cash USD', icon: '💵' },
];

const DEFAULT_PAYOUT_OPTIONS = [
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
];

const Settings = () => {
  const { cashRate, setCashRate, bankRate, setBankRate, setUsdBuyRate, cashEnabled: _cashEnabled, bankEnabled: _bankEnabled } = useApp();
  const { data: settings = {} } = useSettings();
  const updateSetting = useUpdateSetting();
  
  const [localCash, setLocalCash] = useState('');
  const [localBank, setLocalBank] = useState('');
  const [localUsdtSell, setLocalUsdtSell] = useState('');
  const [localUsdtBuy, setLocalUsdtBuy] = useState('');
  const [localUsdBuy, setLocalUsdBuy] = useState('');
  const [localFeePercent, setLocalFeePercent] = useState('');
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});
  const [initialized, setInitialized] = useState(false);

  React.useEffect(() => {
    if (!initialized && cashRate) {
      setLocalCash(cashRate.toString());
      setLocalBank(bankRate.toString());
      setLocalUsdtSell((settings.usdtSellRate || 4.85).toString());
      setLocalUsdtBuy((settings.usdtBuyRate || 4.80).toString());
      setLocalUsdBuy((settings.usdBuyRate || 4.80).toString());
      setLocalFeePercent((settings.feePercent || 0).toString());
      setInitialized(true);
    }
  }, [cashRate, bankRate, settings.usdtSellRate, settings.usdtBuyRate, settings.usdBuyRate, settings.feePercent, initialized]);

  const [showAddSource, setShowAddSource] = useState(false);
  const [showAddPayout, setShowAddPayout] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newPayoutName, setNewPayoutName] = useState('');
  const [newPayoutRate, setNewPayoutRate] = useState('');
  const [newPayoutIcon, setNewPayoutIcon] = useState('💰');
  const [payoutError, setPayoutError] = useState('');
  const [newSourceIcon, setNewSourceIcon] = useState('🏦');
  const [sourceError, setSourceError] = useState('');

  const sourceOptions = settings.sourceOptions ? JSON.parse(JSON.stringify(settings.sourceOptions)) : DEFAULT_SOURCE_OPTIONS;
  const payoutOptions = settings.payoutOptions ? JSON.parse(JSON.stringify(settings.payoutOptions)) : DEFAULT_PAYOUT_OPTIONS;

  const toggleSource = (id) => {
    const opt = sourceOptions.find(s => s.id === id);
    if (opt) {
      opt.enabled = !opt.enabled;
      updateSetting.mutate({ key: 'sourceOptions', value: JSON.stringify(sourceOptions) });
    }
  };

  const togglePayout = (id) => {
    const opt = payoutOptions.find(p => p.id === id);
    if (opt) {
      opt.enabled = !opt.enabled;
      updateSetting.mutate({ key: 'payoutOptions', value: JSON.stringify(payoutOptions) });
    }
  };

  const addSourceOption = () => {
    setSourceError('');
    if (!newSourceName.trim()) {
      setSourceError('Please enter a name');
      return;
    }
    const id = newSourceName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (sourceOptions.find(s => s.id === id)) {
      setSourceError('This option already exists');
      return;
    }
    sourceOptions.push({ id, label: newSourceName.trim(), icon: newSourceIcon, enabled: true });
    updateSetting.mutate({ key: 'sourceOptions', value: JSON.stringify(sourceOptions) });
    setNewSourceName('');
    setNewSourceIcon('🏦');
    setShowAddSource(false);
  };

  const addPayoutOption = () => {
    setPayoutError('');
    if (!newPayoutName.trim()) {
      setPayoutError('Please enter a name');
      return;
    }
    const rate = parseFloat(newPayoutRate) || cashRate;
    const id = newPayoutName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (payoutOptions.find(p => p.id === id)) {
      setPayoutError('This method already exists');
      return;
    }
    payoutOptions.push({ id, label: newPayoutName.trim(), icon: newPayoutIcon, rate, enabled: true });
    updateSetting.mutate({ key: 'payoutOptions', value: JSON.stringify(payoutOptions) });
    setNewPayoutName('');
    setNewPayoutRate('');
    setNewPayoutIcon('💰');
    setShowAddPayout(false);
  };

  const removeSourceOption = (id) => {
    const idx = sourceOptions.findIndex(s => s.id === id);
    if (idx > -1) {
      sourceOptions.splice(idx, 1);
      updateSetting.mutate({ key: 'sourceOptions', value: JSON.stringify(sourceOptions) });
    }
  };

  const removePayoutOption = (id) => {
    const idx = payoutOptions.findIndex(p => p.id === id);
    if (idx > -1) {
      payoutOptions.splice(idx, 1);
      updateSetting.mutate({ key: 'payoutOptions', value: JSON.stringify(payoutOptions) });
    }
  };

const saveRates = () => {
    const c = parseFloat(localCash);
    const b = parseFloat(localBank);
    const us = parseFloat(localUsdtSell);
    const ub = parseFloat(localUsdtBuy);
    const ubuy = parseFloat(localUsdBuy);
    const fee = parseFloat(localFeePercent) || 0;

    const e = {};
    if (!localCash || isNaN(c) || c <= 0) e.cash = 'Enter a valid rate';
    if (!localBank || isNaN(b) || b <= 0) e.bank = 'Enter a valid rate';
    if (!localUsdtSell || isNaN(us) || us <= 0) e.usdtSell = 'Enter a valid rate';
    if (!localUsdtBuy || isNaN(ub) || ub <= 0) e.usdtBuy = 'Enter a valid rate';
    if (!localUsdBuy || isNaN(ubuy) || ubuy <= 0) e.usdBuy = 'Enter a valid rate';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setCashRate(c);
    setBankRate(b);
    setUsdBuyRate(ubuy);
    updateSetting.mutate({ key: 'usdtSellRate', value: us });
    updateSetting.mutate({ key: 'usdtBuyRate', value: ub });
    updateSetting.mutate({ key: 'usdBuyRate', value: ubuy });
    updateSetting.mutate({ key: 'feePercent', value: fee });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Pricing & Availability</div>
        <div className="page-sub">Control exchange rates and toggle payout methods on or off.</div>
      </div>

      {/* ── Source of Funds ── */}
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>🏦 Source of Funds</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Manage where customers send USD from</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddSource(!showAddSource)}>
            <Plus size={14} /> Add Option
          </button>
        </div>

        {/* Add Source Modal */}
        <AnimatePresence>
          {showAddSource && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && setShowAddSource(false)}>
              <motion.div className="modal-card" style={{ maxWidth: 420 }} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div className="modal-title">Add Source Option</div>
                  <button className="btn-icon" onClick={() => setShowAddSource(false)}><X size={18} /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Select Icon</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['🏦', '💵', '📱', '🌍', '💳', '🏠', '🤝', '✨'].map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setNewSourceIcon(icon)}
                          style={{
                            width: 44, height: 44, fontSize: 22, border: newSourceIcon === icon ? '2px solid var(--blue-500)' : '1px solid var(--border)',
                            borderRadius: 10, background: newSourceIcon === icon ? 'var(--blue-50)' : '#fff', cursor: 'pointer'
                          }}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Source Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Wise, PayPal, Bank Transfer"
                      value={newSourceName}
                      onChange={(e) => { setNewSourceName(e.target.value); setSourceError(''); }}
                    />
                  </div>

                  {sourceError && (
                    <div style={{ padding: '10px 14px', background: 'var(--red-50)', color: 'var(--red-600)', borderRadius: 8, fontSize: 13 }}>
                      {sourceError}
                    </div>
                  )}
                </div>

                <div className="modal-actions" style={{ marginTop: 24 }}>
                  <button className="btn btn-outline" onClick={() => { setShowAddSource(false); setNewSourceName(''); setSourceError(''); }}>Cancel</button>
                  <button className="btn btn-primary" onClick={addSourceOption}>Add Option</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {sourceOptions.map((opt) => (
            <div key={opt.id} style={{ 
              padding: 20, 
              background: opt.enabled !== false ? 'linear-gradient(135deg, var(--blue-50) 0%, #fff 100%)' : 'var(--bg-muted)', 
              borderRadius: 16, 
              border: `2px solid ${opt.enabled !== false ? 'var(--blue-200)' : 'var(--border)'}`,
              transition: 'all 0.2s',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {opt.enabled !== false && (
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: 'var(--blue-500)', color: '#fff', borderRadius: 99, textTransform: 'uppercase' }}>Active</span>
                </div>
              )}
              <div style={{ fontSize: 28, marginBottom: 8 }}>{opt.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{opt.label}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Toggle
                  enabled={opt.enabled !== false}
                  onChange={() => toggleSource(opt.id)}
                />
                <button className="btn-icon" onClick={() => removeSourceOption(opt.id)} style={{ background: 'var(--red-50)', color: 'var(--red-600)', width: 32, height: 32 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {sourceOptions.filter(s => s.enabled !== false).length === 0 && (
          <div className="alert alert-error" style={{ marginTop: 16 }}>
            <AlertCircle size={16} />
            <span>⚠️ At least one source option must be enabled.</span>
          </div>
        )}
      </div>

      {/* ── Payout Method ── */}
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>💰 Payout Methods</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Manage how customers receive their LYD</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddPayout(!showAddPayout)}>
            <Plus size={14} /> Add Method
          </button>
        </div>

        {/* Add Payout Method Modal */}
        <AnimatePresence>
          {showAddPayout && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && setShowAddPayout(false)}>
              <motion.div className="modal-card" style={{ maxWidth: 420 }} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div className="modal-title">Add Payout Method</div>
                  <button className="btn-icon" onClick={() => setShowAddPayout(false)}><X size={18} /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Select Icon</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['💰', '🏦', '💵', '🏠', '📱', '💳', '🤝', '✨'].map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setNewPayoutIcon(icon)}
                          style={{
                            width: 44, height: 44, fontSize: 22, border: newPayoutIcon === icon ? '2px solid var(--green-500)' : '1px solid var(--border)',
                            borderRadius: 10, background: newPayoutIcon === icon ? 'var(--green-50)' : '#fff', cursor: 'pointer'
                          }}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Method Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Al Aman"
                      value={newPayoutName}
                      onChange={(e) => { setNewPayoutName(e.target.value); setPayoutError(''); }}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Exchange Rate (LYD per USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="e.g., 4.85"
                      value={newPayoutRate}
                      onChange={(e) => setNewPayoutRate(e.target.value)}
                    />
                  </div>

                  {payoutError && (
                    <div style={{ padding: '10px 14px', background: 'var(--red-50)', color: 'var(--red-600)', borderRadius: 8, fontSize: 13 }}>
                      {payoutError}
                    </div>
                  )}
                </div>

                <div className="modal-actions" style={{ marginTop: 24 }}>
                  <button className="btn btn-outline" onClick={() => { setShowAddPayout(false); setNewPayoutName(''); setNewPayoutRate(''); setPayoutError(''); }}>Cancel</button>
                  <button className="btn btn-primary" onClick={addPayoutOption}>Add Method</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {payoutOptions.map((opt) => (
            <div key={opt.id} style={{ 
              padding: 20, 
              background: opt.enabled !== false ? 'linear-gradient(135deg, var(--green-50) 0%, #fff 100%)' : 'var(--bg-muted)', 
              borderRadius: 16, 
              border: `2px solid ${opt.enabled !== false ? 'var(--green-200)' : 'var(--border)'}`,
              transition: 'all 0.2s',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {opt.enabled !== false && (
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: 'var(--green-500)', color: '#fff', borderRadius: 99, textTransform: 'uppercase' }}>Active</span>
                </div>
              )}
              <div style={{ fontSize: 24, marginBottom: 8 }}>{opt.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{opt.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green-600)', marginBottom: 12 }}>{opt.rate || cashRate} <span style={{ fontSize: 12, fontWeight: 500 }}>LYD</span></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Toggle
                  enabled={opt.enabled !== false}
                  onChange={() => togglePayout(opt.id)}
                />
                <button className="btn-icon" onClick={() => removePayoutOption(opt.id)} style={{ background: 'var(--red-50)', color: 'var(--red-600)', width: 32, height: 32 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {payoutOptions.filter(p => p.enabled !== false).length === 0 && (
          <div className="alert alert-error" style={{ marginTop: 16 }}>
            <AlertCircle size={16} />
            <span>⚠️ At least one payout method must be enabled.</span>
          </div>
        )}
      </div>

      {/* ── Settings Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 32, alignItems: 'start' }}>
        
        {/* ── USDT Sell Rate ── */}
        <div className="card" style={{ height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="settings-label">📤 USDT Sell Rate</div>
            <span className="badge badge-green">Selling USDT</span>
          </div>
          <div className="settings-desc">
            Customer pays LYD to buy USDT from you.
          </div>
          <div className="field">
            <label className="field-label">Rate (LYD per 1 USDT)</label>
            <div className="input-prefix-wrap">
              <span className="input-prefix">≈</span>
              <input
                type="number"
                step="0.01"
                className={`input input-lg${errors.usdtSell ? ' error' : ''}`}
                value={localUsdtSell}
                onChange={(e) => { setLocalUsdtSell(e.target.value); setErrors((er) => ({ ...er, usdtSell: '' })); }}
              />
            </div>
            {errors.usdtSell && <div className="field-error"><AlertCircle size={12} />{errors.usdtSell}</div>}
          </div>
          
          {parseFloat(localUsdtSell) > 0 && (
            <div style={{ marginTop: 16, padding: '16px', background: 'var(--green-50)', borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--green-600)', marginBottom: 8 }}>Customer buys 100 USDT → Pays <strong>{(parseFloat(localUsdtSell) * 100).toLocaleString()} LYD</strong></div>
            </div>
          )}
        </div>

        {/* ── USDT Buy Rate ── */}
        <div className="card" style={{ height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="settings-label">📥 USDT Buy Rate</div>
            <span className="badge badge-blue">Buying USDT</span>
          </div>
          <div className="settings-desc">
            You pay LYD to buy USDT from customers.
          </div>
          <div className="field">
            <label className="field-label">Rate (USD per USDT)</label>
            <div className="input-prefix-wrap">
              <span className="input-prefix">≈</span>
              <input
                type="number"
                step="0.01"
                className={`input input-lg${errors.usdtBuy ? ' error' : ''}`}
                value={localUsdtBuy}
                onChange={(e) => { setLocalUsdtBuy(e.target.value); setErrors((er) => ({ ...er, usdtBuy: '' })); }}
              />
            </div>
            {errors.usdtBuy && <div className="field-error"><AlertCircle size={12} />{errors.usdtBuy}</div>}
          </div>

          {parseFloat(localUsdtBuy) > 0 && (
            <div style={{ marginTop: 16, padding: '16px', background: 'var(--blue-50)', borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--blue-600)', marginBottom: 8 }}>You buy 100 USDT → Pay <strong>${(parseFloat(localUsdtBuy) * 100).toFixed(2)} USD</strong></div>
            </div>
          )}
        </div>

        {/* ── USD Buy Rate ── */}
        <div className="card" style={{ height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="settings-label">📥 USD Buy Rate</div>
            <span className="badge badge-blue">Buying USD</span>
          </div>
          <div className="settings-desc">
            You pay LYD to buy USD from customers.
          </div>
          <div className="field">
            <label className="field-label">Rate (LYD per USD)</label>
            <div className="input-prefix-wrap">
              <span className="input-prefix">≈</span>
              <input
                type="number"
                step="0.01"
                className={`input input-lg${errors.usdBuy ? ' error' : ''}`}
                value={localUsdBuy}
                onChange={(e) => { setLocalUsdBuy(e.target.value); setErrors((er) => ({ ...er, usdBuy: '' })); }}
              />
            </div>
            {errors.usdBuy && <div className="field-error"><AlertCircle size={12} />{errors.usdBuy}</div>}
          </div>

          {parseFloat(localUsdBuy) > 0 && (
            <div style={{ marginTop: 16, padding: '16px', background: 'var(--blue-50)', borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--blue-600)', marginBottom: 8 }}>You buy 100 USD → Pay <strong>{(parseFloat(localUsdBuy) * 100).toLocaleString()} LYD</strong></div>
            </div>
          )}
        </div>

      </div>

      {saved && <div className="alert alert-success" style={{ maxWidth: 480, marginTop: 16 }}><CheckCircle size={16} /> Settings saved and live immediately.</div>}

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={saveRates}>
          <Save size={16} /> Save Settings
        </button>
      </div>

      {/* Global Fee Setting */}
      <div className="card" style={{ marginTop: 24, padding: 24, border: '1px solid var(--blue-100)', background: 'var(--blue-50)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
           <div>
             <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue-900)', marginBottom: 4 }}>💰 Global Sales Fee</div>
             <div style={{ fontSize: 13, color: 'var(--blue-700)' }}>Default fee % applied to all sales in the ledger</div>
           </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
           <div style={{ width: 120 }}>
             <label className="field-label">Fee %</label>
             <input 
               type="number" 
               step="0.1" 
               className="input input-lg" 
               value={localFeePercent} 
               onChange={(e) => setLocalFeePercent(e.target.value)} 
               placeholder="0"
             />
           </div>
           <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue-900)' }}>
             % 
           </div>
        </div>
      </div>

      <hr style={{ margin: '40px 0', border: 'none', height: 1, background: 'var(--border-light)' }} />

      <DangerZone />
    </div>
  );
};

const DangerZone = () => {
  const { clearAllData } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    setClearing(true);
    const ok = await clearAllData();
    if (ok) {
      setConfirm(false);
      alert('All sales and requests have been cleared.');
    }
    setClearing(false);
  };

  return (
    <div className="card" style={{ maxWidth: 480, border: '1.5px solid var(--red-100)', background: 'var(--red-50)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <AlertCircle size={20} color="var(--red-600)" />
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red-600)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Danger Zone</div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--red-800)', marginBottom: 20 }}>
        Reset the exchange platform by clearing all existing data. This is <strong>permanent</strong> and cannot be undone.
      </p>

      {!confirm ? (
        <button className="btn btn-secondary" style={{ color: 'var(--red-600)', borderColor: 'var(--red-200)' }} onClick={() => setConfirm(true)}>
          Reset Sales & Requests
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" style={{ background: 'var(--red-600)', boxShadow: 'none' }} onClick={handleClear} disabled={clearing}>
            {clearing ? 'Clearing...' : 'Confirm Permanent Reset'}
          </button>
          <button className="btn btn-secondary" onClick={() => setConfirm(false)} disabled={clearing}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default Settings;
