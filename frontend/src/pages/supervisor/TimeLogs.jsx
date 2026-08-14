import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import useBadgeStore from '../../store/badgeStore'

export default function SupervisorTimeLogs() {
  const { setBadge, decrement } = useBadgeStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStudentId = searchParams.get('student')

  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(initialStudentId || '')
  
  const [logs, setLogs] = useState([])
  const [summary, setSummary] = useState(null)
  const [loadingLogs, setLoadingLogs] = useState(false)
  
  const [rejectingLogId, setRejectingLogId] = useState(null)
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [previewPhoto, setPreviewPhoto] = useState(null)

  // Load students for the dropdown
  useEffect(() => {
    api.get('/supervisor/students')
      .then(res => {
        const studentList = res.data?.students || []
        setStudents(studentList)
        const pendingCount = res.data?.total_pending_approvals || 0
        setBadge('pendingApprovals', pendingCount)
        // optionally select first student with pending logs if none selected
        if (!initialStudentId && studentList.length > 0) {
          const pendingStd = studentList.find(s => s.pending_logs > 0)
          setSelectedStudent(pendingStd ? pendingStd.student_id : studentList[0].student_id)
        }
      })
      .catch(console.error)
  }, [initialStudentId, setBadge])

  // Load logs when student changes
  useEffect(() => {
    if (!selectedStudent) return
    setSearchParams({ student: selectedStudent })
    
    setLoadingLogs(true)
    api.get(`/timelogs/${selectedStudent}`)
      .then(res => {
        setLogs(res.data?.logs || [])
        setSummary(res.data?.summary || null)
      })
      .catch(err => {
        console.error(err)
        toast.error('Failed to load time logs.')
      })
      .finally(() => setLoadingLogs(false))
  }, [selectedStudent, setSearchParams])

  const handleApprove = async (logId) => {
    try {
      await api.patch(`/timelogs/${logId}/approve`)
      toast.success('Time log approved')
      setLogs(prev => prev.map(l => l.ID === logId ? { ...l, status: 'approved' } : l))
      decrement('pendingApprovals')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve log')
    }
  }

  const handleReject = async (logId) => {
    if (!rejectRemarks.trim()) {
      toast.error('Rejection remarks are required')
      return
    }
    try {
      await api.patch(`/timelogs/${logId}/reject`, { remarks: rejectRemarks })
      toast.success('Time log rejected')
      setLogs(prev => prev.map(l => l.ID === logId ? { ...l, status: 'rejected', remarks: rejectRemarks } : l))
      setRejectingLogId(null)
      setRejectRemarks('')
      decrement('pendingApprovals')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject log')
    }
  }

  return (
    <div className="fade-in space-y-6 max-w-7xl pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Time Log Approvals</h1>
          <p className="page-sub mt-1">Review and approve daily hours submitted by your students.</p>
        </div>
        
        <div className="min-w-[240px]">
          <select 
            className="input w-full cursor-pointer bg-slate-900"
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
          >
            <option value="" disabled>Select a student...</option>
            {students.map(s => (
              <option key={s.student_id} value={s.student_id}>
                {s.student_name} {s.pending_logs > 0 ? `(${s.pending_logs} pending)` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedStudent ? (
         <div className="card text-center py-12">
            <p className="text-3xl mb-3">👨‍🎓</p>
            <p className="text-sm font-medium text-slate-400">No student selected</p>
            <p className="text-xs text-slate-600 mt-1">Please select a student to view their time logs.</p>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Student Logs</h2>
            {summary && (
               <div className="flex gap-4 text-xs">
                 <div className="text-center px-3 py-1 bg-emerald-500/10 rounded border border-emerald-500/20 text-emerald-400">
                    <span className="font-bold">{summary.total_approved_hours}h</span> Approved
                 </div>
                 <div className="text-center px-3 py-1 bg-amber-500/10 rounded border border-amber-500/20 text-amber-400">
                    <span className="font-bold">{summary.total_pending_hours}h</span> Pending
                 </div>
               </div>
            )}
          </div>

          <div className="table-wrap">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr>
                  <th className="table-head">Date</th>
                  <th className="table-head">Clock In</th>
                  <th className="table-head">Clock Out</th>
                  <th className="table-head">Total Hours</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Verification</th>
                  <th className="table-head">Student Remarks</th>
                  <th className="table-head text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loadingLogs ? (
                   <tr>
                     <td colSpan="7" className="text-center py-10 text-slate-500 text-sm animate-pulse">
                        Loading logs...
                     </td>
                   </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-slate-500 text-sm">
                       No time logs submitted by this student yet.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => {
                    const clockIn = log.clock_in ? new Date(log.clock_in) : null;
                    const clockOut = log.clock_out ? new Date(log.clock_out) : null;
                    return (
                      <tr key={log.ID} className="table-row">
                        <td className="table-cell font-medium text-white">
                          {clockIn ? format(clockIn, 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="table-cell">
                          {clockIn ? format(clockIn, 'h:mm a') : '—'}
                        </td>
                        <td className="table-cell">
                          {clockOut ? format(clockOut, 'h:mm a') : <span className="text-indigo-400">Ongoing</span>}
                        </td>
                        <td className="table-cell font-semibold text-teal-400">
                          {log.total_hours ? `${log.total_hours}h` : '—'}
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`badge ${
                                log.status === 'approved' ? 'badge-approved' : 
                                log.status === 'rejected' ? 'badge-rejected' : 'badge-pending'
                              }`}>
                              {log.status}
                            </span>
                            {!log.clock_in_photo && !log.clock_out_photo && (
                              <span className="text-[9px] font-black text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/50 uppercase tracking-tighter">
                                Manual
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="table-cell text-xs text-slate-400 max-w-[150px] truncate" title={log.remarks}>
                          {log.status === 'rejected' ? <span className="text-red-400">Rejected: {log.remarks}</span> : (log.remarks || '—')}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1.5">
                              {log.clock_in_photo && (
                                  <button 
                                      onClick={() => setPreviewPhoto({ url: log.clock_in_photo, title: 'Clock In Photo', date: log.clock_in })}
                                      className="w-8 h-8 rounded border border-slate-700 overflow-hidden hover:border-emerald-500 transition shadow-sm"
                                  >
                                      <img src={log.clock_in_photo} alt="In" className="w-full h-full object-cover" />
                                  </button>
                              )}
                              {log.clock_out_photo && (
                                  <button 
                                      onClick={() => setPreviewPhoto({ url: log.clock_out_photo, title: 'Clock Out Photo', date: log.clock_out })}
                                      className="w-8 h-8 rounded border border-slate-700 overflow-hidden hover:border-rose-500 transition shadow-sm"
                                  >
                                      <img src={log.clock_out_photo} alt="Out" className="w-full h-full object-cover" />
                                  </button>
                              )}
                              {!log.clock_in_photo && !log.clock_out_photo && (
                                  <span className="text-[10px] text-slate-600 italic">None</span>
                              )}
                          </div>
                        </td>
                        <td className="table-cell text-right">
                          {log.status === 'pending' && clockOut ? (
                            <div className="flex items-center justify-end gap-2">
                              {rejectingLogId === log.ID ? (
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="text" 
                                    placeholder="Reason..."
                                    className="input-field bg-slate-800 border-red-500/50 text-xs py-1 px-2 w-32 rounded outline-none text-white focus:border-red-500"
                                    value={rejectRemarks}
                                    onChange={(e) => setRejectRemarks(e.target.value)}
                                    autoFocus
                                  />
                                  <button onClick={() => handleReject(log.ID)} className="btn btn-sm btn-danger px-2 py-1">Confirm</button>
                                  <button onClick={() => setRejectingLogId(null)} className="text-[10px] text-slate-400 hover:text-white px-1">Cancel</button>
                                </div>
                              ) : (
                                <>
                                  <button onClick={() => handleApprove(log.ID)} className="btn btn-sm btn-success">Approve</button>
                                  <button onClick={() => setRejectingLogId(log.ID)} className="btn btn-sm btn-danger">Reject</button>
                                </>
                              )}
                            </div>
                          ) : (
                             <span className="text-[10px] text-slate-500 uppercase tracking-widest">{log.status}</span>
                          )}
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

      {/* ── Photo Preview Modal ────────────────────────────────────────── */}
      {previewPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="relative max-w-2xl w-full">
                  <button 
                      onClick={() => setPreviewPhoto(null)}
                      className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-2 text-sm"
                  >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      Close
                  </button>
                  <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                      <img src={previewPhoto.url} alt="Verification" className="w-full h-auto" />
                      <div className="p-4 bg-slate-900 border-t border-slate-800">
                          <h4 className="text-white font-semibold">{previewPhoto.title}</h4>
                          <p className="text-xs text-slate-500">{previewPhoto.date ? format(new Date(previewPhoto.date), 'MMM d, yyyy · h:mm a') : '—'}</p>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}
