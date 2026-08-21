/**
 * Role-based access configuration for AIMOS
 * Maps each role to its allowed routes and sidebar navigation items.
 *
 * Roles:
 *   - Admin : System admin — manages users only (no operational data)
 *   - Superviseur : Full surveillance — all operational views, dashboard + analytics
 *   - Responsable maintenance : Manages equipment + interventions + dashboard
 *   - Technicien : Executes assigned interventions (no dashboard)
 */

export const ROLES = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Superviseur',
  MAINTENANCE_MANAGER: 'Responsable maintenance',
  TECHNICIAN: 'Technicien',
}

/**
 * Sidebar navigation items per role.
 */
export const SIDEBAR_CONFIG = {
  [ROLES.ADMIN]: [
    { key: 'admin-dashboard', path: '/app/admin-dashboard', labelKey: 'sidebar.admin_dashboard' },
    { key: 'users', path: '/app/users', labelKey: 'sidebar.users' },
  ],
  [ROLES.SUPERVISOR]: [
    { key: 'dashboard', path: '/app/dashboard', labelKey: 'sidebar.dashboard' },
    { key: 'equipment', path: '/app/equipment', labelKey: 'sidebar.equipment' },
    { key: 'interventions', path: '/app/interventions', labelKey: 'sidebar.interventions' },
    { key: 'requests', path: '/app/requests', labelKey: 'sidebar.requests' },
    { key: 'predictions', path: '/app/predictions', labelKey: 'sidebar.predictions' },
    { key: 'alerts', path: '/app/alerts', labelKey: 'sidebar.alerts' },
    { key: 'activity-log', path: '/app/activity-log', labelKey: 'sidebar.activity_log' },
  ],
  [ROLES.MAINTENANCE_MANAGER]: [
    { key: 'dashboard', path: '/app/dashboard', labelKey: 'sidebar.dashboard' },
    { key: 'equipment', path: '/app/equipment', labelKey: 'sidebar.equipment' },
    { key: 'interventions', path: '/app/interventions', labelKey: 'sidebar.interventions' },
    { key: 'requests', path: '/app/requests', labelKey: 'sidebar.requests' },
    { key: 'predictions', path: '/app/predictions', labelKey: 'sidebar.predictions' },
    { key: 'alerts', path: '/app/alerts', labelKey: 'sidebar.alerts' },
  ],
  [ROLES.TECHNICIAN]: [
    { key: 'my-interventions', path: '/app/my-interventions', labelKey: 'sidebar.my_interventions' },
    { key: 'requests', path: '/app/requests', labelKey: 'sidebar.requests' },
    { key: 'equipment', path: '/app/equipment', labelKey: 'sidebar.equipment' },
    { key: 'alerts', path: '/app/alerts', labelKey: 'sidebar.alerts' },
  ],
}

/**
 * Allowed route paths per role.
 */
export const ALLOWED_ROUTES = {
  [ROLES.ADMIN]: [
    '/app/admin-dashboard',
    '/app/users',
  ],
  [ROLES.SUPERVISOR]: [
    '/app/dashboard',
    '/app/equipment',
    '/app/interventions',
    '/app/requests',
    '/app/predictions',
    '/app/alerts',
    '/app/activity-log',
  ],
  [ROLES.MAINTENANCE_MANAGER]: [
    '/app/dashboard',
    '/app/equipment',
    '/app/interventions',
    '/app/requests',
    '/app/predictions',
    '/app/alerts',
  ],
  [ROLES.TECHNICIAN]: [
    '/app/my-interventions',
    '/app/requests',
    '/app/equipment',
    '/app/alerts',
  ],
}

/**
 * Default redirect path after login per role.
 */
export const DEFAULT_ROUTE = {
  [ROLES.ADMIN]: '/app/admin-dashboard',
  [ROLES.SUPERVISOR]: '/app/dashboard',
  [ROLES.MAINTENANCE_MANAGER]: '/app/dashboard',
  [ROLES.TECHNICIAN]: '/app/my-interventions',
}

/**
 * Utility: get sidebar items for a given role.
 */
export function getSidebarForRole(role) {
  return SIDEBAR_CONFIG[role] || []
}

/**
 * Utility: check if a role has access to a given path.
 */
export function canAccessRoute(role, path) {
  const routes = ALLOWED_ROUTES[role]
  if (!routes) return false
  return routes.some((r) => path.startsWith(r))
}

/**
 * Utility: get the default route for a role.
 */
export function getDefaultRoute(role) {
  return DEFAULT_ROUTE[role] || '/app/users'
}
