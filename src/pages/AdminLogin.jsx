import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Lock, User, ChevronRight, Zap, Shield, Globe, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const success = await login(username, password);
    if (success) {
      navigate('/admin/dashboard');
    } else {
      setError('Invalid credentials. Please verify and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'stretch', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Left Panel: Branding ──────────────────── */}
      <div style={{
        flex: 1,
        display: 'none',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px',
        background: 'linear-gradient(135deg, #0f172a 0%, #0a0a0a 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        '@media (min-width: 900px)': { display: 'flex' }
      }} className="login-left-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, background: '#2563eb', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(37,99,235,0.4)' }}>
            <Zap size={20} fill="white" color="white" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', textTransform: 'uppercase', lineHeight: 1 }}>RateX</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 3 }}>Admin Suite</div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20 }}>
            Global Exchange Backbone
          </div>
          <h2 style={{ fontSize: 52, fontWeight: 800, color: '#fff', letterSpacing: '-0.05em', lineHeight: 1, marginBottom: 24 }}>
            The engine<br />
            <span style={{ color: '#2563eb' }}>behind</span><br />
            exchange.
          </h2>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.7, maxWidth: 380, fontWeight: 400 }}>
            Manage thousands of transactions, monitor real-time liquidity, and scale your marketplace with institutional‑grade tools.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 40 }}>
          {[['2.4ms', 'Latency'], ['99.9%', 'Uptime'], ['256-bit', 'Encryption']].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel: Login Form ───────────────── */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', background: '#0f0f0f' }}>
        <motion.div
          style={{ width: '100%' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48, justifyContent: 'center' }} className="login-mobile-logo">
            <div style={{ width: 36, height: 36, background: '#2563eb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} fill="white" color="white" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', textTransform: 'uppercase' }}>RateX</span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 100, marginBottom: 20 }}>
              <Shield size={13} color="#2563eb" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Secure Access</span>
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 8 }}>Sign in to Portal</h1>
            <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 400, lineHeight: 1.5 }}>Enter your credentials to access the admin dashboard.</p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 14, marginBottom: 24 }}
              >
                <AlertCircle size={16} color="#f87171" />
                <span style={{ fontSize: 13, color: '#fca5a5', fontWeight: 500 }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <User size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 46px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#fff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 46px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#fff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.01, y: isLoading ? 0 : -1 }}
              whileTap={{ scale: 0.99 }}
              style={{
                marginTop: 8,
                width: '100%',
                height: 56,
                background: isLoading ? '#1d3a7a' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.03em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 8px 32px rgba(37,99,235,0.35)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s, box-shadow 0.2s',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {isLoading ? (
                <>
                  <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In <ChevronRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'center', gap: 28 }}>
            {[['Globe', 'Global Vault'], ['Zap', 'Rapid Sync']].map(([, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.3 }}>
                {label === 'Global Vault' ? <Globe size={12} color="#fff" /> : <Zap size={12} color="#fff" />}
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 10, color: '#374151', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.8 }}>
            © 2026 RateX Infrastructure<br />Access is monitored and logged.
          </p>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-left-panel { display: none; }
        @media (min-width: 900px) { .login-left-panel { display: flex !important; } }
        @media (max-width: 899px) { .login-mobile-logo { display: flex !important; } }
        @media (min-width: 900px) { .login-mobile-logo { display: none !important; } }
        input::placeholder { color: #4b5563; }
      `}</style>
    </div>
  );
};

export default AdminLogin;
