import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns'

const IconDownload = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
const IconExcel = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>

export default function FacultyReports() {
    const [students, setStudents] = useState([])
    const [selectedStudentId, setSelectedStudentId] = useState('')
    
    // Filters
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    // Fetched details for preview
    const [timeLogs, setTimeLogs] = useState([])
    const [evaluations, setEvaluations] = useState([])
    const [loadingReport, setLoadingReport] = useState(false)
    const [exporting, setExporting] = useState(false)

    useEffect(() => {
        // Fetch students dropdown list
        api.get('/faculty/students').then(res => {
            setStudents(res.data?.students || [])
        }).catch(err => toast.error('Failed to load students'))
    }, [])

    const selectedStudent = useMemo(() => {
        return students.find(s => s.student_id === Number(selectedStudentId))
    }, [students, selectedStudentId])

    useEffect(() => {
        if (!selectedStudentId) return
        
        let url = `/timelogs/${selectedStudentId}?status=approved` // Or just fetch all assuming report is generic
        if (dateFrom) url += `&date_from=${dateFrom}`
        if (dateTo)   url += `&date_to=${dateTo}`
        
        setLoadingReport(true)
        Promise.all([
            api.get(url),
            api.get(`/evaluations/${selectedStudentId}`)
        ]).then(([logsRes, evalRes]) => {
            // Depending on backend structure, assuming logs are returned as {logs: []} 
            setTimeLogs(logsRes.data?.logs || [])
            setEvaluations(evalRes.data?.evaluations || [])
        }).catch(err => {
            console.error(err)
            toast.error('Failed to generate report preview data')
        }).finally(() => {
            setLoadingReport(false)
        })
    }, [selectedStudentId, dateFrom, dateTo])

    const weeklyBreakdown = useMemo(() => {
        if (!timeLogs || timeLogs.length === 0) return []
        
        const weeks = {}
        timeLogs.forEach(log => {
            // ensure it's approved logs only ideally, assuming endpoint handled it or filtering here
            if (log.status !== 'approved') return
            
            const date = parseISO(log.clock_in)
            // if we have manual client-side date filtering, handle it if the backend ignored it.
            if (dateFrom && date < parseISO(dateFrom)) return
            if (dateTo && date > parseISO(dateTo)) return

            const start = format(startOfWeek(date, { weekStartsOn: 1 }), 'MMM dd, yyyy')
            const end = format(endOfWeek(date, { weekStartsOn: 1 }), 'MMM dd, yyyy')
            const range = `${start} - ${end}`
            
            if (!weeks[range]) weeks[range] = 0
            weeks[range] += log.total_hours
        })
        
        return Object.entries(weeks).map(([week, total]) => ({ week, total })).sort()
    }, [timeLogs, dateFrom, dateTo])


    const downloadPDF = async () => {
        if (!selectedStudentId) return
        try {
            // We'll trigger a browser download for the PDF blob
            const url = `/reports/${selectedStudentId}/pdf`
            const response = await api.get(url, { responseType: 'blob' })
            const objectUrl = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = objectUrl
            link.setAttribute('download', `OJT_Report_${selectedStudent?.student_name.replace(/\s+/g, '_')}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (err) {
            toast.error('Failed to generate PDF. Backend may not have implemented GenerateStudentReport yet.')
        }
    }

    const exportToExcel = () => {
        if (students.length === 0) {
            toast.error("No student data available to export.")
            return
        }
        setExporting(true)
        try {
            const exportData = students.map(s => ({
                'Student Name': s.student_name,
                'Email': s.student_email,
                'Company': s.company_name,
                'Supervisor': s.supervisor_name,
                'Status': s.status,
                'Progress %': s.progress_pct,
                'Approved Hours': s.completed_hours,
                'Pending Hours': s.pending_hours,
                'Required Hours': s.required_hours,
                'Latest Evaluation Grade': s.latest_grade || 'N/A',
                'Latest Evaluation Score': s.latest_score || 0
            }))

            const ws = XLSX.utils.json_to_sheet(exportData)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "OJT Students Summary")
            
            const fileName = `OJT_Master_Export_${format(new Date(), 'yyyyMMdd')}.xlsx`
            XLSX.writeFile(wb, fileName)
            toast.success("Excel export successful!")
        } catch (err) {
            toast.error("Error exporting Excel file.")
            console.error(err)
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="fade-in max-w-7xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="page-title">Generate Reports</h1>
                    <p className="page-sub mt-1">Export individual progress PDFs or bulk Excel spreadsheets.</p>
                </div>
                {/* Global Export Action */}
                <button 
                    onClick={exportToExcel}
                    disabled={exporting || students.length === 0}
                    className="btn bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/30 font-medium whitespace-nowrap"
                >
                    <IconExcel /> {exporting ? 'Exporting...' : 'Export All to Excel'}
                </button>
            </div>

            {/* Config Card */}
            <div className="card grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="input-group">
                    <label className="input-label">Select Student for Individual Report</label>
                    <select 
                        className="input"
                        value={selectedStudentId}
                        onChange={e => setSelectedStudentId(e.target.value)}
                    >
                        <option value="">-- Choose Student --</option>
                        {students.map(s => (
                            <option key={s.student_id} value={s.student_id}>
                                {s.student_name} ({s.company_name})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="input-group">
                    <label className="input-label">Date From (Optional)</label>
                    <input 
                        type="date" 
                        className="input" 
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label className="input-label">Date To (Optional)</label>
                    <input 
                        type="date" 
                        className="input" 
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                    />
                </div>
            </div>

            {/* Preview Document Area */}
            {selectedStudentId && (
                <div className="border border-slate-800 rounded-2xl bg-slate-900/50 p-6 md:p-10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                    
                    <div className="flex justify-between items-start mb-8 relative z-10 border-b border-slate-800/80 pb-6">
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-widest bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">OJT Progress Report Preview</h2>
                            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Confidential Documentation</p>
                        </div>
                        <button 
                            onClick={downloadPDF}
                            className="btn bg-slate-800 hover:bg-slate-700 text-white text-sm"
                        >
                            <IconDownload /> Download PDF
                        </button>
                    </div>

                    {loadingReport ? (
                        <div className="flex justify-center py-20">
                            <div className="spinner w-8 h-8" />
                        </div>
                    ) : (
                        <div className="space-y-10 relative z-10">
                            {/* Student Info Block */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-800/40 p-6 rounded-xl border border-slate-700/50">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Student</p>
                                    <p className="font-semibold text-slate-200">{selectedStudent?.student_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Company</p>
                                    <p className="font-semibold text-slate-200">{selectedStudent?.company_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Status</p>
                                    <p className="font-semibold text-slate-200">{selectedStudent?.status}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Hours Logged</p>
                                    <p className="font-semibold text-orange-400 text-lg leading-none">{selectedStudent?.completed_hours} <span className="text-sm text-slate-500">/ {selectedStudent?.required_hours}h</span></p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-10">
                                {/* Weekly Hourly Breakdown */}
                                <div>
                                    <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Weekly Hour Breakdown</h3>
                                    {weeklyBreakdown.length === 0 ? (
                                        <div className="text-slate-500 italic text-sm py-4">No approved logs found matching criteria.</div>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                                                    <th className="py-2">Week Period (Mon-Sun)</th>
                                                    <th className="text-right py-2">Hours Logged</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/30">
                                                {weeklyBreakdown.map((row, i) => (
                                                    <tr key={i} className="text-slate-300 hover:bg-slate-800/20">
                                                        <td className="py-2.5">{row.week}</td>
                                                        <td className="text-right py-2.5 font-mono text-orange-400">{row.total.toFixed(2)}h</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Evaluations Summary */}
                                <div>
                                    <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Performance Evaluations</h3>
                                    {evaluations.length === 0 ? (
                                        <div className="text-slate-500 italic text-sm py-4">No evaluations heavily logged.</div>
                                    ) : (
                                        <div className="space-y-4">
                                            {evaluations.map(e => (
                                                <div key={e.ID} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-bold text-slate-200">Period: {e.period}</span>
                                                        <span className="bg-slate-900 px-2 py-1 rounded text-orange-400 font-mono text-xs font-bold border border-slate-700">{e.overall_score.toFixed(1)}/100</span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 italic">"{e.feedback || 'No written feedback provided.'}"</p>
                                                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-medium text-slate-500 tracking-wider uppercase">
                                                        <div className="flex justify-between"><span>Tech:</span> <span className="text-slate-300">{e.technical_score}</span></div>
                                                        <div className="flex justify-between"><span>Comm:</span> <span className="text-slate-300">{e.communication_score}</span></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
