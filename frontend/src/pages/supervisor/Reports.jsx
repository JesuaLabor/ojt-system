import { useEffect, useState } from 'react'
import api from '../../services/api'
import toast, { Toaster } from 'react-hot-toast'

export default function SupervisorReports() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)

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

  const downloadReport = async (studentId, studentName) => {
    setDownloadingId(studentId)
    const tid = toast.loading(`Generating PDF for ${studentName}...`)
    try {
      const resp = await api.get(`/reports/${studentId}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `OJT_Report_${studentName.replace(/\\s+/g, '_')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Report downloaded successfully!', { id: tid })
    } catch (e) {
      console.error(e)
      toast.error('Failed to generate report. Make sure student has data.', { id: tid })
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="fade-in space-y-6 max-w-7xl pb-10">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Generate Reports</h1>
          <p className="page-sub mt-1">Export comprehensive PDF performance reports for your students.</p>
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
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {[1,2,3,4,5,6].map(i => (
                 <div key={i} className="card animate-pulse h-40" />
             ))}
         </div>
      ) : students.length === 0 ? (
         <div className="card text-center py-16">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-lg font-semibold text-white">No students available</p>
            <p className="text-sm text-slate-500 mt-1">Reports can be generated once students are assigned.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStudents.length === 0 ? (
                <div className="col-span-full card text-center py-8 text-slate-500">
                    No students match your search.
                </div>
            ) : (
                filteredStudents.map(student => (
                    <div key={student.student_id} className="card flex flex-col h-full bg-slate-900 hover:border-slate-700 transition-colors">
                        <div className="flex items-start gap-4 mb-4">
                            {student.profile_photo ? (
                                <img 
                                    src={student.profile_photo} 
                                    alt="Avatar" 
                                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-700/50"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600
                                        flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-bold text-lg">
                                        {student.student_name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-white truncate">{student.student_name}</p>
                                <p className="text-xs text-slate-400 truncate mt-0.5">{student.company_name}</p>
                                <p className="text-[10px] text-teal-400 font-medium mt-1">
                                    {student.completed_hours}h / {student.required_hours}h
                                </p>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-800">
                            <button
                                onClick={() => downloadReport(student.student_id, student.student_name)}
                                disabled={downloadingId === student.student_id}
                                className="btn w-full justify-center bg-indigo-600 hover:bg-indigo-500 text-white
                                           disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
                            >
                                {downloadingId === student.student_id ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <circle cx="12" cy="12" r="10" strokeWidth="4" stroke="currentColor" strokeOpacity="0.3"></circle>
                                            <path d="M4 12a8 8 0 018-8v8H4z" fill="currentColor"></path>
                                        </svg>
                                        Generating...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-indigo-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download PDF Report
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      )}
    </div>
  )
}
