import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        'On Track': { cls: 'bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/30', icon: '●' },
        'Behind':   { cls: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30', icon: '●' },
        'Completed':{ cls: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30', icon: '✓' },
    }
    const { cls, icon } = map[status] || { cls: 'bg-slate-500/15 text-slate-400', icon: '●' }
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${cls}`}>
            <span className="text-[10px]">{icon}</span>
            {status}
        </span>
    )
}

function ActivityDot({ days }) {
    if (days === 0) return (
        <span className="inline-flex items-center gap-1 text-teal-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span> Today
        </span>
    )
    if (days >= 5) return (
        <span className="inline-flex items-center gap-1 text-red-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-400"></span> {days}d ago
        </span>
    )
    if (days >= 3) return (
        <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> {days}d ago
        </span>
    )
    return (
        <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span> {days}d ago
        </span>
    )
}

function EvalBadge({ score, grade }) {
    if (score > 0) return (
        <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span>⭐</span>{score.toFixed(1)}<span className="text-emerald-500/60 font-semibold text-[10px]">/ 100</span>
            </span>
            <span className="text-[10px] text-emerald-500/60 font-medium pl-0.5">{grade}</span>
        </div>
    )
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span> Pending
        </span>
    )
}

const IconSearch = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>

const STAT_CARDS = [
    { key: 'total_students',   label: 'Total Students', color: 'text-white',        icon: '👥', bg: 'bg-slate-800/60',      border: 'border-slate-700/50' },
    { key: 'completed_ojt',    label: 'Completed OJT',  color: 'text-emerald-400',  icon: '🎓', bg: 'bg-emerald-900/10',    border: 'border-emerald-800/30' },
    { key: 'behind_schedule',  label: 'Behind',         color: 'text-amber-400',    icon: '⚠️', bg: 'bg-amber-900/10',      border: 'border-amber-800/30' },
    { key: 'at_risk_students', label: 'Attendance Risk',color: 'text-red-400',      icon: '🔴', bg: 'bg-red-900/10',        border: 'border-red-800/30' },
]

export default function CoordinatorStudents() {
    const navigate = useNavigate()
    const [students, setStudents]   = useState([])
    const [summary, setSummary]     = useState(null)
    const [loading, setLoading]     = useState(true)
    const [error, setError]         = useState(null)
    const [searchQuery, setSearchQuery]       = useState('')
    const [selectedDept, setSelectedDept]     = useState('')
    const [selectedCompany, setSelectedCompany] = useState('')
    const [evalFilter, setEvalFilter]         = useState('')
    const [departments, setDepartments]       = useState([])
    const [companies, setCompanies]           = useState([])

    const fetchStudents = () => {
        setLoading(true)
        const params = {}
        if (selectedDept) params.department_id = selectedDept
        if (selectedCompany) params.company_name = selectedCompany
        api.get('/coordinator/students', { params })
            .then(res => { setStudents(res.data?.students || []); setSummary(res.data?.summary || null) })
            .catch(() => setError('Failed to fetch students.'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchStudents() }, [selectedDept, selectedCompany])
    useEffect(() => {
        api.get('/departments').then(res => setDepartments(res.data?.departments || []))
        api.get('/companies').then(res => setCompanies(res.data?.companies || []))
    }, [])

    const evaluatedCount  = students.filter(s => s.latest_score > 0).length
    const pendingEvalCount = students.filter(s => !s.latest_score || s.latest_score === 0).length

    const filteredStudents = students.filter(s => {
        const q = searchQuery.toLowerCase()
        const matchSearch = s.student_name.toLowerCase().includes(q) ||
            s.company_name.toLowerCase().includes(q) ||
            (s.department_name && s.department_name.toLowerCase().includes(q)) ||
            (s.supervisor_name && s.supervisor_name.toLowerCase().includes(q))
        const matchEval = evalFilter === '' ? true
            : evalFilter === 'evaluated' ? s.latest_score > 0
            : !s.latest_score || s.latest_score === 0
        return matchSearch && matchEval
    })

    return (
        <div className="fade-in space-y-6 max-w-7xl pb-10">

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="page-title">Student Directory</h1>
                    <p className="page-sub mt-1">All active OJT student assignments across the system.</p>
                </div>
                {/* Search */}
                <div className="relative w-full sm:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <IconSearch />
                    </div>
                    <input
                        type="text"
                        placeholder="Search students, company, dept…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="input w-full pl-10 h-[42px] text-sm"
                    />
                </div>
            </div>

            {/* ── Summary Stat Cards ───────────────────────────────── */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {STAT_CARDS.map(({ key, label, color, icon, bg, border }) => (
                        <div key={key} className={`rounded-2xl px-4 py-3.5 border ${bg} ${border}`}>
                            <p className="text-lg mb-0.5">{icon}</p>
                            <p className={`text-2xl font-black leading-none ${color}`}>{summary[key]}</p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1">{label}</p>
                        </div>
                    ))}

                    {/* Evaluation stat cards — clickable filter */}
                    <div
                        className={`rounded-2xl px-4 py-3.5 border cursor-pointer transition-all select-none ${
                            evalFilter === 'evaluated'
                                ? 'bg-indigo-500/20 border-indigo-500/50 ring-1 ring-indigo-400/30 shadow-lg shadow-indigo-900/20'
                                : 'bg-indigo-900/10 border-indigo-900/30 hover:border-indigo-500/40'
                        }`}
                        onClick={() => setEvalFilter(prev => prev === 'evaluated' ? '' : 'evaluated')}
                        title="Click to filter evaluated students"
                    >
                        <p className="text-lg mb-0.5">⭐</p>
                        <p className="text-2xl font-black leading-none text-indigo-300">{evaluatedCount}</p>
                        <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold mt-1">Evaluated</p>
                    </div>
                    <div
                        className={`rounded-2xl px-4 py-3.5 border cursor-pointer transition-all select-none ${
                            evalFilter === 'pending'
                                ? 'bg-orange-500/20 border-orange-500/50 ring-1 ring-orange-400/30 shadow-lg shadow-orange-900/20'
                                : 'bg-orange-900/10 border-orange-900/30 hover:border-orange-500/40'
                        }`}
                        onClick={() => setEvalFilter(prev => prev === 'pending' ? '' : 'pending')}
                        title="Click to filter students not yet evaluated"
                    >
                        <p className="text-lg mb-0.5">○</p>
                        <p className="text-2xl font-black leading-none text-orange-300">{pendingEvalCount}</p>
                        <p className="text-[10px] uppercase tracking-wider text-orange-400 font-bold mt-1">Not Evaluated</p>
                    </div>
                </div>
            )}

            {/* ── Filters Row ──────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Dept */}
                <select
                    value={selectedDept}
                    onChange={e => setSelectedDept(e.target.value)}
                    className="input text-xs bg-slate-900 border-slate-800 h-[38px] w-[170px]"
                >
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>

                {/* Company */}
                <select
                    value={selectedCompany}
                    onChange={e => setSelectedCompany(e.target.value)}
                    className="input text-xs bg-slate-900 border-slate-800 h-[38px] w-[170px]"
                >
                    <option value="">All Companies</option>
                    {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>

                {/* Evaluation pill-tabs */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 h-[38px]">
                    {[
                        { v: '',          label: 'All' },
                        { v: 'evaluated', label: '⭐ Evaluated' },
                        { v: 'pending',   label: '○ Pending' },
                    ].map(({ v, label }) => (
                        <button
                            key={v}
                            onClick={() => setEvalFilter(v)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                                evalFilter === v
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {filteredStudents.length !== students.length && (
                    <span className="text-xs text-slate-500 italic">
                        Showing {filteredStudents.length} of {students.length}
                    </span>
                )}
            </div>

            {/* ── Table ────────────────────────────────────────────── */}
            {error ? (
                <div className="card text-red-400 bg-red-900/10 border-red-900/50">⚠️ {error}</div>
            ) : loading ? (
                <div className="card space-y-3">
                    {[1,2,3,4].map(i => <div key={i} className="animate-pulse skeleton h-14 w-full rounded-xl" />)}
                </div>
            ) : students.length === 0 ? (
                <div className="card text-center py-20">
                    <p className="text-5xl mb-4">👥</p>
                    <p className="text-lg font-semibold text-white">No active students found</p>
                    <p className="text-sm text-slate-500 mt-1">Once assignments are created, they will appear here.</p>
                </div>
            ) : (
                <div className="card p-0 overflow-hidden">
                    <div className="table-wrap border-0 rounded-none">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr>
                                    <th className="table-head">Student</th>
                                    <th className="table-head">Company & Dept</th>
                                    <th className="table-head">Progress</th>
                                    <th className="table-head">Activity</th>
                                    <th className="table-head">OJT Status</th>
                                    <th className="table-head">Evaluation</th>
                                    <th className="table-head text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="table-cell text-center py-10 text-slate-500">
                                            No students match your filters.
                                        </td>
                                    </tr>
                                ) : filteredStudents.map(student => {
                                    const pct = student.progress_pct || 0
                                    const barColor = pct >= 80
                                        ? 'from-emerald-500 to-teal-400'
                                        : pct >= 40 ? 'from-teal-500 to-cyan-400' : 'from-amber-500 to-orange-400'

                                    return (
                                        <tr key={student.student_id} className="table-row group">

                                            {/* Student */}
                                            <td className="table-cell">
                                                <div className="flex items-center gap-3">
                                                    {student.profile_photo ? (
                                                        <img src={student.profile_photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-slate-700/50 group-hover:border-indigo-500/50 transition-colors" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 border-2 border-transparent group-hover:border-indigo-500/50 transition-colors">
                                                            <span className="text-white text-sm font-bold">{student.student_name?.charAt(0).toUpperCase()}</span>
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-white text-sm truncate">{student.student_name}</p>
                                                        <p className="text-xs text-slate-500 truncate">{student.student_email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Company & Dept */}
                                            <td className="table-cell">
                                                <p className="text-sm font-semibold text-white truncate max-w-[160px]">{student.company_name}</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    <span className="text-slate-400">{student.department_name || '—'}</span>
                                                    {student.supervisor_name && <span className="text-slate-600"> · {student.supervisor_name}</span>}
                                                </p>
                                            </td>

                                            {/* Progress */}
                                            <td className="table-cell">
                                                <div className="w-44">
                                                    <div className="flex justify-between items-center text-xs mb-1.5">
                                                        <span className="font-bold text-white">{student.completed_hours}h</span>
                                                        <span className="text-slate-600 text-[10px]">/ {student.required_hours}h</span>
                                                    </div>
                                                    <div className="relative h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        {student.pending_hours > 0 && (
                                                            <div
                                                                className="absolute inset-y-0 left-0 bg-amber-500/30 rounded-full"
                                                                style={{ width: `${Math.min(100, ((student.completed_hours + student.pending_hours) / student.required_hours) * 100)}%` }}
                                                            />
                                                        )}
                                                        <div
                                                            className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className="text-[10px] text-slate-600">{pct}%</span>
                                                        {student.pending_logs > 0 && (
                                                            <span className="text-[10px] text-amber-400 font-medium animate-pulse">
                                                                {student.pending_logs} pending
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Activity */}
                                            <td className="table-cell">
                                                <ActivityDot days={student.days_inactive} />
                                                <p className="text-[10px] text-slate-600 mt-0.5">{student.last_active || 'Never'}</p>
                                            </td>

                                            {/* OJT Status */}
                                            <td className="table-cell">
                                                <StatusBadge status={student.status} />
                                            </td>

                                            {/* Evaluation */}
                                            <td className="table-cell">
                                                <EvalBadge score={student.latest_score} grade={student.latest_grade} />
                                            </td>

                                            {/* Actions */}
                                            <td className="table-cell text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/coordinator/timelogs?student=${student.student_id}`)}
                                                        className="btn btn-sm btn-ghost text-xs"
                                                    >
                                                        Logs
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/coordinator/evaluations?student=${student.student_id}`)}
                                                        className={`btn btn-sm text-xs ${
                                                            student.latest_score > 0
                                                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                                                : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                                                        }`}
                                                    >
                                                        {student.latest_score > 0 ? '✓ Eval' : 'Eval'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
