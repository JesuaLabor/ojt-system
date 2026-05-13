import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import { SocketProvider } from './context/SocketContext'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import PendingApproval from './pages/auth/PendingApproval'

// Role Dashboards
import StudentDashboard from './pages/student/Dashboard'
import SupervisorDashboard from './pages/supervisor/Dashboard'
import CoordinatorDashboard from './pages/coordinator/Dashboard'
import FacultyDashboard from './pages/faculty/Dashboard'
import UIKit from './pages/UIKit'

// Role-based redirect
function RoleRedirect({ user }) {
  if (user.status === 'pending') return <Navigate to="/waiting-room" replace />
  
  const routes = {
    student: '/student',
    supervisor: '/supervisor',
    coordinator: '/coordinator',
    faculty: '/faculty',
    admin: '/admin',
  }
  return <Navigate to={routes[user.role] || '/login'} replace />
}

// Full-screen loading splash shown while fetchMe() is in flight
function AuthLoading() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#030712'
    }}>
      <div style={{
        width: 40, height: 40, border: '3px solid #1e293b',
        borderTop: '3px solid #14b8a6', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// Protected Route
function PrivateRoute({ children, allowedRoles }) {
  const { user, token, isLoading } = useAuthStore()

  // No token at all → go to login
  if (!token) return <Navigate to="/login" replace />

  // Token exists but user not yet fetched (e.g. page refresh) → wait
  if (!user || isLoading) return <AuthLoading />

  // Pending users go to waiting room
  if (user.status === 'pending') return <Navigate to="/waiting-room" replace />

  // Wrong role → go to login
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />

  return children
}

export default function App() {
  const { token, user, fetchMe } = useAuthStore()

  useEffect(() => {
    if (token && !user) fetchMe()
  }, [token])

  return (
    <BrowserRouter>
      <SocketProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* ... */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/waiting-room" element={<PendingApproval />} />
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

          {/* Admin Routes (Super access using Coordinator Dashboard) */}
          <Route path="/admin/*" element={
            <PrivateRoute allowedRoles={['admin']}>
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
      </SocketProvider>
    </BrowserRouter>
  )
}
