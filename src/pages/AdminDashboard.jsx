import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useRequestStats } from '../hooks/useRequests';
import { BarChart2, Layers, Settings, Users, TrendingUp, LogOut, Menu, X, Zap, ShoppingCart, Wallet, CreditCard, DollarSign, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard = () => {
  const { user, logout, cashRate, bankRate } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const [mobile, setMobile] = useState(false);

  const { data: stats } = useRequestStats();

  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 900;
      setMobile(m);
      if (m) setOpen(false);
      else setOpen(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const pendingCount = useMemo(() => stats?.pending || 0, [stats]);

  const navItems = useMemo(() => [
    { to: '/admin/dashboard', icon: <BarChart2 size={18} />, label: 'Overview', exact: true },
    { to: '/admin/dashboard/requests', icon: <Layers size={18} />, label: 'Requests', badge: pendingCount || null },
    { to: '/admin/dashboard/reports', icon: <TrendingUp size={18} />, label: 'Reports' },
    { to: '/admin/dashboard/sales', icon: <ShoppingCart size={18} />, label: 'Sales' },
    { to: '/admin/dashboard/accounts', icon: <Wallet size={18} />, label: 'Treasury' },
    { to: '/admin/dashboard/transactions', icon: <FileText size={18} />, label: 'Ledger' },
    { to: '/admin/dashboard/card-purchases', icon: <CreditCard size={18} />, label: 'USDT Buy' },
    { to: '/admin/dashboard/usdt-sales', icon: <DollarSign size={18} />, label: 'USDT Sell' },
    ...(user?.role === 'admin' || user?.role === 'super_admin' ? [
      { to: '/admin/dashboard/team', icon: <Users size={18} />, label: 'Team' },
      { to: '/admin/dashboard/settings', icon: <Settings size={18} />, label: 'Settings' },
    ] : []),
  ], [user, pendingCount]);

  const pageTitle = navItems.find((n) => location.pathname === n.to)?.label
    ?? (location.pathname.includes('/requests/') ? 'Request Detail' : 'Dashboard');

  return (
    <div className="shell">
      {mobile && open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="brand">
            <div className="brand-mark"><Zap size={18} fill="white" /></div>
            <span className="brand-name">RateX</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Navigation</span>
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.exact}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={() => mobile && setOpen(false)}
            >
              {n.icon}
              {n.label}
              {n.badge ? <span className="nav-badge">{n.badge}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-rate-widget">
            <div className="sidebar-rate-row" style={{ marginBottom: 6 }}>
              <span className="sidebar-rate-label">Cash Rate</span>
              <span className="sidebar-rate-val">{cashRate} LYD</span>
            </div>
            <div className="sidebar-rate-row">
              <span className="sidebar-rate-label">Bank Rate</span>
              <span className="sidebar-rate-val">{bankRate} LYD</span>
            </div>
          </div>
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.username?.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{user?.username}</div>
              <div className="sidebar-user-role">{user?.role?.replace('_', ' ')}</div>
            </div>
            <button className="btn-icon" onClick={() => { logout(); navigate('/admin/login'); }} title="Log out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-icon" onClick={() => setOpen(!open)}>
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span className="topbar-title">{pageTitle}</span>
          </div>
          <div className="topbar-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--bg-muted)', borderRadius: 'var(--radius)' }}>
              <div style={{ width: 7, height: 7, background: 'var(--green-600)', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>System Online</span>
            </div>
          </div>
        </div>

        <div className="page-viewport">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
