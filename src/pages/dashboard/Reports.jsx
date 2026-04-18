import React, { useMemo } from 'react';
import { useAllRequests, useRequestStats } from '../../hooks/useRequests';
import { TrendingUp, DollarSign, FileText, PercentSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion } from 'framer-motion';

const Reports = () => {
  const { data: allRequests = [], isLoading: requestsLoading } = useAllRequests();
  const { data: requestStats = {} } = useRequestStats();

  const stats = useMemo(() => {
    const done = allRequests.filter((r) => r.status === 'completed');
    const totalUSD = requestStats.totalUSD || 0;
    const sold = done.filter((r) => r.saleRate && r.saleRate > 0);
    const totalRevenue = sold.reduce((s, r) => s + r.usdAmount * r.saleRate, 0);
    const soldCost = sold.reduce((s, r) => s + r.localAmount, 0);
    const realProfit = totalRevenue - soldCost;
    const conversion = requestStats.total > 0 ? ((requestStats.completed || 0) / requestStats.total * 100).toFixed(1) : 0;
    return {
      totalUSD,
      totalRevenue,
      realProfit,
      soldDeals: sold.length,
      conversion,
      total: requestStats.total || 0,
      completed: requestStats.completed || 0
    };
  }, [allRequests, requestStats]);

  const daily = useMemo(() => {
    const days = 14;
    const now = new Date();
    const completedWithRates = allRequests.filter((r) => r.status === 'completed' && r.saleRate && r.saleRate > 0);
    
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().split('T')[0];
      const dayReqs = completedWithRates.filter((r) => r.timestamp?.startsWith(key));
      const vol = dayReqs.reduce((s, r) => s + r.usdAmount, 0);
      const revenue = dayReqs.reduce((s, r) => s + r.usdAmount * r.saleRate, 0);
      const cost = dayReqs.reduce((s, r) => s + r.localAmount, 0);
      const profit = revenue - cost;
      return {
        name: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        profit: Math.max(0, Math.round(profit)),
        usd: vol,
        count: dayReqs.length,
      };
    });
  }, [allRequests]);

  const pieData = useMemo(() => [
    { name: 'Cash', value: allRequests.filter(r => r.payoutMethod === 'cash').length },
    { name: 'Bank Transfer', value: allRequests.filter(r => r.payoutMethod === 'bank_transfer').length },
    { name: 'MasterCard', value: allRequests.filter(r => r.fundSource === 'mastercard').length },
  ].filter(d => d.value > 0), [allRequests]);

  const COLORS = ['var(--blue-600)', 'var(--green-600)', 'var(--purple-600)'];

  const kpis = [
    { label: 'Real Net Profit', value: stats.soldDeals > 0 ? `${stats.realProfit.toLocaleString('en', { maximumFractionDigits: 0 })} LYD` : '— (record sales to unlock)', icon: <TrendingUp size={20} />, cls: 'si-green' },
    { label: 'Total USD Processed', value: `$${stats.totalUSD.toLocaleString()}`, icon: <DollarSign size={20} />, cls: 'si-blue' },
    { label: 'Total Requests', value: stats.total, icon: <FileText size={20} />, cls: 'si-amber' },
    { label: 'Conversion Rate', value: `${stats.conversion}%`, icon: <PercentSquare size={20} />, cls: 'si-purple' },
  ];

  if (requestsLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading reports...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Reports & Analytics</div>
        <div className="page-sub">Comprehensive financial performance data for your operation.</div>
      </div>

      <div className="report-kpi">
        {kpis.map((k, i) => (
          <motion.div className="stat-card" key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className="stat-icon-row">
              <div className={`stat-icon ${k.cls}`}>{k.icon}</div>
            </div>
            <div className="stat-value">{k.value}</div>
            <div className="stat-label">{k.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Daily Performance (14 Days)</div>
              <div className="chart-sub">Requests and estimated profit by day</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={daily} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={40} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} />
              <Bar dataKey="usd" fill="var(--blue-600)" radius={[4, 4, 0, 0]} name="USD Volume" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div style={{ marginBottom: 16 }}>
            <div className="chart-title">Method Breakdown</div>
            <div className="chart-sub">Payout & fund source distribution</div>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={84} paddingAngle={3} dataKey="value">
                  {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Legend formatter={(v) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v}</span>} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-sub">No data yet</div>
            </div>
          )}
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 20 }}>
          <div className="chart-title">Daily Profit Breakdown</div>
          <div className="chart-sub">Estimated profit per day (2% margin applied)</div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              <th>Date</th>
              <th className="right">USD Volume</th>
              <th className="right">Requests</th>
              <th className="right">Est. Profit (LYD)</th>
            </tr></thead>
            <tbody>
              {daily.filter(d => d.usd > 0).reverse().map((d) => (
                <tr key={d.name}>
                  <td>{d.name}</td>
                  <td className="right"><span className="amount-primary">${d.usd.toLocaleString()}</span></td>
                  <td className="right">{d.count}</td>
                  <td className="right" style={{ color: 'var(--green-600)', fontWeight: 700 }}>{d.profit.toLocaleString()} LYD</td>
                </tr>
              ))}
              {daily.filter(d => d.usd > 0).length === 0 && (
                <tr><td colSpan={4}><div className="empty-state"><div className="empty-sub">No completed transactions yet.</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
