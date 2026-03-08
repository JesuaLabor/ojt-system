import useAuthStore from '../../store/authStore'
import { useNavigate } from 'react-router-dom'

export default function SupervisorDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Supervisor Dashboard</h1>
        <button onClick={() => { logout(); navigate('/login') }} className="bg-red-600 px-4 py-2 rounded-lg text-sm">Logout</button>
      </div>
      <p className="text-gray-400">Welcome, {user?.name}! Build supervisor features here.</p>
    </div>
  )
}
