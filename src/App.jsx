import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import PublicHome from './pages/PublicHome';
import RequestForm from './pages/RequestForm';
import Confirmation from './pages/Confirmation';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import DashboardOverview from './pages/dashboard/DashboardOverview';
import RequestsManager from './pages/dashboard/RequestsManager';
import RequestDetail from './pages/dashboard/RequestDetail';
import Settings from './pages/dashboard/Settings';
import Team from './pages/dashboard/Team';
import TeamManagement from './pages/dashboard/TeamManagement';
import Reports from './pages/dashboard/Reports';
import Sales from './pages/dashboard/Sales';
import CardPurchases from './pages/dashboard/CardPurchases';
import UsdtSales from './pages/dashboard/UsdtSales';
import Accounts from './pages/dashboard/Accounts';
import Transactions from './pages/dashboard/Transactions';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useApp();
  if (!user) return <Navigate to="/admin/login" replace />;
  // Allow both 'admin' (legacy) and 'super_admin' (new) roles
  if (adminOnly && user.role !== 'admin' && user.role !== 'super_admin') return <Navigate to="/admin/dashboard" replace />;
  return children;
};

const LoadingScreen = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#f8fafc', gap: 20,
  }}>
    <div style={{ width: 48, height: 48, background: '#2563eb', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
    </div>
    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>RateX</div>
    <div style={{ display: 'flex', gap: 6 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%', background: '#2563eb',
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
    <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`}</style>
  </div>
);

const AppInner = () => {
  const { loading } = useApp();
  if (loading) return <LoadingScreen />;

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicHome />} />
        <Route path="/request" element={<RequestForm />} />
        <Route path="/confirmation" element={<Confirmation />} />

        {/* Admin Auth */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Admin Dashboard */}
        <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}>
          <Route index element={<DashboardOverview />} />
          <Route path="requests" element={<RequestsManager />} />
          <Route path="requests/:id" element={<RequestDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="sales" element={<Sales />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="card-purchases" element={<CardPurchases />} />
          <Route path="usdt-sales" element={<UsdtSales />} />
          <Route path="team" element={<ProtectedRoute adminOnly><TeamManagement /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

const App = () => (
  <AppProvider>
    <AppInner />
  </AppProvider>
);

export default App;
