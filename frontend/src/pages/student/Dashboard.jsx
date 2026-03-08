import useAuthStore from '../../store/authStore'
import { useNavigate } from 'react-router-dom'

export default function StudentDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Student Dashboard</h1>
        <button onClick={handleLogout} className="bg-red-600 px-4 py-2 rounded-lg text-sm">Logout</button>
      </div>
      <p className="text-gray-400">Welcome, {user?.name}! Build your student features here.</p>
      {/* TODO: Add TimeLog, Evaluations, Documents components */}
    </div>
  )
}
