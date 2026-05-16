import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const rawUser = localStorage.getItem('user');

  if (!token || !rawUser) {
    return <Navigate to="/" replace />;
  }

  let user;
  try {
    user = JSON.parse(rawUser);
  } catch {
    localStorage.clear();
    return <Navigate to="/" replace />;
  }

  if (!user?.role) {
    localStorage.clear();
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
