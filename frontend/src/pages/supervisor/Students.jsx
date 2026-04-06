import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Avatar from '../../components/ui/Avatar'

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

export default function SupervisorStudents() {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    api.get('/supervisor/students')
      .then(res => setStudents(res.data?.students || []))
      .catch(err => {
        console.error(err)
        setError('Failed to fetch students.')
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredStudents = students.filter(s => 
    s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fade-in space-y-6 max-w-7xl pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">My Students</h1>
          <p className="page-sub mt-1">Detailed directory of all students assigned to your supervision.</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative min-w-[280px]">
          <input 
            type="text"
            placeholder="Search by name or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10"
          />
          <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6M9 13a4 4 0 110-8 4 4 0 010 8zM15 15a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
        </div>
      </div>

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
            <p className="text-lg font-semibold text-white">No students assigned</p>
            <p className="text-sm text-slate-500 mt-1">Students will appear here once the coordinator assigns them to you.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap border-0 rounded-none">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr>
                  <th className="table-head">Student Information</th>
                  <th className="table-head">Company</th>
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
                                    <Avatar
                                        photo={student.profile_photo}
                                        name={student.student_name}
                                        gradient="from-teal-500 to-cyan-600"
                                        className="border border-slate-700/50"
                                    />
                                    <div>
                                        <p className="font-semibold text-white">{student.student_name}</p>
                                        <p className="text-xs text-slate-500">{student.student_email}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="table-cell">
                                <p className="text-sm text-slate-300">{student.company_name}</p>
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
                                        <p className="text-[10px] text-amber-400 mt-1 mt-1 font-medium animate-pulse">
                                            {student.pending_logs} log{student.pending_logs > 1 ? 's' : ''} pending
                                        </p>
                                    )}
                                </div>
                            </td>
                            <td className="table-cell">
                                <StatusBadge status={student.status} />
                            </td>
                            <td className="table-cell text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button 
                                        onClick={() => navigate(`/supervisor/timelogs?student=${student.student_id}`)}
                                        className="btn btn-sm btn-ghost"
                                    >
                                        Logs
                                    </button>
                                    <button 
                                        onClick={() => navigate(`/supervisor/evaluations?student=${student.student_id}`)}
                                        className="btn btn-sm bg-teal-500/10 text-teal-400 hover:bg-teal-500/20"
                                    >
                                        Evaluate
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
