import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Zap, Shield, Clock, TrendingUp, ArrowRight, CheckCircle, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const PublicHome = () => {
  const { payoutOptions = [] } = useApp();
  const navigate = useNavigate();
  
  const enabledOptions = payoutOptions.filter(p => p.enabled !== false);

  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }
  });

  return (
    <div className="page-stack">
      {/* ── Nav ── */}
      <nav className="pub-nav">
        <div className="container pub-nav-inner">
          <div className="brand">
            <div className="brand-mark"><Zap size={20} fill="white" /></div>
            <span className="brand-name">RateX</span>
          </div>
          <div className="pub-nav-right">
            <div className="rate-live hide-sm">
              <div className="rate-live-dot" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                {enabledOptions.slice(0, 2).map((opt, i) => (
                  <span key={opt.id}>{opt.label}: {opt.rate} LYD{i < enabledOptions.slice(0,2).length - 1 ? ' | ' : ''}</span>
                ))}
              </span>
            </div>
            <button className="btn btn-outline" onClick={() => navigate('/admin/login')}>Admin</button>
            <button className="btn btn-primary" onClick={() => navigate('/request')}>
              Sell USD <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero-section">
        <div className="container">
          <motion.div {...fade(0)}>
            <div className="hero-eyebrow">
              <Star size={14} /> Trusted by 1,000+ clients across Libya
            </div>
          </motion.div>
          <motion.h1 className="hero-title" {...fade(0.08)}>
            Sell Your Dollar.<br />
            <span>Get Paid Instantly.</span>
          </motion.h1>
          <motion.p className="hero-sub" {...fade(0.14)}>
            Fast, secure, and transparent USD exchange. Submit your request online — we contact you within minutes.
          </motion.p>
          <motion.div className="hero-actions" {...fade(0.2)}>
            <button className="btn btn-primary btn-xl" onClick={() => navigate('/request')}>
              Create Request <ArrowRight size={18} />
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}>
              How it works
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Live Rates ── */}
      <section className="rate-section">
        <div className="container">
          <div className="section-label">Live Rates</div>
          <div className="rate-grid">
            {enabledOptions.map((opt, idx) => (
              <motion.div key={opt.id} className="rate-card" {...fade(0.1 + idx * 0.08)}>
                <div className="rate-card-label">{opt.icon} {opt.label}</div>
                <div className="rate-card-value">{opt.rate}</div>
                <div className="rate-unit">LYD per USD</div>
                <div className="rate-live">
                  <div className="rate-live-dot" />
                  <span className="rate-live-text">Active</span>
                </div>
              </motion.div>
            ))}
            <motion.div className="rate-card" {...fade(0.26)}>
              <div className="rate-card-label">⚡ Settlement Time</div>
              <div className="rate-card-value" style={{ fontSize: 28 }}>Same Day</div>
              <div className="rate-unit">Within business hours</div>
              <div className="rate-live">
                <div className="rate-live-dot" />
                <span className="rate-live-text">Guaranteed</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section>
        <div className="container">
          <div className="trust-row">
            {[
              { icon: <Shield size={20} />, label: 'Fully Secure' },
              { icon: <Clock size={20} />, label: 'Fast Processing' },
              { icon: <TrendingUp size={20} />, label: 'Transparent Pricing' },
              { icon: <CheckCircle size={20} />, label: 'Verified Agency' },
            ].map((t) => (
              <div className="trust-item" key={t.label}>
                <div className="trust-icon">{t.icon}</div>
                <span className="trust-label">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="steps-section" id="how-it-works">
        <div className="container">
          <div className="section-label">How it works</div>
          <div className="section-title">Three simple steps.</div>
          <div className="steps-grid">
            {[
              { n: '01', title: 'Submit Your Request', desc: 'Fill out the quick form with your USD amount, source of funds, and contact details.' },
              { n: '02', title: 'We Contact You', desc: 'Our team reaches out via WhatsApp within minutes to confirm the transaction details.' },
              { n: '03', title: 'Get Paid', desc: 'Receive your local currency in cash or direct bank transfer — same day.' },
            ].map((s) => (
              <motion.div className="step-card" key={s.n} {...fade(0.1)}>
                <div className="step-num">{s.n}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </motion.div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <button className="btn btn-primary btn-xl" onClick={() => navigate('/request')}>
              Start Now <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="pub-footer">
        <div className="container pub-footer-inner">
          <div className="brand">
            <div className="brand-mark"><Zap size={16} fill="white" /></div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>RateX</span>
          </div>
          <div className="footer-links">
            {['Privacy', 'Terms', 'Support'].map((l) => <a key={l} href="#" className="footer-link">{l}</a>)}
          </div>
          <span className="footer-copy">© 2026 RateX Exchange. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default PublicHome;
