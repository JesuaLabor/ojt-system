import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

// Role Dashboards
import StudentDashboard from './pages/student/Dashboard'
import SupervisorDashboard from './pages/supervisor/Dashboard'
import CoordinatorDashboard from './pages/coordinator/Dashboard'
import FacultyDashboard from './pages/faculty/Dashboard'
import UIKit from './pages/UIKit'

// Role-based redirect
function RoleRedirect({ user }) {
  const routes = {
    student: '/student',
    supervisor: '/supervisor',
    coordinator: '/coordinator',
    faculty: '/faculty',
  }
  return <Navigate to={routes[user.role] || '/login'} replace />
}

// Protected Route
function PrivateRoute({ children, allowedRoles }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { token, user, fetchMe } = useAuthStore()

  useEffect(() => {
    if (token && !user) fetchMe()
  }, [token])

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/ui-kit" element={<UIKit />} />

        {/* Auto redirect based on role */}
        <Route path="/" element={
          user ? <RoleRedirect user={user} /> : <Navigate to="/login" replace />
        } />

        {/* Student Routes */}
        <Route path="/student/*" element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentDashboard />
          </PrivateRoute>
        } />

        {/* Supervisor Routes */}
        <Route path="/supervisor/*" element={
          <PrivateRoute allowedRoles={['supervisor']}>
            <SupervisorDashboard />
          </PrivateRoute>
        } />

        {/* Coordinator Routes */}
        <Route path="/coordinator/*" element={
          <PrivateRoute allowedRoles={['coordinator']}>
            <CoordinatorDashboard />
          </PrivateRoute>
        } />

        {/* Faculty Routes */}
        <Route path="/faculty/*" element={
          <PrivateRoute allowedRoles={['faculty']}>
            <FacultyDashboard />
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
