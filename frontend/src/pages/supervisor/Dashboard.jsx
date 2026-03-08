import Layout from '../../components/layout/Layout'
import useAuthStore from '../../store/authStore'

const stats = [
  { label: 'Total Students', value: '0', sub: 'Under your supervision', icon: '👥', color: 'bg-cyan-500/15 text-cyan-400' },
  { label: 'Pending Approvals', value: '0', sub: 'Time logs awaiting review', icon: '⏳', color: 'bg-amber-500/15 text-amber-400' },
  { label: 'Evaluations Done', value: '0', sub: 'This period', icon: '📋', color: 'bg-indigo-500/15 text-indigo-400' },
  { label: 'Avg. Score', value: 'N/A', sub: 'Across all students', icon: '⭐', color: 'bg-purple-500/15 text-purple-400' },
]

export default function SupervisorDashboard() {
  const { user } = useAuthStore()
  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Supervisor Dashboard</h1>
        <p className="page-sub">Welcome, {user?.name}. Manage your assigned students.</p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Pending Time Log Approvals</h2>
          <div className="text-center py-10 text-slate-600">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm">All caught up! No pending approvals.</p>
          </div>
        </div>
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">My Students</h2>
          <div className="text-center py-10 text-slate-600">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-sm">No students assigned yet.</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
