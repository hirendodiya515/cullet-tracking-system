import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // If user's role is not authorized, redirect to their safe default page
    if (userRole === 'Operator') return <Navigate to="/entry" replace />;
    if (userRole === 'Admin' || userRole === 'Engineer') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/" replace />; // fallback
  }

  return <Outlet />;
}
