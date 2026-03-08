import Layout from '../../components/layout/Layout'
import useAuthStore from '../../store/authStore'

const stats = [
  { label: 'Total Students', value: '0', sub: 'In your faculty list', icon: '🎓', color: 'bg-cyan-500/15 text-cyan-400' },
  { label: 'Reports Available', value: '0', sub: 'Generated PDF reports', icon: '📄', color: 'bg-indigo-500/15 text-indigo-400' },
  { label: 'Evaluations Logged', value: '0', sub: 'Across all students', icon: '📋', color: 'bg-purple-500/15 text-purple-400' },
  { label: 'Avg. Performance', value: 'N/A', sub: 'Department-wide average', icon: '📊', color: 'bg-emerald-500/15 text-emerald-400' },
]

export default function FacultyDashboard() {
  const { user } = useAuthStore()
  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Faculty Dashboard</h1>
        <p className="page-sub">Welcome, {user?.name}. Monitor your students' OJT performance.</p>
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
          <h2 className="text-sm font-semibold text-white mb-4">Student Performance Overview</h2>
          <div className="text-center py-10 text-slate-600">
            <p className="text-3xl mb-2">📊</p>
            <p className="text-sm">No data available.</p>
            <p className="text-xs mt-1">Performance charts will appear here.</p>
          </div>
        </div>
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Recent Evaluations</h2>
          <div className="text-center py-10 text-slate-600">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">No recent evaluations.</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
