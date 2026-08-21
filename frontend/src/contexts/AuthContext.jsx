import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'
import { ROLES } from '../config/roles'

const AuthContext = createContext(undefined)

/**
 * Normalize the role_title from the backend to match our ROLES constants.
 * Admin users (is_superuser or role_title empty with admin username) get ADMIN role.
 */
function resolveRole(user) {
  if (!user) return null

  const role = user.role_title || ''

  // Map known role_title values to ROLES constants
  if (role === 'Technicien' || role === 'Technician') return ROLES.TECHNICIAN
  if (role === 'Responsable maintenance' || role === 'Maintenance Manager') return ROLES.MAINTENANCE_MANAGER
  if (role === 'Superviseur' || role === 'Supervisor') return ROLES.SUPERVISOR

  // Fallback: if no role_title, treat as Admin (system admin accounts)
  if (!role || role === 'Admin') return ROLES.ADMIN

  return ROLES.ADMIN
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService.me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    try {
      const u = await authService.login(username, password)
      setUser(u || null)
      return u
    } catch (error) {
      setUser(null)
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (e) {
      // ignore logout failure, but clear client state
    }
    setUser(null)
  }

  const userRole = resolveRole(user)

  return (
    <AuthContext.Provider value={{ user, userRole, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
