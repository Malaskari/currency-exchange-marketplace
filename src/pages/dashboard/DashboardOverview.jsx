import React, { useMemo, useState } from 'react';
import { useAllRequests, useRequestStats } from '../../hooks/useRequests';
import { useAccountSummary } from '../../hooks/useAccounts';
import { DollarSign, Layers, Clock, CheckCircle2, TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight, Wallet, TrendingDown, PieChart, Users } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const DashboardOverview = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('7d');
  const { data: allRequests = [], isLoading } = useAllRequests();
  const { data: stats = {}, isLoading: statsLoading } = useRequestStats();
  const { data: treasurySummary = [] } = useAccountSummary();

  const recentRequests = useMemo(() => allRequests.slice(0, 5), [allRequests]);

  const chartData = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const now = new Date();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().split('T')[0];
      const dayReqs = allRequests.filter((r) => r.timestamp?.startsWith(key) && r.status === 'completed');
      return {
        name: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        volume: dayReqs.reduce((s, r) => s + r.usdAmount, 0),
        count: dayReqs.length,
      };
    });
  }, [allRequests, period]);

  const statusDist = useMemo(() => {
    const total = stats.total || 0;
    const completed = stats.completed || 0;
    const pending = stats.pending || 0;
    const processing = allRequests.filter(r => r.status === 'processing').length;
    const rejected = allRequests.filter(r => r.status === 'rejected').length;
    return [
      { label: 'Completed', value: total > 0 ? Math.round((completed / total) * 100) : 0, color: 'var(--green-600)' },
      { label: 'Pending', value: total > 0 ? Math.round((pending / total) * 100) : 0, color: 'var(--amber-600)' },
      { label: 'Processing', value: total > 0 ? Math.round((processing / total) * 100) : 0, color: 'var(--blue-600)' },
      { label: 'Rejected', value: total > 0 ? Math.round((rejected / total) * 100) : 0, color: 'var(--red-600)' },
    ];
  }, [stats, allRequests]);

  const statCards = useMemo(() => [
    { label: 'LYD Cash & Bank', value: (treasurySummary.find(s => s.currency === 'LYD' && (s.account_type === 'cash' || s.account_type === 'bank'))?.total_balance || 0).toLocaleString() + ' LYD', trend: 'LYD Pool', up: true, icon: <Wallet size={20} />, cls: 'si-blue', onClick: () => navigate('/admin/dashboard/accounts') },
    { label: 'USD Vendor', value: '$' + (treasurySummary.find(s => s.currency === 'USD' && s.account_type === 'vendor')?.total_balance || 0).toLocaleString(), trend: 'Vendor Account', up: true, icon: <DollarSign size={20} />, cls: 'si-green', onClick: () => navigate('/admin/dashboard/accounts') },
    { label: 'USDT Voucher', value: (treasurySummary.find(s => s.currency === 'USDT' && s.account_type === 'voucher')?.total_balance || 0).toLocaleString() + ' USDT', trend: 'Voucher Holding', up: true, icon: <PieChart size={20} />, cls: 'si-purple', onClick: () => navigate('/admin/dashboard/accounts') },
    { label: 'Pending Requests', value: allRequests.filter(r => r.status === 'pending').length, trend: 'Action Needed', up: false, icon: <Clock size={20} />, cls: 'si-amber', onClick: () => navigate('/admin/dashboard/requests') },
  ], [treasurySummary, allRequests, navigate]);

  const usdtCards = [
    { label: 'USD Payouts', value: `$${(stats.totalUSD || 0).toLocaleString()}`, trend: 'USD Volume', icon: <DollarSign size={20} />, cls: 'si-green', onClick: () => navigate('/admin/dashboard/reports') },
    { label: 'Total Sales (LYD)', value: `${(stats.totalLyd || 0).toLocaleString()}`, trend: 'LYD Gross', icon: <TrendingUp size={20} />, cls: 'si-blue', onClick: () => navigate('/admin/dashboard/reports') },
    { label: 'Active Personnel', value: '3', trend: 'Team', icon: <Users size={20} />, cls: 'si-purple', onClick: () => navigate('/admin/dashboard/team') },
    { label: 'Completed Req.', value: (stats.completed || 0), trend: 'Processed', icon: <CheckCircle2 size={20} />, cls: 'si-amber', onClick: () => navigate('/admin/dashboard/requests') },
  ];

  if (isLoading || statsLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="page-title">Performance Overview</div>
          <div className="page-sub">Real-time analytics for your exchange operation.</div>
        </div>
        <button className="btn btn-outline btn-sm"><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="stats-grid">
        {statCards.map((s, i) => (
          <motion.div className="stat-card" key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.4 }}>
            <div className="stat-icon-row">
              <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
              <div className={`stat-trend ${s.up ? 'st-up' : 'st-neu'}`}>
                {s.up ? <ArrowUpRight size={12} /> : null}{s.trend}
              </div>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* USDT Section */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>USDT Operations</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/dashboard/card-purchases')}>Cards</button>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/dashboard/usdt-sales')}>Sales</button>
          </div>
        </div>
        <div className="stats-grid">
          {usdtCards.map((s, i) => (
            <motion.div 
              className="stat-card" 
              key={s.label} 
              initial={{ opacity: 0, y: 12 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: (statCards.length + i) * 0.07, duration: 0.4 }}
              style={{ cursor: 'pointer' }}
              onClick={s.onClick}
            >
              <div className="stat-icon-row">
                <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.trend}</div>
              </div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Volume Analytics</div>
              <div className="chart-sub">USD volume by day</div>
            </div>
            <div className="period-tabs">
              {['7d', '30d', '90d'].map((p) => (
                <button key={p} className={`period-tab${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>{p.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--blue-600)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--blue-600)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={40} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13 }} cursor={{ stroke: 'var(--blue-600)', strokeWidth: 1.5 }} />
              <Area type="monotone" dataKey="volume" stroke="var(--blue-600)" strokeWidth={2.5} fill="url(#vg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 16 }}>
            <div className="chart-title">Status Breakdown</div>
            <div className="chart-sub">Request distribution</div>
          </div>
          {statusDist.map((d) => (
            <div className="dist-item" key={d.label}>
              <div className="dist-row">
                <span className="dist-label">{d.label}</span>
                <span className="dist-pct">{d.value}%</span>
              </div>
              <div className="dist-track">
                <motion.div className="dist-fill" style={{ background: d.color }} initial={{ width: 0 }} animate={{ width: `${d.value}%` }} transition={{ duration: 1.2, delay: 0.3 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Total requests</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>{stats.total || 0}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Recent Requests</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/dashboard/requests')}>View all →</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>ID</th><th>Client</th><th className="right">USD</th><th className="right">LYD</th><th className="center">Status</th>
            </tr></thead>
            <tbody>
              {recentRequests.map((r) => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/dashboard/requests/${r.id}`)}>
                  <td><code style={{ fontSize: 12, background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: 4 }}>{r.id}</code></td>
                  <td><div className="contact-name">{r.fullName || r.contactInfo || '—'}</div></td>
                  <td className="right"><span className="amount-primary">${r.usdAmount.toLocaleString()}</span></td>
                  <td className="right">{r.localAmount.toLocaleString('en', { maximumFractionDigits: 0 })} LYD</td>
                  <td className="center"><span className={`badge badge-${r.status}`}><span className={`dot dot-${r.status}`} />{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
