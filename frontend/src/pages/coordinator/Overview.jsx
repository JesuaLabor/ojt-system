import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Avatar from '../../components/ui/Avatar'

// ── Icons ──────────────────────────────────────────────────────────────────────
const IconSearch = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
const IconX = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
const IconExternal = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>

// ── Badges ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        'On Track': 'bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/30',
        'Behind': 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
        'Completed': 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
    }
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${map[status] || 'bg-slate-500/15 text-slate-400'}`}>
            {status}
        </span>
    )
}

function GradeBadge({ grade, score }) {
    if (!score) return <span className="text-slate-500 text-xs italic">N/A</span>
    
    let color = 'text-slate-400 bg-slate-500/15'
    if (score >= 90) color = 'text-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-500/30'
    else if (score >= 80) color = 'text-teal-400 bg-teal-500/15 ring-1 ring-teal-500/30'
    else if (score >= 70) color = 'text-cyan-400 bg-cyan-500/15 ring-1 ring-cyan-500/30'
    else if (score >= 60) color = 'text-amber-400 bg-amber-500/15 ring-1 ring-amber-500/30'
    else color = 'text-red-400 bg-red-500/15 ring-1 ring-red-500/30'

    return (
        <div className="flex flex-col items-start">
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}>
                {score.toFixed(1)}
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5 max-w-[80px] truncate" title={grade}>
                {grade}
            </span>
        </div>
    )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function StudentDetailsModal({ student, onClose }) {
    if (!student) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />
            
            {/* Modal Content */}
            <div className="relative bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header Graphic */}
                <div className="h-24 bg-gradient-to-r flex-shrink-0 from-orange-500/20 to-rose-500/20" />
                
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-900/50 text-white hover:bg-slate-800 transition shadow-sm"
                >
                    <IconX />
                </button>

                <div className="px-6 pb-6 relative">
                    {/* Avatar */}
                    <Avatar
                        photo={student.profile_photo}
                        name={student.student_name}
                        size="w-20 h-20"
                        shape="rounded-2xl"
                        gradient="from-orange-500 to-rose-600"
                        textSize="text-2xl"
                        className="absolute -top-12 left-6 border-4 border-slate-900 shadow-xl"
                    />

                    <div className="pt-10 flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">{student.student_name}</h2>
                            <p className="text-sm text-slate-400">{student.student_email}</p>
                        </div>
                        <StatusBadge status={student.status} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                        {/* Assignment Details */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Assignment Details</h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase">Company</p>
                                    <p className="text-sm font-medium text-slate-200">{student.company_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase">Department</p>
                                    <p className="text-sm font-medium text-slate-200">
                                        {student.department_name || <span className="text-slate-500 italic">Not assigned</span>}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase">Supervisor</p>
                                    <p className="text-sm font-medium text-slate-200">{student.supervisor_name || 'Unassigned'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase">Evaluation Performance</p>
                                    <div className="mt-1">
                                        <GradeBadge grade={student.latest_grade} score={student.latest_score} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Progress Stats */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Time Logs & Progress</h3>
                            
                            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-2xl font-bold text-white leading-none">{student.completed_hours}h</span>
                                    <span className="text-xs text-slate-400 pb-0.5">/ {student.required_hours}h total</span>
                                </div>
                                
                                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden mb-2 relative">
                                    {student.pending_hours > 0 && (
                                        <div 
                                            className="absolute top-0 left-0 h-full bg-amber-500/30"
                                            style={{ width: `${Math.min(100, ((student.completed_hours + student.pending_hours) / student.required_hours) * 100)}%`}}
                                        />
                                    )}
                                    <div 
                                        className="h-full bg-gradient-to-r from-orange-500 to-rose-500" 
                                        style={{ width: `${student.progress_pct}%`}}
                                    />
                                </div>
                                
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="font-semibold text-orange-400">{student.progress_pct}% Completed</span>
                                    {student.pending_hours > 0 && (
                                        <span className="text-amber-400">{student.pending_hours}h pending review</span>
                                    )}
                                </div>
                            </div>

                            {student.pending_logs > 0 && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
                                    <span>⏳</span> Requires supervisor action: {student.pending_logs} pending log(s).
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CoordinatorOverview() {
    const [students, setStudents] = useState([])
    const [summary, setSummary] = useState({
        total_students: 0,
        completed_ojt: 0,
        behind_schedule: 0,
        pending_evaluations: 0
    })
    const [loading, setLoading] = useState(true)

    // Filters & Sorting
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [selectedStudent, setSelectedStudent] = useState(null)

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await api.get('/coordinator/students')
                setStudents(res.data?.students || [])
                setSummary(res.data?.summary || {
                    total_students: 0,
                    completed_ojt: 0,
                    behind_schedule: 0,
                    pending_evaluations: 0
                })
            } catch (err) {
                console.error(err)
                toast.error('Failed to load coordinator data.')
            } finally {
                setLoading(false)
            }
        }
        fetchStudents()
    }, [])

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = s.student_name.toLowerCase().includes(search.toLowerCase()) || 
                                  s.company_name.toLowerCase().includes(search.toLowerCase())
            const matchesStatus = statusFilter === 'All' || s.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [students, search, statusFilter])

    const statCards = [
        { label: 'Total Students', value: summary.total_students, color: 'text-orange-400', bg: 'bg-orange-500/15', icon: '👥' },
        { label: 'Completed OJT', value: summary.completed_ojt, color: 'text-emerald-400', bg: 'bg-emerald-500/15', icon: '✅' },
        { label: 'Behind Schedule', value: summary.behind_schedule, color: 'text-red-400', bg: 'bg-red-500/15', icon: '⚠️' },
        { label: 'Pending Evaluations', value: summary.pending_evaluations, color: 'text-purple-400', bg: 'bg-purple-500/15', icon: '📝' },
    ]

    return (
        <div className="fade-in max-w-7xl space-y-6">
            <div className="mb-6">
                <h1 className="page-title leading-tight">Coordinator Overview</h1>
                <p className="page-sub mt-1">Monitor OJT performance and deployment across all programs.</p>
            </div>

            {/* ── Summary Stats ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((s, i) => (
                    <div key={i} className="stat-card">
                        <div className={`stat-icon ${s.bg} ${s.color}`}>{s.icon}</div>
                        <div>
                            <p className="text-2xl font-bold text-white">{loading ? '...' : s.value}</p>
                            <p className="text-xs font-semibold text-slate-300 mt-0.5">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Data Table Section ── */}
            <div className="card !p-0 overflow-hidden border border-slate-800">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Search */}
                    <div className="relative max-w-sm w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <IconSearch />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by student or company name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input pl-10 h-10 w-full"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                        {['All', 'On Track', 'Behind', 'Completed'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors
                                    ${statusFilter === status 
                                        ? 'bg-orange-500 text-white shadow-md shadow-orange-900/20' 
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Company Deployment</th>
                                <th>Progress Tracker</th>
                                <th>Performance (Evaluation)</th>
                                <th>Status</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-12">
                                        <div className="flex flex-col items-center">
                                            <div className="spinner w-8 h-8 mb-3" />
                                            <span className="text-slate-400 text-sm">Loading records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-12 text-slate-500">
                                        <span className="text-4xl mb-2 block">📭</span>
                                        No students found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map(student => (
                                    <tr 
                                        key={student.student_id} 
                                        className="hover:bg-slate-800/40 transition group cursor-pointer"
                                        onClick={() => setSelectedStudent(student)}
                                    >
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    photo={student.profile_photo}
                                                    name={student.student_name}
                                                    size="w-8 h-8"
                                                    shape="rounded-lg"
                                                    gradient="from-orange-500 to-rose-500"
                                                    textSize="text-xs"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">{student.student_name}</p>
                                                    <p className="text-[11px] text-slate-500 truncate max-w-[150px]">{student.student_email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <p className="text-sm text-slate-200 font-medium truncate max-w-[150px]">{student.company_name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                                                Dept: <span className="text-slate-400 font-semibold">{student.department_name || 'N/A'}</span>
                                            </p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5" title={student.supervisor_name}>
                                                Sup: {student.supervisor_name || 'N/A'}
                                            </p>
                                        </td>
                                        <td>
                                            <div className="w-32 sm:w-40">
                                                <div className="flex justify-between text-[10px] mb-1">
                                                    <span className="text-slate-400">{student.completed_hours}h logged</span>
                                                    <span className="text-slate-500 font-medium">{student.progress_pct}%</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-orange-500 to-amber-400" 
                                                        style={{ width: `${student.progress_pct}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <GradeBadge grade={student.latest_grade} score={student.latest_score} />
                                        </td>
                                        <td>
                                            <StatusBadge status={student.status} />
                                        </td>
                                        <td className="text-right">
                                            <button 
                                                className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedStudent(student)
                                                }}
                                            >
                                                <IconExternal />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Simple pagination footer placeholder */}
                {!loading && filteredStudents.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50 text-xs text-slate-500 flex justify-between items-center">
                        <span>Showing {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}</span>
                    </div>
                )}
            </div>

            {/* Modal */}
            <StudentDetailsModal 
                student={selectedStudent} 
                onClose={() => setSelectedStudent(null)} 
            />
        </div>
    )
}
