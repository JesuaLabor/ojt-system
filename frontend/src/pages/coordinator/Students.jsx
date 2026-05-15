import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        'On Track': 'bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/30',
        'Behind': 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
        'Completed': 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
    }
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${map[status] || 'bg-slate-500/15 text-slate-400'}`}>
            {status === 'Completed' && '✓ '}{status}
        </span>
    )
}

function AttendanceBadge({ days }) {
    if (days === 0) return (
        <div className="flex flex-col">
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-tight">Active</span>
            <span className="text-[9px] text-slate-500 italic">Today</span>
        </div>
    )
    
    let color = 'text-teal-400 bg-teal-500/10'
    let label = 'Normal'
    
    if (days >= 5) {
        color = 'text-red-400 bg-red-500/10'
        label = 'Danger'
    } else if (days >= 3) {
        color = 'text-amber-400 bg-amber-500/10'
        label = 'Warning'
    }

    return (
        <div className="flex flex-col items-start">
            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${color}`}>
                {label}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                {days} {days === 1 ? 'day' : 'days'} inactive
            </span>
        </div>
    )
}

const IconSearch = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>

export default function CoordinatorStudents() {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [departments, setDepartments] = useState([])
  const [companies, setCompanies] = useState([])

  const fetchStudents = () => {
    setLoading(true)
    const params = {}
    if (selectedDept) params.department_id = selectedDept
    if (selectedCompany) params.company_name = selectedCompany

    api.get('/coordinator/students', { params })
      .then(res => {
         setStudents(res.data?.students || [])
         setSummary(res.data?.summary || null)
      })
      .catch(err => {
        console.error(err)
        setError('Failed to fetch students.')
      })
      .finally(() => setLoading(false))
  }

  // Initial load and filter change
  useEffect(() => {
    fetchStudents()
  }, [selectedDept, selectedCompany])

  // Fetch filter options
  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data?.departments || []))
    api.get('/companies').then(res => setCompanies(res.data?.companies || []))
  }, [])

  const filteredStudents = students.filter(s => 
    s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.department_name && s.department_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.supervisor_name && s.supervisor_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="fade-in space-y-6 max-w-7xl pb-10">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="shrink-0">
          <h1 className="page-title">Manage Students</h1>
          <p className="page-sub mt-1">Directory of all active OJT student assignments across the system.</p>
        </div>
        
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Department Filter */}
            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              className="input text-xs font-bold bg-slate-900 border-slate-800 w-full sm:w-[180px] h-[42px] shrink-0"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Company Filter */}
            <select 
              value={selectedCompany} 
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="input text-xs font-bold bg-slate-900 border-slate-800 w-full sm:w-[180px] h-[42px] shrink-0"
            >
              <option value="">All Companies</option>
              {companies.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>

          {/* Search Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
               <IconSearch />
            </div>
            <input 
              type="text"
              placeholder="Search by student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full pl-10 h-[42px]"
            />
          </div>
        </div>
      </div>

      {summary && (
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card py-4 bg-slate-900 shadow-none border border-slate-800">
               <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total Active</p>
               <p className="text-2xl font-black text-white">{summary.total_students}</p>
            </div>
            <div className="card py-4 bg-emerald-900/10 shadow-none border border-emerald-900/30">
               <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold mb-1">Completed OJT</p>
               <p className="text-2xl font-black text-emerald-400">{summary.completed_ojt}</p>
            </div>
            <div className="card py-4 bg-amber-900/10 shadow-none border border-amber-900/30">
               <p className="text-[10px] uppercase tracking-wider text-amber-500 font-bold mb-1">Behind Schedule</p>
               <p className="text-2xl font-black text-amber-400">{summary.behind_schedule}</p>
            </div>
            <div className="card py-4 bg-red-900/10 shadow-none border border-red-900/30">
               <p className="text-[10px] uppercase tracking-wider text-red-500 font-bold mb-1">Attendance Risk</p>
               <p className="text-2xl font-black text-red-400">{summary.at_risk_students}</p>
            </div>
         </div>
      )}

      {error ? (
         <div className="card text-red-400 bg-red-900/10 border-red-900/50">⚠️ {error}</div>
      ) : loading ? (
         <div className="card">
             <div className="animate-pulse space-y-4">
                 {[1,2,3,4].map(i => (
                     <div key={i} className="skeleton h-12 w-full rounded" />
                 ))}
             </div>
         </div>
      ) : students.length === 0 ? (
         <div className="card text-center py-16">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-lg font-semibold text-white">No active students found</p>
            <p className="text-sm text-slate-500 mt-1">Once assignments are created, they will appear here.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap border-0 rounded-none">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr>
                  <th className="table-head">Student Information</th>
                  <th className="table-head">Assignment Details</th>
                  <th className="table-head">Attendance</th>
                  <th className="table-head">Progress</th>
                  <th className="table-head">Status</th>
                  <th className="table-head text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredStudents.length === 0 ? (
                    <tr>
                        <td colSpan="5" className="table-cell text-center py-8 text-slate-500">
                            No students match your search.
                        </td>
                    </tr>
                ) : (
                    filteredStudents.map(student => {
                        const progressColor = student.progress_pct >= 80 
                            ? 'from-emerald-500 to-teal-400' 
                            : student.progress_pct >= 40 
                                ? 'from-teal-500 to-cyan-400' 
                                : 'from-amber-500 to-orange-400'

                        return (
                        <tr key={student.student_id} className="table-row">
                            <td className="table-cell">
                                <div className="flex items-center gap-3">
                                    {student.profile_photo ? (
                                        <img 
                                            src={student.profile_photo} 
                                            alt="Avatar" 
                                            className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-slate-700/50"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600
                                                flex items-center justify-center flex-shrink-0">
                                            <span className="text-white text-sm font-bold">
                                                {student.student_name?.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-white">{student.student_name}</p>
                                        <p className="text-xs text-slate-500">{student.student_email}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="table-cell">
                                <p className="text-sm text-slate-300 font-medium">{student.company_name}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5 mb-0.5">
                                   Dept: <span className="text-slate-400 font-semibold">{student.department_name || 'N/A'}</span>
                                </p>
                                <p className="text-[10px] text-slate-500">
                                   Supervisor: <span className="text-slate-400">{student.supervisor_name || 'Unassigned'}</span>
                                </p>
                            </td>
                            <td className="table-cell">
                                <AttendanceBadge days={student.days_inactive} />
                            </td>
                            <td className="table-cell">
                                <div className="w-48">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-teal-400 font-medium">{student.completed_hours}h</span>
                                        <span className="text-slate-500">{student.required_hours}h</span>
                                    </div>
                                    <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                                        {student.pending_hours > 0 && (
                                            <div 
                                                className="absolute top-0 left-0 h-full bg-amber-500/30 rounded-full" 
                                                style={{ width: `${Math.min(100, ((student.completed_hours + student.pending_hours) / student.required_hours) * 100)}%` }}
                                            />
                                        )}
                                        <div 
                                            className={`h-full rounded-full bg-gradient-to-r ${progressColor}`} 
                                            style={{ width: `${student.progress_pct}%` }} 
                                        />
                                    </div>
                                    {student.pending_logs > 0 && (
                                        <p className="text-[10px] text-amber-400 mt-1 font-medium animate-pulse">
                                            {student.pending_logs} log{student.pending_logs > 1 ? 's' : ''} pending
                                        </p>
                                    )}
                                </div>
                            </td>
                            <td className="table-cell">
                                <div className="flex flex-col gap-1 items-start">
                                    <StatusBadge status={student.status} />
                                    {student.latest_grade && (
                                       <span className="text-[10px] text-slate-400 font-semibold px-2">Grade: {student.latest_grade}</span>
                                    )}
                                </div>
                            </td>
                            <td className="table-cell text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button 
                                        onClick={() => navigate(`/coordinator/timelogs?student=${student.student_id}`)}
                                        className="btn btn-sm btn-ghost"
                                    >
                                        Logs
                                    </button>
                                    <button 
                                        onClick={() => navigate(`/coordinator/evaluations?student=${student.student_id}`)}
                                        className="btn btn-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                                    >
                                        Eval
                                    </button>
                                </div>
                            </td>
                        </tr>
                        )
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
