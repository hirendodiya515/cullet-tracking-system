import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import DataEntry from './pages/DataEntry';
import Settings from './pages/Settings';
import FormSetup from './pages/FormSetup';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard'; // Assuming Dashboard is now a page component

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Operator Route - Data Entry Only */}
        <Route element={<ProtectedRoute allowedRoles={['Operator', 'Engineer', 'Admin']} />}>
          <Route path="/entry" element={
            <MainLayout>
              <DataEntry />
            </MainLayout>
          } />
        </Route>

        {/* Admin/Engineer Route - Dashboard */}
        <Route element={<ProtectedRoute allowedRoles={['Admin', 'Engineer']} />}>
          <Route path="/dashboard" element={
            <MainLayout>
              <Dashboard />
            </MainLayout>
          } />
        </Route>

        {/* Admin Only Route - Settings */}
        <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
          <Route path="/settings" element={
            <div className="flex h-screen bg-slate-50">
              <Sidebar />
              <main className="flex-1 overflow-auto"><Settings /></main>
            </div>
          } />
          <Route path="/form-setup" element={
            <div className="flex h-screen bg-slate-50">
              <Sidebar />
              <main className="flex-1 overflow-auto"><FormSetup /></main>
            </div>
          } />
        </Route>

        {/* Fallback routing */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
