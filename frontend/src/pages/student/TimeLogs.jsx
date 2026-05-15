import { useEffect, useState, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Webcam from 'react-webcam'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

// -- Helpers ------------------------------------------------------------------
const pad = (n) => String(n).padStart(2, '0')

function formatElapsed(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function fmtTime(isoStr) {
    if (!isoStr) return '—'
    try { return format(new Date(isoStr), 'hh:mm a') } catch { return '—' }
}

function fmtDate(isoStr) {
    if (!isoStr) return '—'
    try { return format(new Date(isoStr), 'MMM d, yyyy') } catch { return '—' }
}

// -- Status Badge --------------------------------------------------------------
function StatusBadge({ status }) {
    const map = {
        pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        rejected: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    }
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${map[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
            {status}
        </span>
    )
}

// -- Main Component ------------------------------------------------------------
export default function TimeLogs() {
    const { user } = useAuthStore()
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [hasAssignment, setHasAssignment] = useState(true)
    const [activeLog, setActiveLog] = useState(null)
    const [elapsed, setElapsed] = useState(0)
    const [clockBusy, setClockBusy] = useState(false)
    const [showManual, setShowManual] = useState(false)
    const [manualBusy, setManualBusy] = useState(false)
    const [statusFilter, setStatusFilter] = useState('all')
    const [breakBusy, setBreakBusy] = useState(false)
    const timerRef = useRef(null)

    const [manualForm, setManualForm] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        time_in: '',
        time_out: '',
        remarks: '',
    })

    const fetchLogs = useCallback(async () => {
        try {
            const res = await api.get('/timelogs')
            const all = res.data?.logs || []
            setLogs(all)
            setHasAssignment(res.data?.has_assignment ?? true)
            const active = all.find(l => !l.clock_out && l.status === 'pending') || null
            setActiveLog(active)
            return active
        } catch (err) {
            console.error('Failed to fetch logs', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchLogs() }, [fetchLogs])

    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (!activeLog?.clock_in) { setElapsed(0); return }
        
        const start = new Date(activeLog.clock_in).getTime()
        const breakMins = activeLog.total_break_minutes || 0
        
        const tick = () => {
            if (activeLog.break_started_at) {
                // If on break, freeze the work timer at the moment break started
                const breakStart = new Date(activeLog.break_started_at).getTime()
                const secondsWork = Math.floor((breakStart - start) / 1000) - (breakMins * 60)
                setElapsed(Math.max(0, secondsWork))
            } else {
                // Active work: now - start - breakTime
                const secondsWork = Math.floor((Date.now() - start) / 1000) - (breakMins * 60)
                setElapsed(Math.max(0, secondsWork))
            }
        }
        
        tick()
        timerRef.current = setInterval(tick, 1000)
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [activeLog])

    const [showCamera, setShowCamera] = useState(false)
    const [cameraMode, setCameraMode] = useState('in')
    const webcamRef = useRef(null)

    const dataURLtoFile = (dataurl, filename) => {
        let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        return new File([u8arr], filename, { type: mime });
    }

    const handleClockIn = async (photoData) => {
        setClockBusy(true)
        try {
            const formData = new FormData()
            if (photoData) formData.append('photo', dataURLtoFile(photoData, 'clockin.jpg'))
            await api.post('/timelogs/clockin', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            toast.success('Clocked in successfully! Have a great shift 🚀')
            setShowCamera(false)
            await fetchLogs()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Clock-in failed.')
        } finally {
            setClockBusy(false)
        }
    }

    const handleClockOut = async (photoData) => {
        setClockBusy(true)
        try {
            const formData = new FormData()
            if (photoData) formData.append('photo', dataURLtoFile(photoData, 'clockout.jpg'))
            const res = await api.patch('/timelogs/clockout', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            const hours = res.data?.log?.total_hours ?? res.data?.total_hours
            toast.success(`Session ended! ${hours ? `${hours}h logged` : 'Log saved'} ✅`)
            setShowCamera(false)
            setActiveLog(null)
            setElapsed(0)
            await fetchLogs()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Clock-out failed.')
        } finally {
            setClockBusy(false)
        }
    }

    const captureAndSubmit = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot()
        if (!imageSrc) { toast.error('Check your camera.'); return }
        if (cameraMode === 'in') handleClockIn(imageSrc)
        else handleClockOut(imageSrc)
    }, [cameraMode, webcamRef])

    const handleStartBreak = async () => {
        setBreakBusy(true)
        try {
            await api.patch('/timelogs/break/start')
            toast.success('Break started! Time to rest ☕')
            await fetchLogs()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to start break.')
        } finally {
            setBreakBusy(false)
        }
    }

    const handleEndBreak = async () => {
        setBreakBusy(true)
        try {
            await api.patch('/timelogs/break/end')
            toast.success('Welcome back! Let\'s get to work 🚀')
            await fetchLogs()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to end break.')
        } finally {
            setBreakBusy(false)
        }
    }

    const handleManualSubmit = async (e) => {
        e.preventDefault()
        setManualBusy(true)
        try {
            const toISO = (date, time) => new Date(`${date}T${time}:00+08:00`).toISOString()
            const payload = {
                clock_in: toISO(manualForm.date, manualForm.time_in),
                ...(manualForm.time_out && { clock_out: toISO(manualForm.date, manualForm.time_out) }),
                ...(manualForm.remarks && { remarks: manualForm.remarks }),
            }
            await api.post('/timelogs', payload)
            toast.success('Manual entry saved!')
            setShowManual(false)
            await fetchLogs()
        } catch (err) {
            toast.error('Failed to save.')
        } finally {
            setManualBusy(false)
        }
    }

    const handleDownloadDTR = () => {
        if (!logs || logs.length === 0) {
            toast.error('No time logs available to generate DTR.')
            return
        }

        const doc = new jsPDF()

        // Document styling
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text('Daily Time Record (DTR)', 14, 20)
        
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.text(`Student: ${user?.name || 'Student'}`, 14, 28)
        
        const approvedLogs = logs.filter(l => l.status === 'approved')
        const totalApprovedHours = approvedLogs.reduce((s, l) => s + (l.total_hours || 0), 0)

        doc.text(`Total Approved Hours: ${totalApprovedHours.toFixed(1)} hrs`, 14, 34)

        const tableColumn = ["Date", "Time In", "Time Out", "Break (mins)", "Total Hours", "Remarks"]
        const tableRows = []

        // Sort logs by date ascending for the DTR
        const sortedLogs = [...logs].filter(l => l.status === 'approved').sort((a, b) => new Date(a.clock_in) - new Date(b.clock_in))

        if (sortedLogs.length === 0) {
            toast.error('No approved logs to include in the DTR.')
            return
        }

        sortedLogs.forEach(log => {
            const logData = [
                fmtDate(log.clock_in),
                fmtTime(log.clock_in),
                fmtTime(log.clock_out),
                log.total_break_minutes || 0,
                log.total_hours?.toFixed(1) || '-',
                log.remarks || '-'
            ]
            tableRows.push(logData)
        })

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
            styles: { fontSize: 10, cellPadding: 3 },
            alternateRowStyles: { fillColor: [248, 250, 252] } // Slate-50
        })

        doc.setFontSize(10)
        const finalY = doc.lastAutoTable?.finalY || 40
        doc.text("I certify on my honor that the above is a true and correct report of the hours of work performed,", 14, finalY + 15)
        doc.text("record of which was made daily at the time of arrival and departure from office.", 14, finalY + 20)
        
        doc.line(14, finalY + 40, 80, finalY + 40)
        doc.text("Student Signature", 25, finalY + 45)

        doc.line(110, finalY + 40, 180, finalY + 40)
        doc.text("Supervisor Signature", 125, finalY + 45)

        doc.save(`DTR_${user?.name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
        toast.success('DTR downloaded successfully! 📄')
    }

    const [previewPhoto, setPreviewPhoto] = useState(null)

    // -- Early Return (WAITING FOR ASSIGNMENT) ------------------------------------
    if (!loading && !hasAssignment) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center fade-in bg-slate-900/50 rounded-3xl border border-slate-800 m-6">
                <div className="text-6xl mb-6">💼</div>
                <h1 className="text-3xl font-bold text-white mb-4">Ready for your OJT?</h1>
                <p className="text-slate-400 max-w-md mb-8">
                    Hey <span className="text-indigo-400 font-bold">{user?.name || 'Student'}</span>, your account is active, but you haven't been assigned to a company yet.
                </p>
                <div className="flex gap-4">
                    <button onClick={() => window.location.reload()} className="btn btn-primary">Refresh Status</button>
                    <button onClick={() => window.location.href='/student/profile'} className="btn btn-ghost">Go to Profile</button>
                </div>
            </div>
        )
    }

    const filteredLogs = statusFilter === 'all' ? logs : logs.filter(l => l.status === statusFilter)
    const totalApproved = logs.filter(l => l.status === 'approved').reduce((s, l) => s + (l.total_hours || 0), 0)
    const totalPending = logs.filter(l => l.status === 'pending' && l.clock_out).reduce((s, l) => s + (l.total_hours || 0), 0)

    return (
        <>
        <div className="fade-in space-y-8 max-w-7xl mx-auto">
            {/* -- Header Section -- */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Time Logs</h1>
                    <p className="text-slate-500 mt-1">Track and manage your daily OJT hours.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleDownloadDTR} className="btn bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm py-2 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                        📄 Download DTR
                    </button>
                    <button onClick={() => setShowManual(!showManual)} className="btn bg-slate-800 hover:bg-slate-700 text-white border-slate-700 text-sm py-2 px-4 rounded-xl transition-all">
                        {showManual ? 'Close Form' : 'Add Manual Entry'}
                    </button>
                </div>
            </div>

            {/* -- Manual Entry Drawer -- */}
            {showManual && (
                <div className="card bg-indigo-500/5 border-indigo-500/20 animate-in slide-in-from-top-4 duration-300">
                    <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4">New Manual Entry</h2>
                    <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                        <div className="sm:col-span-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Date</label>
                            <input type="date" value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Time In</label>
                            <input type="time" value={manualForm.time_in} onChange={e => setManualForm({...manualForm, time_in: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Time Out</label>
                            <input type="time" value={manualForm.time_out} onChange={e => setManualForm({...manualForm, time_out: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all" />
                        </div>
                        <button type="submit" disabled={manualBusy} className="btn btn-primary h-[42px] rounded-xl font-bold">
                            {manualBusy ? 'Saving...' : 'Save Entry'}
                        </button>
                        <div className="sm:col-span-4 mt-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Remarks / Tasks Accomplished</label>
                            <input type="text" placeholder="e.g. Worked on frontend components..." value={manualForm.remarks} onChange={e => setManualForm({...manualForm, remarks: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all" />
                        </div>
                    </form>
                </div>
            )}

            {/* -- Hero Section: Clock + Stats -- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Clock Widget */}
                <div className="lg:col-span-7 card relative overflow-hidden flex flex-col items-center justify-center py-8 sm:py-10">
                    {/* Pulsing Aura */}
                    <div className={`flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 sm:mb-6 border transition-all 
                        ${activeLog?.break_started_at ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 
                          activeLog ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 
                          'bg-slate-800 text-slate-500 border-slate-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full 
                            ${activeLog?.break_started_at ? 'bg-amber-400 animate-pulse' : 
                              activeLog ? 'bg-emerald-400 animate-pulse' : 
                              'bg-slate-600'}`} />
                        {activeLog?.break_started_at ? 'On Break' : activeLog ? 'Recording Live' : 'System Idle'}
                    </div>

                    <h2 className={`text-[60px] sm:text-[100px] font-black leading-none tracking-tighter tabular-nums drop-shadow-2xl transition-colors
                        ${activeLog?.break_started_at ? 'text-amber-200/50' : 'text-white'}`}>
                        {formatElapsed(elapsed)}
                    </h2>

                    {activeLog && (
                        <div className="flex flex-col items-center mt-4 gap-1">
                            <p className="text-xs text-slate-500 font-medium italic">
                                Started at {fmtTime(activeLog.clock_in)}
                            </p>
                            {activeLog.total_break_minutes > 0 && (
                                <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-tight">
                                    Total Break: {activeLog.total_break_minutes} mins
                                </p>
                            )}
                        </div>
                    )}

                    <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-4 w-full max-w-sm px-6">
                        {activeLog ? (
                            <>
                                {activeLog.break_started_at ? (
                                    <button onClick={handleEndBreak} disabled={breakBusy} className="flex-1 py-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black shadow-xl shadow-amber-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                                        {breakBusy ? '...' : <><span>▶️</span> RESUME</>}
                                    </button>
                                ) : (
                                    <button onClick={handleStartBreak} disabled={breakBusy} className="flex-1 py-4 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700 font-black hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                                        {breakBusy ? '...' : <><span>☕</span> BREAK</>}
                                    </button>
                                )}
                                
                                <button onClick={() => { setCameraMode('out'); setShowCamera(true); }} disabled={clockBusy} className="flex-1 py-4 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white font-black shadow-xl shadow-red-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 text-sm">
                                    {clockBusy ? '...' : 'CLOCK OUT'}
                                </button>
                            </>
                        ) : (
                            <button onClick={() => { setCameraMode('in'); setShowCamera(true); }} disabled={clockBusy} className="w-full py-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black shadow-xl shadow-emerald-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                                {clockBusy ? '...' : 'CLOCK IN'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                    {loading ? (
                        <>
                            <div className="card h-full min-h-[160px] skeleton"></div>
                            <div className="card h-full min-h-[160px] skeleton"></div>
                            <div className="sm:col-span-2 card h-full min-h-[100px] skeleton"></div>
                        </>
                    ) : (
                        <>
                            <div className="card h-full border-l-4 border-emerald-500 flex flex-col justify-between p-6">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Approved Hours</div>
                                <div className="mt-2">
                                    <span className="text-4xl font-black text-white">{totalApproved.toFixed(1)}</span>
                                    <span className="text-sm font-bold text-slate-500 ml-2">hrs</span>
                                </div>
                                <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (totalApproved/600)*100)}%` }} />
                                </div>
                            </div>

                            <div className="card h-full border-l-4 border-amber-500 flex flex-col justify-between p-6">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Hours</div>
                                <div className="mt-2">
                                    <span className="text-4xl font-black text-white">{totalPending.toFixed(1)}</span>
                                    <span className="text-sm font-bold text-slate-500 ml-2">hrs</span>
                                </div>
                                <p className="text-[10px] text-amber-500/60 mt-4 font-bold">Awaiting Approval</p>
                            </div>

                            <div className="sm:col-span-2 card h-full bg-slate-900/50 border-slate-800 flex items-center justify-between p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-2xl">🏆</div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Target Completion</p>
                                        <p className="text-xs text-slate-500">600 Total Hours</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-indigo-400">{Math.round((totalApproved/600)*100)}%</p>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase">Progress</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* -- Logs Table Section -- */}
            <div className="card !p-0 overflow-hidden border-slate-800 shadow-2xl">
                <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/30">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Recent History
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-400 font-bold">{logs.length}</span>
                    </h3>
                    <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-xl">
                        <button onClick={() => setStatusFilter('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'all' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>All</button>
                        <button onClick={() => setStatusFilter('pending')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'pending' ? 'bg-amber-500/20 text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>Pending</button>
                        <button onClick={() => setStatusFilter('approved')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'approved' ? 'bg-emerald-500/20 text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}>Approved</button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-900/50 border-b border-slate-800/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Date & Session</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Duration</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Verification</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/30">
                            {loading ? (
                                <tr><td colSpan={5} className="py-20 text-center text-slate-600 animate-pulse">Synchronizing logs...</td></tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr><td colSpan={5} className="py-20 text-center text-slate-600 italic">No records found matching filter.</td></tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-indigo-500/[0.03] transition-colors group">
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{fmtDate(log.clock_in)}</p>
                                            <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase">{fmtTime(log.clock_in)} – {fmtTime(log.clock_out)}</p>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <p className="text-base font-black text-slate-300">{log.total_hours?.toFixed(1) || '—'}h</p>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <StatusBadge status={log.status} />
                                                {!log.clock_in_photo && !log.clock_out_photo && (
                                                    <span className="text-[9px] font-black text-slate-600 bg-slate-800 px-2 py-0.5 rounded uppercase tracking-tighter">
                                                        Manual
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex gap-2">
                                                {log.clock_in_photo && (
                                                    <button onClick={() => setPreviewPhoto({ url: log.clock_in_photo, title: 'Clock In Photo', date: log.clock_in })} className="w-8 h-8 rounded-lg border border-slate-700 overflow-hidden hover:border-indigo-500 hover:scale-110 transition-all shadow-lg">
                                                        <img src={log.clock_in_photo} alt="In" className="w-full h-full object-cover" />
                                                    </button>
                                                )}
                                                {log.clock_out_photo && (
                                                    <button onClick={() => setPreviewPhoto({ url: log.clock_out_photo, title: 'Clock Out Photo', date: log.clock_out })} className="w-8 h-8 rounded-lg border border-slate-700 overflow-hidden hover:border-rose-500 hover:scale-110 transition-all shadow-lg">
                                                        <img src={log.clock_out_photo} alt="Out" className="w-full h-full object-cover" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-[11px] text-slate-500 max-w-[200px] truncate italic">
                                            {log.remarks || '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* -- Modals (Moved outside the animated container to fix viewport centering) -- */}
        {showCamera && (
            <div className="fixed inset-0 z-[70] flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-24 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
                <div className="relative w-full max-w-2xl bg-slate-900 rounded-[2rem] sm:rounded-[40px] overflow-hidden border border-slate-700/50 shadow-[0_0_100px_rgba(0,0,0,0.9)] my-4">
                    <div className="p-5 sm:p-10 pb-4 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight">Identity Check</h3>
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Secure</span>
                            </div>
                            <p className="text-[9px] sm:text-xs text-slate-500 font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] mt-1.5 sm:mt-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 sm:w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                Live Biometric Verification
                            </p>
                        </div>
                        <button onClick={() => setShowCamera(false)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-800/50 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-slate-700/50">✕</button>
                    </div>
                    <div className="px-5 sm:px-10 pb-8 sm:pb-12">
                        <div className="relative aspect-[4/3] sm:aspect-video rounded-2xl sm:rounded-[32px] overflow-hidden border-2 border-slate-800 bg-black shadow-inner mb-6 sm:mb-8 group">
                            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1] transition-all" />
                            
                            {/* Biometric Guide Oval */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-[140px] sm:w-[180px] h-[200px] sm:h-[240px] border-2 border-dashed border-indigo-500/30 rounded-[100%] shadow-[0_0_40px_rgba(99,102,241,0.05)]"></div>
                            </div>

                            {/* Scanning Line Effect */}
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-scan"></div>
                            
                            {/* Corners Overlay */}
                            <div className="absolute top-4 sm:top-6 left-4 sm:left-6 w-6 sm:w-8 h-6 sm:h-8 border-t-2 border-l-2 border-indigo-500/50 rounded-tl-lg"></div>
                            <div className="absolute top-4 sm:top-6 right-4 sm:right-6 w-6 sm:w-8 h-6 sm:h-8 border-t-2 border-r-2 border-indigo-500/50 rounded-tr-lg"></div>
                            <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 w-6 sm:w-8 h-6 sm:h-8 border-b-2 border-l-2 border-indigo-500/50 rounded-bl-lg"></div>
                            <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 w-6 sm:w-8 h-6 sm:h-8 border-b-2 border-r-2 border-indigo-500/50 rounded-br-lg"></div>

                            <div className="absolute bottom-3 sm:bottom-4 left-0 w-full text-center">
                                <span className="text-[8px] sm:text-[9px] font-black text-indigo-400/60 uppercase tracking-[0.2em] sm:tracking-[0.3em] bg-black/40 backdrop-blur-sm px-3 sm:px-4 py-1 rounded-full">Position Face within Frame</span>
                            </div>
                        </div>
                        <button onClick={captureAndSubmit} disabled={clockBusy} className="w-full py-4 sm:py-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-base sm:text-lg shadow-2xl shadow-indigo-900/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 sm:gap-4 group">
                            {clockBusy ? (
                                <span className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-4 h-4 sm:w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    VERIFYING...
                                </span>
                            ) : (
                                <>
                                    <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform">📸</span> 
                                    CAPTURE & CLOCK {cameraMode.toUpperCase()}
                                </>
                            )}
                        </button>
                        <p className="text-center text-[9px] sm:text-[10px] text-slate-600 mt-5 sm:mt-6 font-bold uppercase tracking-widest">Powered by SecureAuth Biometrics</p>
                    </div>
                </div>
            </div>
        )}

        {previewPhoto && (
            <div 
                onClick={() => setPreviewPhoto(null)}
                className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in zoom-in duration-300 cursor-zoom-out"
            >
                <div 
                    onClick={(e) => e.stopPropagation()}
                    className="relative max-w-4xl w-full flex flex-col items-center cursor-default"
                >
                    
                    <div className="relative w-full bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-slate-700/50 shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-8 duration-500">
                        {/* Integrated Close Button (Safe Position) */}
                        <button onClick={() => setPreviewPhoto(null)} className="absolute top-4 right-4 sm:top-8 sm:right-8 w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all z-20 shadow-2xl group">
                            <span className="text-lg sm:text-2xl group-hover:scale-110 transition-transform">✕</span>
                        </button>

                        {/* Image with Pro Corners */}
                        <div className="relative overflow-hidden group">
                            <img src={previewPhoto.url} alt="Verification" className="w-full h-auto max-h-[65vh] sm:max-h-[70vh] object-contain bg-black/40 mx-auto" />
                            
                            {/* Scanning Corners on Preview */}
                            <div className="absolute top-6 sm:top-8 left-6 sm:left-8 w-8 sm:w-10 h-8 sm:h-10 border-t-2 border-l-2 border-indigo-500/40 rounded-tl-xl pointer-events-none"></div>
                            <div className="absolute top-6 sm:top-8 right-6 sm:right-8 w-8 sm:w-10 h-8 sm:h-10 border-t-2 border-r-2 border-indigo-500/40 rounded-tr-xl pointer-events-none"></div>
                            <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-8 w-8 sm:w-10 h-8 sm:h-10 border-b-2 border-l-2 border-indigo-500/40 rounded-bl-xl pointer-events-none"></div>
                            <div className="absolute bottom-6 sm:bottom-8 right-6 sm:right-8 w-8 sm:w-10 h-8 sm:h-10 border-b-2 border-r-2 border-indigo-500/40 rounded-br-xl pointer-events-none"></div>
                        </div>

                        {/* Glassmorphic Info Bar */}
                        <div className="p-6 sm:p-10 bg-gradient-to-t from-slate-900 via-slate-900/95 to-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                                    <h4 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight">{previewPhoto.title}</h4>
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest hidden xs:inline-block">Verified</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-700"></span>
                                    {fmtDate(previewPhoto.date)} at {fmtTime(previewPhoto.date)}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">System Status</p>
                                    <p className="text-emerald-400 font-black text-sm">SECURE ARCHIVE</p>
                                </div>
                                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg sm:text-2xl shadow-inner">
                                    ✅
                                </div>
                            </div>
                        </div>
                    </div>
                    <p className="mt-4 sm:mt-6 text-slate-500 text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.3em] opacity-50">Secure Biometric Archival System</p>
                </div>
            </div>
        )}
        </>
    )
}
