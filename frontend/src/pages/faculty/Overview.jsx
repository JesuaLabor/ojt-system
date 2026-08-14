import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import AssignmentPending from '../../components/ui/AssignmentPending'

export default function FacultyOverview() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [summary, setSummary] = useState(null)
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)

    const [selectedCompany, setSelectedCompany] = useState('')
    const [companies, setCompanies] = useState([])

    const fetchSummary = () => {
        setLoading(true)
        const params = {}
        if (selectedCompany) params.company_name = selectedCompany

        api.get('/faculty/students', { params }).then(res => {
            setSummary(res.data?.summary || null)
            setStudents(res.data?.students || [])
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

    const evaluatedStudents = students.filter(s => s.latest_score > 0)
    const pendingStudents = students.filter(s => !s.latest_score || s.latest_score === 0)

    const stats = [
        { label: 'Total Students', value: summary?.total_students || 0, sub: 'In department', icon: '🎓', color: 'bg-cyan-500/15 text-cyan-400' },
        { label: 'Completed OJT', value: summary?.completed_ojt || 0, sub: 'Finished requirements', icon: '✅', color: 'bg-emerald-500/15 text-emerald-400' },
        { label: '⭐ Evaluated', value: summary?.evaluated_count ?? evaluatedStudents.length, sub: 'Grades recorded', icon: '⭐', color: 'bg-indigo-500/15 text-indigo-400' },
        { label: 'Pending Evals', value: summary?.pending_evaluations ?? pendingStudents.length, sub: 'Awaiting evaluation', icon: '📝', color: 'bg-orange-500/15 text-orange-400' },
    ]

    return (
        <div className="fade-in space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="page-title">Faculty Dashboard</h1>
                    <p className="page-sub">
                        Welcome, {user?.name}. {summary?.department_name ? `Department: ${summary.department_name}` : "Monitor your students' OJT performance."}
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Company:</span>
                    <select 
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="input text-xs font-bold bg-slate-800 border-slate-700 h-10 min-w-[180px]"
                    >
                        <option value="">All Companies</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {stats.map(s => (
                    <div key={s.label} className="stat-card p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${s.color}`}>
                            {s.icon}
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white leading-none">{loading ? '-' : s.value}</p>
                            <p className="text-xs font-bold text-white/80 mt-1 uppercase tracking-wider">{s.label}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{s.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Student Performance & Evaluation Summary Table */}
                <div className="lg:col-span-7 card p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Student Evaluation Overview</h2>
                            <p className="text-xs text-slate-500">Evaluation scores for students in your department</p>
                        </div>
                        <button 
                            onClick={() => navigate('/faculty/students')}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                            View All Students →
                        </button>
                    </div>

                    {loading ? (
                        <div className="space-y-3 py-4">
                            {[1, 2, 3].map(i => <div key={i} className="animate-pulse skeleton h-12 w-full rounded-xl" />)}
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <p className="text-3xl mb-2">👥</p>
                            <p className="text-sm">No active student assignments found.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                            {students.map(s => (
                                <div key={s.student_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-all">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {s.profile_photo ? (
                                            <img src={s.profile_photo} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-700" />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-500/20">
                                                {s.student_name?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-white truncate">{s.student_name}</p>
                                            <p className="text-[10px] text-slate-500 truncate">{s.company_name}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        {s.latest_score > 0 ? (
                                            <div className="flex flex-col items-end">
                                                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    ⭐ {s.latest_score.toFixed(1)} / 100
                                                </span>
                                                <span className="text-[9px] text-emerald-500/70 font-semibold mt-0.5">{s.latest_grade}</span>
                                            </div>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-500 border border-slate-700/50">
                                                ○ Not Evaluated
                                            </span>
                                        )}
                                        <button 
                                            onClick={() => navigate(`/faculty/evaluations?student=${s.student_id}`)}
                                            className="btn btn-sm text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5"
                                        >
                                            View
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Evaluations & Completed Student Cards */}
                <div className="lg:col-span-5 card p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Evaluated Students</h2>
                            <p className="text-xs text-slate-500">Students with submitted supervisor grades</p>
                        </div>
                        <button 
                            onClick={() => navigate('/faculty/evaluations')}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                            Full Report →
                        </button>
                    </div>

                    {loading ? (
                        <div className="space-y-3 py-4">
                            {[1, 2].map(i => <div key={i} className="animate-pulse skeleton h-16 w-full rounded-xl" />)}
                        </div>
                    ) : evaluatedStudents.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <p className="text-4xl mb-2">📋</p>
                            <p className="text-sm font-medium text-slate-400">No student evaluations submitted yet.</p>
                            <p className="text-xs mt-1 text-slate-600">Once supervisors grade your department students, they will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                            {evaluatedStudents.map(s => (
                                <div key={s.student_id} className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/30 border border-slate-800 hover:border-indigo-500/30 transition-all flex items-center justify-between">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{s.student_name}</p>
                                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{s.company_name}</p>
                                        <p className="text-[10px] text-indigo-400 font-semibold mt-1">Grade: {s.latest_grade}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-lg font-black text-emerald-400 leading-none">
                                            {s.latest_score.toFixed(1)}
                                        </span>
                                        <p className="text-[9px] text-slate-500 font-semibold">out of 100</p>
                                        <button 
                                            onClick={() => navigate(`/faculty/evaluations?student=${s.student_id}`)}
                                            className="mt-2 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline block"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
