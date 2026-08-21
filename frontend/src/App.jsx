import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layouts/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import RoleBasedRoute from './components/RoleBasedRoute'
import DashboardPage from './pages/DashboardPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import EquipmentPage from './pages/EquipmentPage'
import EquipmentDetailPage from './pages/EquipmentDetailPage'
import SensorChartsPage from './pages/SensorChartsPage'
import InterventionsPage from './pages/InterventionsPage'
import AlertsPage from './pages/AlertsPage'
import UsersPage from './pages/UsersPage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import MyInterventionsPage from './pages/MyInterventionsPage'
import ActivityLogPage from './pages/ActivityLogPage'
import PredictionsPage from './pages/PredictionsPage'
import InterventionRequestsPage from './pages/InterventionRequestsPage'
import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* All /app routes require authentication */}
      <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />

        {/* Shared: operational dashboard (not for Admin/Technician) */}
        <Route path="dashboard" element={<RoleBasedRoute><DashboardPage /></RoleBasedRoute>} />

        {/* Admin-only dashboard (users stats) */}
        <Route path="admin-dashboard" element={<RoleBasedRoute><AdminDashboardPage /></RoleBasedRoute>} />

        {/* Admin-only pages */}
        <Route path="users" element={<RoleBasedRoute><UsersPage /></RoleBasedRoute>} />

        {/* Shared: Admin, Maintenance Manager, Technician (read), Operations Manager (read) */}
        <Route path="equipment" element={<RoleBasedRoute><EquipmentPage /></RoleBasedRoute>} />
        <Route path="equipment/:id" element={<RoleBasedRoute><EquipmentDetailPage /></RoleBasedRoute>} />
        <Route path="equipment/:id/sensors" element={<RoleBasedRoute><SensorChartsPage /></RoleBasedRoute>} />
        <Route path="alerts" element={<RoleBasedRoute><AlertsPage /></RoleBasedRoute>} />

        {/* Admin, Maintenance Manager, Operations Manager (read) */}
        <Route path="interventions" element={<RoleBasedRoute><InterventionsPage /></RoleBasedRoute>} />

        {/* Technicien-only */}
        <Route path="my-interventions" element={<RoleBasedRoute><MyInterventionsPage /></RoleBasedRoute>} />

        {/* Superviseur — Activity Log */}
        <Route path="activity-log" element={<RoleBasedRoute><ActivityLogPage /></RoleBasedRoute>} />

        {/* AI Predictions — Superviseur + Resp. maintenance */}
        <Route path="predictions" element={<RoleBasedRoute><PredictionsPage /></RoleBasedRoute>} />

        {/* Intervention Requests (DI) — accessible to all */}
        <Route path="requests" element={<RoleBasedRoute><InterventionRequestsPage /></RoleBasedRoute>} />

        {/* Profile - accessible to all authenticated users */}
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}

export default App
