import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';

// Demo Dashboard (works without backend)
import DemoDashboard from './pages/DemoDashboard';

// Auth
import Login from './pages/Login';

// Dashboards
import HQAdminDashboard from './pages/HQAdminDashboardSimple';
import StationCommanderDashboard from './pages/StationCommanderDashboard';
import LogisticsOfficerDashboard from './pages/LogisticsOfficerDashboard';
import MedicalOfficerDashboard from './pages/MedicalOfficerDashboardSimple';
import FieldCrewDashboard from './pages/FieldCrewDashboard';
import TestDashboard from './pages/TestDashboard';

import Layout from './components/Layout';

// DEMO MODE FLAG - Set to true to use demo dashboard without backend
const DEMO_MODE = false;

function ProtectedRoute({ children, allowedRoles }) {
  const { user, personnel, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-display text-xl text-slate-200">Loading…</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && personnel && !allowedRoles.includes(personnel.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
}

function AppRoutes() {
  const { personnel, loading } = useAuth();
  
  // Show loading only if explicitly loading
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-polar-dark">
        <div className="font-display text-xl text-ice-white">Establishing polar uplink…</div>
      </div>
    );
  }
  
  // If DEMO_MODE is true, always show demo dashboard
  if (DEMO_MODE) {
    return (
      <Routes>
        <Route path="*" element={<DemoDashboard />} />
      </Routes>
    );
  }
  
  const getDefaultRoute = () => {
    if (!personnel) return '/login';
    
    switch (personnel.role) {
      case 'HQ_ADMIN':
        return '/hq-admin';
      case 'STATION_COMMANDER':
        return '/commander';
      case 'LOGISTICS_OFFICER':
        return '/logistics';
      case 'MEDICAL_OFFICER':
        return '/medical';
      case 'FIELD_CREW':
        return '/field';
      default:
        return '/login';
    }
  };
  
  const defaultRoute = getDefaultRoute();
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      
      <Route path="/hq-admin" element={
        <ProtectedRoute allowedRoles={['HQ_ADMIN']}>
          <Layout><HQAdminDashboard /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/commander" element={
        <ProtectedRoute allowedRoles={['STATION_COMMANDER']}>
          <Layout><StationCommanderDashboard /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/logistics" element={
        <ProtectedRoute allowedRoles={['LOGISTICS_OFFICER']}>
          <Layout><LogisticsOfficerDashboard /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/medical" element={
        <ProtectedRoute allowedRoles={['MEDICAL_OFFICER']}>
          <Layout><MedicalOfficerDashboard /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/field" element={
        <ProtectedRoute allowedRoles={['FIELD_CREW']}>
          <Layout><FieldCrewDashboard /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/unauthorized" element={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Unauthorized Access</h1>
            <p>You don't have permission to access this page.</p>
          </div>
        </div>
      } />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <OfflineProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </OfflineProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
