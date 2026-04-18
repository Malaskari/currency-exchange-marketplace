import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useSettings } from '../hooks/useSettings';
import { useAddRequest } from '../hooks/useRequests';
import { Zap, ArrowLeft, ArrowRight, CreditCard, Building, DollarSign, User, Phone, FileText, Hash, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = ['Amount & Source', 'Your Details', 'Review'];

const SOURCE_ICONS = { mastercard: '💳', bank_account: '🏦', cash: '💵' };
const PAYOUT_ICONS = { cash: '💵', bank_transfer: '🏦' };

const RequestForm = () => {
  const { cashRate, bankRate } = useApp();
  const { data: settings = {} } = useSettings();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    usdAmount: '',
    fundSource: '',
    payoutMethod: '',
    fullName: '',
    whatsapp: '',
    passport: '',
    iban: '',
  });
  const [errors, setErrors] = useState({});

  const addRequest = useAddRequest();

  const sourceOptions = useMemo(() => {
    const defaults = [
      { id: 'mastercard', label: 'MasterCard', icon: '💳' },
      { id: 'bank_account', label: 'Bank Account (FCA)', icon: '🏦' },
      { id: 'cash', label: 'Cash USD', icon: '💵' },
    ];
    if (settings.sourceOptions) {
      return settings.sourceOptions.filter(s => s.enabled !== false);
    }
    return defaults.filter(s => ['mastercard', 'bank_account'].includes(s.id));
  }, [settings.sourceOptions]);

  const payoutOptions = useMemo(() => {
    const defaults = [
      { id: 'cash', label: 'Cash', icon: '💵', rate: cashRate },
      { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', rate: bankRate },
    ];
    if (settings.payoutOptions) {
      return settings.payoutOptions
        .filter(p => p.enabled !== false)
        .map(p => ({
          ...p,
          rate: p.rate || (p.id === 'cash' ? cashRate : bankRate)
        }));
    }
    return defaults;
  }, [settings.payoutOptions, cashRate, bankRate]);

  const selectedPayout = payoutOptions.find(p => p.id === form.payoutMethod);
  const rate = selectedPayout?.rate || (form.payoutMethod === 'bank_transfer' ? bankRate : cashRate);
  const usd = parseFloat(form.usdAmount) || 0;
  const localAmount = usd * rate;

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.usdAmount || parseFloat(form.usdAmount) <= 0) e.usdAmount = 'Enter a valid USD amount';
      if (!form.fundSource) e.fundSource = 'Select source of funds';
      if (!form.payoutMethod) e.payoutMethod = 'Select a payout method';
    }
    if (step === 1) {
      if (!form.fullName.trim()) e.fullName = 'Full name is required';
      if (!form.whatsapp.trim()) e.whatsapp = 'WhatsApp number is required';
      if (!form.passport.trim()) e.passport = 'Passport number is required';
      if (form.payoutMethod === 'bank_transfer' && !form.iban.trim()) e.iban = 'IBAN is required for bank transfer';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);

  const submit = async () => {
    try {
      const result = await addRequest.mutateAsync({
        data: {
          usdAmount: parseFloat(form.usdAmount),
          fundSource: form.fundSource,
          payoutMethod: form.payoutMethod,
          fullName: form.fullName,
          whatsapp: form.whatsapp,
          passport: form.passport,
          iban: form.iban || null,
        },
        rates: { cashRate, bankRate, cashBuyRate: cashRate, bankBuyRate: bankRate, payoutOptions }
      });
      navigate('/confirmation', { state: { request: result } });
    } catch (err) {
      console.error('Failed to submit request:', err);
      alert('Error: ' + err.message);
      return;
    }
  };

  return (
    <div className="form-page">
      <header className="form-page-header">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div className="brand-mark"><Zap size={18} fill="white" /></div>
            <span className="brand-name">RateX</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: i < step ? 'var(--green-600)' : i === step ? 'var(--blue-600)' : 'var(--border)', color: i <= step ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, transition: 'all 0.3s', flexShrink: 0 }}>
                    {i < step ? <CheckCircle size={14} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: i === step ? 'var(--text-primary)' : 'var(--text-muted)', display: 'none' }} className="hide-sm">{s}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ width: 24, height: 2, background: i < step ? 'var(--green-600)' : 'var(--border)', transition: 'background 0.3s', flexShrink: 0 }} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      <div className="form-page-body">
        <div className="form-container">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="card card-lg">
                  <div className="form-card-title">How much are you selling?</div>
                  <div className="form-card-sub">Enter your USD amount and select your source of funds.</div>

                  <div className="field" style={{ marginBottom: 28 }}>
                    <label className="field-label">USD Amount</label>
                    <div className="input-prefix-wrap xl">
                      <span className="input-prefix">$</span>
                      <input type="number" className={`input input-xl${errors.usdAmount ? ' error' : ''}`} placeholder="0" value={form.usdAmount} onChange={(e) => set('usdAmount', e.target.value)} />
                    </div>
                    {errors.usdAmount && <div className="field-error"><AlertCircle size={12} />{errors.usdAmount}</div>}
                  </div>

                  {parseFloat(form.usdAmount) > 0 && form.payoutMethod && (
                    <div className="calc-box" style={{ marginBottom: 28 }}>
                      <div className="calc-label">You will receive</div>
                      <div className="calc-amount">
                        {localAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 20, opacity: 0.7 }}>LYD</span>
                      </div>
                      <div className="calc-sub">At rate: {rate} LYD/USD</div>
                    </div>
                  )}

                  <div className="field" style={{ marginBottom: 20 }}>
                    <label className="field-label">Source of Funds</label>
                    <div className="option-group">
                      {sourceOptions.map((o) => (
                        <button key={o.id} type="button" className={`option-btn${form.fundSource === o.id ? ' selected' : ''}`} onClick={() => set('fundSource', o.id)}>
                          {o.icon || '💰'} {o.label}
                        </button>
                      ))}
                    </div>
                    {errors.fundSource && <div className="field-error"><AlertCircle size={12} />{errors.fundSource}</div>}
                  </div>

                  <div className="field" style={{ marginBottom: 36 }}>
                    <label className="field-label">Payout Method</label>
                    {payoutOptions.length === 0 ? (
                      <div className="alert alert-error"><AlertCircle size={16} />No payout methods are currently available. Please contact us directly.</div>
                    ) : (
                      <div className="option-group">
                        {payoutOptions.map((p) => (
                          <button key={p.id} type="button" className={`option-btn${form.payoutMethod === p.id ? ' selected' : ''}`} onClick={() => set('payoutMethod', p.id)}>
                            {p.icon || '💰'} {p.label} ({p.rate} LYD/USD)
                          </button>
                        ))}
                      </div>
                    )}
                    {errors.payoutMethod && <div className="field-error"><AlertCircle size={12} />{errors.payoutMethod}</div>}
                  </div>

                  <button className="btn btn-primary btn-lg btn-full" onClick={next}>Continue <ArrowRight size={18} /></button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="card card-lg">
                  <div className="form-card-title">Your details</div>
                  <div className="form-card-sub">We need this to process your request and contact you.</div>

                  <div className="form-grid" style={{ gap: 20 }}>
                    <div className="field">
                      <label className="field-label">Full Name</label>
                      <div className="input-icon-wrap">
                        <User size={16} className="input-icon" />
                        <input type="text" className={`input${errors.fullName ? ' error' : ''}`} placeholder="Mohamed Al-Sharif" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
                      </div>
                      {errors.fullName && <div className="field-error"><AlertCircle size={12} />{errors.fullName}</div>}
                    </div>

                    <div className="field">
                      <label className="field-label">WhatsApp Number</label>
                      <div className="input-icon-wrap">
                        <Phone size={16} className="input-icon" />
                        <input type="tel" className={`input${errors.whatsapp ? ' error' : ''}`} placeholder="+218 91 234 5678" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
                      </div>
                      {errors.whatsapp && <div className="field-error"><AlertCircle size={12} />{errors.whatsapp}</div>}
                    </div>

                    <div className="field">
                      <label className="field-label">Passport Number</label>
                      <div className="input-icon-wrap">
                        <FileText size={16} className="input-icon" />
                        <input type="text" className={`input${errors.passport ? ' error' : ''}`} placeholder="A1234567" value={form.passport} onChange={(e) => set('passport', e.target.value)} />
                      </div>
                      {errors.passport && <div className="field-error"><AlertCircle size={12} />{errors.passport}</div>}
                    </div>

                    {form.payoutMethod === 'bank_transfer' && (
                      <div className="field">
                        <label className="field-label">IBAN</label>
                        <div className="input-icon-wrap">
                          <Hash size={16} className="input-icon" />
                          <input type="text" className={`input${errors.iban ? ' error' : ''}`} placeholder="LY83002048000020100120361" value={form.iban} onChange={(e) => set('iban', e.target.value)} />
                        </div>
                        {errors.iban && <div className="field-error"><AlertCircle size={12} />{errors.iban}</div>}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
                    <button className="btn btn-outline btn-lg" onClick={back} style={{ flex: '0 0 auto' }}><ArrowLeft size={18} /> Back</button>
                    <button className="btn btn-primary btn-lg btn-full" onClick={next}>Review <ArrowRight size={18} /></button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="card card-lg">
                  <div className="form-card-title">Review your request</div>
                  <div className="form-card-sub">Please confirm everything looks correct before submitting.</div>

                  <div className="calc-box" style={{ marginBottom: 28 }}>
                    <div className="calc-label">You will receive</div>
                    <div className="calc-amount">
                      {localAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 20, opacity: 0.7 }}>LYD</span>
                    </div>
                    <div className="calc-sub">For ${usd.toLocaleString()} USD · Rate: {rate} LYD/USD</div>
                  </div>

                  {[
                    ['Name', form.fullName],
                    ['WhatsApp', form.whatsapp],
                    ['Passport', form.passport],
                    ['Source', sourceOptions.find(s => s.id === form.fundSource)?.label || form.fundSource],
                    ['Payout', payoutOptions.find(p => p.id === form.payoutMethod)?.label || form.payoutMethod],
                    ...(form.iban ? [['IBAN', form.iban]] : []),
                  ].map(([k, v]) => (
                    <div className="detail-row" key={k}>
                      <span className="detail-key">{k}</span>
                      <span className="detail-val">{v}</span>
                    </div>
                  ))}

                  <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
                    <button className="btn btn-outline btn-lg" onClick={back} style={{ flex: '0 0 auto' }}><ArrowLeft size={18} /> Back</button>
                    <button className="btn btn-success btn-lg btn-full" onClick={submit} disabled={addRequest.isPending}>
                      <CheckCircle size={18} /> {addRequest.isPending ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default RequestForm;
