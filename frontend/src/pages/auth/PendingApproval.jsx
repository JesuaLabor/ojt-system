import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function PendingApproval() {
  const { user, fetchMe, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
        navigate('/login')
        return
    }
    
    // If they somehow got here but are already active, send them home
    if (user.status === 'active') {
        const routes = {
            student: '/student',
            supervisor: '/supervisor',
            coordinator: '/coordinator',
            faculty: '/faculty',
        }
        navigate(routes[user.role] || '/')
    }

    // Polling or manual refresh check
    const interval = setInterval(() => {
        fetchMe()
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [user, navigate, fetchMe])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full animate-pulse delay-700"></div>
      </div>

      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative z-10 text-center">
        <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
          <svg className="w-10 h-10 text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-black text-white mb-2">Account Pending Approval</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Welcome, <span className="text-indigo-400 font-semibold">{user?.name}</span>. Your {user?.role} account has been created successfully, but is currently awaiting review by the School Coordinator.
        </p>

        <div className="bg-slate-800/40 rounded-2xl p-4 mb-8">
          <div className="flex items-center gap-3 text-left">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Awaiting Verification</p>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 text-left">
            This security measure ensures only authorized participants join the OJT Tracker platform. This page will refresh automatically once you are approved.
          </p>
        </div>

        <div className="flex flex-col gap-3">
            <button 
                onClick={() => fetchMe()}
                className="btn w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
            >
                Check Status Now
            </button>
            <button 
                onClick={() => logout()}
                className="btn w-full bg-transparent hover:bg-white/5 text-slate-400 font-medium py-3 px-6 rounded-2xl transition-all"
            >
                Sign Out
            </button>
        </div>

        <p className="mt-8 text-[10px] text-slate-600 uppercase tracking-widest">
            OJT Performance Monitoring System
        </p>
      </div>
    </div>
  )
}
