import { useState, useEffect } from 'react'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import AssignmentPending from '../../components/ui/AssignmentPending'

export default function FacultyOverview() {
    const { user } = useAuthStore()
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)

    const [selectedCompany, setSelectedCompany] = useState('')
    const [companies, setCompanies] = useState([])

    const fetchSummary = () => {
        setLoading(true)
        const params = {}
        if (selectedCompany) params.company_name = selectedCompany

        api.get('/faculty/students', { params }).then(res => {
            setSummary(res.data?.summary || null)
        }).finally(() => setLoading(false))
    }

    useEffect(() => {
        fetchSummary()
    }, [selectedCompany])

    useEffect(() => {
        api.get('/companies').then(res => setCompanies(res.data?.companies || []))
    }, [])

    if (!loading && summary && !summary.has_department) {
        return <AssignmentPending role="faculty" name={user?.name} />
    }

    const stats = [
        { label: 'Total Students', value: summary?.total_students || 0, sub: 'In the program', icon: '🎓', color: 'bg-cyan-500/15 text-cyan-400' },
        { label: 'Completed OJT', value: summary?.completed_ojt || 0, sub: 'Finished requirements', icon: '✅', color: 'bg-emerald-500/15 text-emerald-400' },
        { label: 'Attendance Risk', value: summary?.at_risk_students || 0, sub: 'Need immediate attention', icon: '🚨', color: 'bg-red-500/15 text-red-400' },
        { label: 'Pending Evals', value: summary?.pending_evaluations || 0, sub: 'Awaiting grading', icon: '📝', color: 'bg-indigo-500/15 text-indigo-400' },
    ]

    return (
        <div className="fade-in space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="page-title">Faculty Dashboard</h1>
                    <p className="page-sub">Welcome, {user?.name}. Monitor your students' OJT performance.</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filter:</span>
                    <select 
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="input text-[11px] font-bold bg-slate-800 border-slate-700 h-10 min-w-[180px]"
                    >
                        <option value="">All Companies</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                {stats.map(s => (
                    <div key={s.label} className="stat-card p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${s.color}`}>
                            {s.icon}
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white leading-none">{loading ? '-' : s.value}</p>
                            <p className="text-xs font-semibold text-white/80 mt-1 uppercase tracking-wider">{s.label}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{s.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                    <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-widest text-slate-400">Student Performance Overview</h2>
                    <div className="text-center py-10 text-slate-600 bg-slate-900/50 rounded-lg">
                        <p className="text-3xl mb-2">📊</p>
                        <p className="text-sm font-medium">Use the Students or Reports tabs.</p>
                        <p className="text-xs mt-1">Detailed performance tracking is available there.</p>
                    </div>
                </div>
                <div className="card">
                    <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-widest text-slate-400">Recent Evaluations</h2>
                    <div className="text-center py-10 text-slate-600 bg-slate-900/50 rounded-lg">
                        <p className="text-3xl mb-2">📋</p>
                        <p className="text-sm font-medium">No recent evaluations overview.</p>
                        <p className="text-xs mt-1">Navigate to Evaluations to grade students.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
