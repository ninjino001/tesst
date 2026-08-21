import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { canAccessRoute, getDefaultRoute } from '../config/roles'

/**
 * RoleBasedRoute — wraps a route and checks if the current user's role
 * has access. If not, redirects to their default route.
 *
 * Usage:
 *   <Route path="users" element={<RoleBasedRoute><UsersPage /></RoleBasedRoute>} />
 */
export default function RoleBasedRoute({ children }) {
  const { user, userRole, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loader">Loading...</div>
      </div>
    )
  }

  // Not logged in → go to login
  if (!user) return <Navigate to="/login" replace />

  // Check role access
  if (!canAccessRoute(userRole, location.pathname)) {
    // Redirect to their default allowed route
    return <Navigate to={getDefaultRoute(userRole)} replace />
  }

  return <>{children}</>
}
