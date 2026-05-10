import { useEffect, useState, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Webcam from 'react-webcam'
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
    const timerRef = useRef(null)

    const [manualForm, setManualForm] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        time_in: '',
        time_out: '',
        remarks: '',
    })

    const fetchLogs = useCallback(async () => {
        try {
            const res = await api.get('/timelogs/')
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
        const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
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
            await api.post('/timelogs/', payload)
            toast.success('Manual entry saved!')
            setShowManual(false)
            await fetchLogs()
        } catch (err) {
            toast.error('Failed to save.')
        } finally {
            setManualBusy(false)
        }
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
        <div className="fade-in space-y-8 max-w-7xl mx-auto">
            {/* -- Header Section -- */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Time Logs</h1>
                    <p className="text-slate-500 mt-1">Track and manage your daily OJT hours.</p>
                </div>
                <div className="flex items-center gap-3">
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Clock Widget */}
                <div className="lg:col-span-7 card relative overflow-hidden flex flex-col items-center justify-center py-12">
                    {/* Pulsing Aura */}
                    <div className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${activeLog ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[80px] animate-pulse" />
                    </div>

                    <div className={`flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 border transition-all ${activeLog ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${activeLog ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                        {activeLog ? 'Recording Live' : 'System Idle'}
                    </div>

                    <h2 className="text-[80px] sm:text-[100px] font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-2xl">
                        {formatElapsed(elapsed)}
                    </h2>

                    {activeLog && (
                        <p className="text-xs text-slate-500 mt-4 font-medium italic">
                            Started at {fmtTime(activeLog.clock_in)}
                        </p>
                    )}

                    <div className="mt-10 flex gap-4 w-full max-w-xs">
                        {activeLog ? (
                            <button onClick={() => { setCameraMode('out'); setShowCamera(true); }} disabled={clockBusy} className="w-full py-4 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white font-black shadow-xl shadow-red-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                                {clockBusy ? 'Saving...' : 'CLOCK OUT'}
                            </button>
                        ) : (
                            <button onClick={() => { setCameraMode('in'); setShowCamera(true); }} disabled={clockBusy} className="w-full py-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black shadow-xl shadow-emerald-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                                {clockBusy ? 'Connecting...' : 'CLOCK IN'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="card border-l-4 border-emerald-500 flex flex-col justify-between p-6">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Approved Hours</div>
                        <div className="mt-2">
                            <span className="text-4xl font-black text-white">{totalApproved.toFixed(1)}</span>
                            <span className="text-sm font-bold text-slate-500 ml-2">hrs</span>
                        </div>
                        <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (totalApproved/600)*100)}%` }} />
                        </div>
                    </div>

                    <div className="card border-l-4 border-amber-500 flex flex-col justify-between p-6">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Hours</div>
                        <div className="mt-2">
                            <span className="text-4xl font-black text-white">{totalPending.toFixed(1)}</span>
                            <span className="text-sm font-bold text-slate-500 ml-2">hrs</span>
                        </div>
                        <p className="text-[10px] text-amber-500/60 mt-4 font-bold">Awaiting Supervisor Approval</p>
                    </div>

                    <div className="sm:col-span-2 card bg-slate-900/50 border-slate-800 flex items-center justify-between p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-2xl">🏆</div>
                            <div>
                                <p className="text-sm font-bold text-white">Target Completion</p>
                                <p className="text-xs text-slate-500">600 Total Hours Required</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-indigo-400">{Math.round((totalApproved/600)*100)}%</p>
                            <p className="text-[10px] font-bold text-slate-600 uppercase">Progress</p>
                        </div>
                    </div>
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

            {/* -- Modals -- */}
            {showCamera && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="relative w-full max-w-xl bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl">
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">Identity Check</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Verification Required</p>
                            </div>
                            <button onClick={() => setShowCamera(false)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all">✕</button>
                        </div>
                        <div className="px-8 pb-8">
                            <div className="relative aspect-[4/3] rounded-[24px] overflow-hidden border-2 border-slate-800 bg-black shadow-inner mb-6">
                                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none" />
                            </div>
                            <button onClick={captureAndSubmit} disabled={clockBusy} className="w-full py-5 rounded-[20px] bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg shadow-xl shadow-indigo-900/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                                {clockBusy ? 'PROCESSING...' : (
                                    <><span>📸</span> CAPTURE & PROCEED</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {previewPhoto && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm animate-in zoom-in duration-300">
                    <div className="relative max-w-3xl w-full">
                        <button onClick={() => setPreviewPhoto(null)} className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-2 text-sm font-bold">
                            ✕ CLOSE PREVIEW
                        </button>
                        <div className="bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl">
                            <img src={previewPhoto.url} alt="Verification" className="w-full h-auto" />
                            <div className="p-6 bg-slate-900/90 border-t border-slate-800">
                                <h4 className="text-white font-black text-lg">{previewPhoto.title}</h4>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{fmtDate(previewPhoto.date)} at {fmtTime(previewPhoto.date)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
