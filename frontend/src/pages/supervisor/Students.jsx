import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
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

  // Certificate Modal state
  const [certModalStudent, setCertModalStudent] = useState(null)
  const [certFile, setCertFile] = useState(null)
  const [uploadingCert, setUploadingCert] = useState(false)

  const fetchStudents = () => {
    setLoading(true)
    api.get('/supervisor/students')
      .then(res => setStudents(res.data?.students || []))
      .catch(err => {
        console.error(err)
        setError('Failed to fetch students.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const filteredStudents = students.filter(s => 
    s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCertSubmit = async (e) => {
    e.preventDefault()
    if (!certFile || !certModalStudent) return

    setUploadingCert(true)
    const formData = new FormData()
    formData.append('student_id', certModalStudent.student_id)
    formData.append('pdf', certFile)

    try {
      await api.post('/certificates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(`Certificate uploaded for ${certModalStudent.student_name}! 📜`)
      setCertModalStudent(null)
      setCertFile(null)
      fetchStudents()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload certificate')
    } finally {
      setUploadingCert(false)
    }
  }

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
                  <th className="table-head">OJT Status</th>
                  <th className="table-head">Evaluation</th>
                  <th className="table-head text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredStudents.length === 0 ? (
                    <tr>
                        <td colSpan="6" className="table-cell text-center py-8 text-slate-500">
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
                                        <p className="font-semibold text-white flex items-center gap-2">
                                          {student.student_name}
                                          {student.has_certificate && (
                                            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold">
                                              🎓 Cert Issued
                                            </span>
                                          )}
                                        </p>
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
                                        <p className="text-[10px] text-amber-400 mt-1 font-medium animate-pulse">
                                            {student.pending_logs} log{student.pending_logs > 1 ? 's' : ''} pending
                                        </p>
                                    )}
                                </div>
                            </td>
                            {/* OJT Status */}
                            <td className="table-cell">
                                <StatusBadge status={student.status} />
                            </td>

                            {/* Evaluation */}
                            <td className="table-cell">
                                {student.has_evaluation ? (
                                    <div className="flex flex-col gap-0.5">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            <span className="text-sm">⭐</span>
                                            {student.evaluation_score.toFixed(1)}
                                            <span className="text-emerald-500/70 font-semibold">/ 100</span>
                                        </span>
                                        <span className="text-[10px] text-emerald-500/60 font-medium pl-0.5">
                                            {student.evaluation_score >= 90 ? 'Outstanding'
                                                : student.evaluation_score >= 80 ? 'Very Satisfactory'
                                                : student.evaluation_score >= 70 ? 'Satisfactory'
                                                : student.evaluation_score >= 60 ? 'Fairly Satisfactory'
                                                : 'Needs Improvement'}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700/50">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                                        Pending
                                    </span>
                                )}
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
                                        className={`btn btn-sm ${
                                            student.has_evaluation
                                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                                : 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20'
                                        }`}
                                        title={student.has_evaluation ? `Score: ${student.evaluation_score.toFixed(1)}` : 'Submit evaluation'}
                                    >
                                        {student.has_evaluation ? '✓ Evaluated' : 'Evaluate'}
                                    </button>
                                    <button
                                        onClick={() => { if (student.status === 'Completed') { setCertModalStudent(student); setCertFile(null) } }}
                                        disabled={student.status !== 'Completed'}
                                        className={`btn btn-sm ${
                                            student.status !== 'Completed'
                                                ? 'opacity-40 cursor-not-allowed bg-slate-700/50 text-slate-500'
                                                : student.has_certificate
                                                    ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                                                    : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                                        }`}
                                        title={
                                            student.status !== 'Completed'
                                                ? `Cannot issue certificate — student has only completed ${student.completed_hours}h of ${student.required_hours}h required.`
                                                : student.has_certificate ? 'Update Certificate' : 'Upload Certificate of Completion'
                                        }
                                    >
                                        📜 {student.has_certificate ? 'Cert' : 'Upload Cert'}
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

      {/* Upload Certificate Modal */}
      {certModalStudent && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setCertModalStudent(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <form onSubmit={handleCertSubmit} className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 my-4 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div>
                  <h2 className="text-lg font-bold text-white">📜 Upload Certificate of Completion</h2>
                  <p className="text-xs text-slate-400 mt-0.5">For {certModalStudent.student_name}</p>
                </div>
                <button type="button" onClick={() => setCertModalStudent(null)} className="text-slate-500 hover:text-white transition">✕</button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-400">
                  Select your company's official Certificate of Completion (PDF format). The student will be notified and can download it directly from their dashboard.
                </p>

                {/* ── OJT Hours Completion Gate ── */}
                {certModalStudent.status !== 'Completed' && (
                  <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-xl flex items-start gap-3">
                    <span className="text-lg mt-0.5">🚫</span>
                    <div>
                      <p className="text-sm font-semibold text-red-400">OJT Hours Not Yet Complete</p>
                      <p className="text-xs text-red-400/80 mt-0.5">
                        <strong>{certModalStudent.student_name}</strong> has only completed{' '}
                        <span className="font-bold text-red-300">{certModalStudent.completed_hours}h</span> out of{' '}
                        <span className="font-bold text-red-300">{certModalStudent.required_hours}h</span> required.
                        A certificate can only be issued once all OJT hours are fulfilled.
                      </p>
                      <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                          style={{ width: `${certModalStudent.progress_pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-red-400/60 mt-1">{certModalStudent.progress_pct.toFixed(1)}% completed</p>
                    </div>
                  </div>
                )}

                {certModalStudent.has_certificate && certModalStudent.status === 'Completed' && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 flex items-center justify-between">
                    <span>⚠️ Certificate already issued for this student. Uploading a new PDF will replace it.</span>
                    <a href={certModalStudent.certificate_url} target="_blank" rel="noopener noreferrer" className="underline font-bold whitespace-nowrap ml-2">View Existing</a>
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label">Certificate PDF File</label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    required
                    disabled={certModalStudent.status !== 'Completed'}
                    onChange={(e) => setCertFile(e.target.files[0] || null)}
                    className={`input text-sm text-slate-300 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 ${
                      certModalStudent.status !== 'Completed' ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  />
                  {certFile && (
                    <p className="text-[11px] text-emerald-400 mt-1">✓ Selected: {certFile.name} ({(certFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                <button type="button" onClick={() => setCertModalStudent(null)} className="btn btn-ghost text-sm">Cancel</button>
                <button
                  type="submit"
                  disabled={uploadingCert || !certFile || certModalStudent.status !== 'Completed'}
                  className="btn bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  title={certModalStudent.status !== 'Completed' ? 'Student must complete all OJT hours first' : ''}
                >
                  {uploadingCert ? <span className="spinner w-4 h-4 mr-2" /> : null}
                  {uploadingCert ? 'Uploading...' : 'Upload & Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
