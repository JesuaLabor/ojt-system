import Layout from '../../components/layout/Layout'
import useAuthStore from '../../store/authStore'

const stats = [
  { label: 'Required Hours', value: '600h', sub: 'Total OJT requirement', icon: '🎯', color: 'bg-indigo-500/15 text-indigo-400' },
  { label: 'Completed Hours', value: '0h', sub: 'Approved time logs', icon: '✅', color: 'bg-emerald-500/15 text-emerald-400' },
  { label: 'Remaining Hours', value: '600h', sub: 'Hours still needed', icon: '⏳', color: 'bg-amber-500/15 text-amber-400' },
  { label: 'Overall Grade', value: 'N/A', sub: 'Average evaluation score', icon: '⭐', color: 'bg-purple-500/15 text-purple-400' },
]

export default function StudentDashboard() {
  const { user } = useAuthStore()

  return (
    <Layout>
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">👋</span>
          <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}!</h1>
        </div>
        <p className="page-sub">Here's an overview of your OJT progress.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs font-semibold text-white/80 mt-0.5">{s.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar section */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-white">OJT Completion Progress</h2>
            <p className="text-xs text-slate-500 mt-0.5">0 of 600 hours completed</p>
          </div>
          <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">0%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: '0%' }} />
        </div>
      </div>

      {/* Two-column: Recent logs + Recent evaluations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Time Logs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Time Logs</h2>
            <span className="badge badge-pending">0 pending</span>
          </div>
          <div className="text-center py-10 text-slate-600">
            <p className="text-3xl mb-2">⏱️</p>
            <p className="text-sm">No time logs yet.</p>
            <p className="text-xs mt-1">Clock in to start tracking your hours.</p>
          </div>
        </div>

        {/* Recent Evaluations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Evaluations</h2>
            <span className="badge badge-active">0 total</span>
          </div>
          <div className="text-center py-10 text-slate-600">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">No evaluations yet.</p>
            <p className="text-xs mt-1">Your supervisor will submit evaluations here.</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
