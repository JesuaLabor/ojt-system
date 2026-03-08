import Layout from '../../components/layout/Layout'
import useAuthStore from '../../store/authStore'

const stats = [
  { label: 'Total Students', value: '0', sub: 'Enrolled in OJT', icon: '🎓', color: 'bg-cyan-500/15 text-cyan-400' },
  { label: 'Active OJTs', value: '0', sub: 'Currently ongoing', icon: '🏢', color: 'bg-indigo-500/15 text-indigo-400' },
  { label: 'Completed OJTs', value: '0', sub: 'Students finished', icon: '🏆', color: 'bg-emerald-500/15 text-emerald-400' },
  { label: 'Pending Reviews', value: '0', sub: 'Time logs to review', icon: '⏳', color: 'bg-amber-500/15 text-amber-400' },
]

export default function CoordinatorDashboard() {
  const { user } = useAuthStore()
  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Coordinator Dashboard</h1>
        <p className="page-sub">Hello, {user?.name}. Oversee all OJT assignments and student progress.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-4">Student Overview</h2>
          <div className="text-center py-10 text-slate-600">
            <p className="text-3xl mb-2">🎓</p>
            <p className="text-sm">No students registered yet.</p>
          </div>
        </div>
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">OJT Status Breakdown</h2>
          <div className="space-y-3">
            {[['Active', '0', 'badge-active'], ['Completed', '0', 'badge-approved'], ['Withdrawn', '0', 'badge-rejected']].map(([label, val, cls]) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <span className="text-sm text-slate-400">{label}</span>
                <span className={`badge ${cls}`}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
