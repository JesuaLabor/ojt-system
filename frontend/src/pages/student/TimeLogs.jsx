import { useEffect, useState, useCallback, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import Webcam from 'react-webcam'
import api from '../../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        pending: 'badge-pending',
        approved: 'badge-approved',
        rejected: 'badge-rejected',
    }
    return <span className={`badge ${map[status] || 'badge-active'}`}>{status}</span>
}

// ── Table Skeleton ─────────────────────────────────────────────────────────────
function TableSkeleton() {
    return (
        <>
            {[1, 2, 3, 4].map(i => (
                <tr key={i} className="border-b border-slate-800 animate-pulse">
                    {[1, 2, 3, 4, 5].map(j => (
                        <td key={j} className="px-4 py-3.5">
                            <div className="skeleton h-3.5 rounded w-full" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TimeLogs() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeLog, setActiveLog] = useState(null)   // log with no clock_out
    const [elapsed, setElapsed] = useState(0)      // seconds since clock_in
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

    // ── Fetch Logs ──────────────────────────────────────────────────────────────
    const fetchLogs = useCallback(async () => {
        try {
            const res = await api.get('/timelogs/')
            const all = res.data?.logs || []
            setLogs(all)
            // Find active (no clock_out + pending)
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

    // ── Live Timer ──────────────────────────────────────────────────────────────
    useEffect(() => {
        clearInterval(timerRef.current)
        if (!activeLog?.clock_in) { setElapsed(0); return }

        const start = new Date(activeLog.clock_in).getTime()
        const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
        tick()
        timerRef.current = setInterval(tick, 1000)
        return () => clearInterval(timerRef.current)
    }, [activeLog])

    // ── Photo Verification ──────────────────────────────────────────────────────
    const [showCamera, setShowCamera] = useState(false)
    const [cameraMode, setCameraMode] = useState('in') // 'in' or 'out'
    const webcamRef = useRef(null)

    // Helper: Convert base64 dataURI to File object
    const dataURLtoFile = (dataurl, filename) => {
        let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        return new File([u8arr], filename, { type: mime });
    }

    // ── Clock In ────────────────────────────────────────────────────────────────
    const handleClockIn = async (photoData) => {
        setClockBusy(true)
        try {
            const formData = new FormData()
            if (photoData) {
                formData.append('photo', dataURLtoFile(photoData, 'clockin.jpg'))
            }

            await api.post('/timelogs/clockin', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            
            toast.success('Clocked in successfully! Have a productive session 🚀')
            setShowCamera(false)
            await fetchLogs()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Clock-in failed. Please try again.')
        } finally {
            setClockBusy(false)
        }
    }

    // ── Clock Out ───────────────────────────────────────────────────────────────
    const handleClockOut = async (photoData) => {
        setClockBusy(true)
        try {
            const formData = new FormData()
            if (photoData) {
                formData.append('photo', dataURLtoFile(photoData, 'clockout.jpg'))
            }

            const res = await api.patch('/timelogs/clockout', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            
            const hours = res.data?.log?.total_hours ?? res.data?.total_hours
            toast.success(`Session ended! ${hours ? `${hours}h logged` : 'Log saved'} ✅`)
            setShowCamera(false)
            setActiveLog(null)
            setElapsed(0)
            await fetchLogs()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Clock-out failed. Please try again.')
        } finally {
            setClockBusy(false)
        }
    }

    const openCamera = (mode) => {
        setCameraMode(mode)
        setShowCamera(true)
    }

    const captureAndSubmit = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot()
        if (!imageSrc) {
            toast.error('Failed to capture photo. Please check your camera.')
            return
        }
        if (cameraMode === 'in') handleClockIn(imageSrc)
        else handleClockOut(imageSrc)
    }, [webcamRef, cameraMode])

    // ── Manual Entry ────────────────────────────────────────────────────────────
    const handleManualSubmit = async (e) => {
        e.preventDefault()
        if (!manualForm.time_in) {
            toast.error('Clock-in time is required')
            return
        }
        setManualBusy(true)
        try {
            const toISO = (date, time) => new Date(`${date}T${time}:00+08:00`).toISOString()
            const payload = {
                clock_in: toISO(manualForm.date, manualForm.time_in),
                ...(manualForm.time_out && { clock_out: toISO(manualForm.date, manualForm.time_out) }),
                ...(manualForm.remarks && { remarks: manualForm.remarks }),
            }
            await api.post('/timelogs/', payload)
            toast.success('Manual time log added successfully!')
            setShowManual(false)
            setManualForm({ date: format(new Date(), 'yyyy-MM-dd'), time_in: '', time_out: '', remarks: '' })
            await fetchLogs()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save manual entry.')
        } finally {
            setManualBusy(false)
        }
    }

    const [previewPhoto, setPreviewPhoto] = useState(null)

    // ── Filtered logs ───────────────────────────────────────────────────────────
    const filteredLogs = statusFilter === 'all'
        ? logs
        : logs.filter(l => l.status === statusFilter)

    const totalApproved = logs.filter(l => l.status === 'approved').reduce((s, l) => s + (l.total_hours || 0), 0)
    const totalPending = logs.filter(l => l.status === 'pending' && l.clock_out).reduce((s, l) => s + (l.total_hours || 0), 0)

    return (
        <div className="fade-in space-y-6 max-w-6xl">

            {/* ── Page Header ──────────────────────────────────────────────────── */}
            <div className="page-header">
                <h1 className="page-title">Time Logs</h1>
                <p className="page-sub">Track your daily OJT hours — clock in, clock out, or log manually.</p>
            </div>

            {/* ── Clock Widget ─────────────────────────────────────────────────── */}
            <div className="card text-center py-10 relative overflow-hidden">
                {/* Background glow */}
                <div className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${activeLog
                        ? 'opacity-100'
                        : 'opacity-0'
                    }`}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                          w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl" />
                </div>

                {/* Status pill */}
                <div className="flex justify-center mb-5">
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold
                          border transition-all duration-300 ${activeLog
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${activeLog ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        {activeLog ? 'Active Session' : 'Not Clocked In'}
                    </div>
                </div>

                {/* Timer display */}
                <div className="mb-2">
                    <p className="font-mono text-6xl font-bold tracking-tight text-white tabular-nums">
                        {formatElapsed(elapsed)}
                    </p>
                    {activeLog && (
                        <p className="text-xs text-slate-500 mt-2">
                            Started at {fmtTime(activeLog.clock_in)} on {fmtDate(activeLog.clock_in)}
                        </p>
                    )}
                </div>

                {/* Session info */}
                {!activeLog && logs.length > 0 && (
                    <p className="text-xs text-slate-600 mb-6">
                        Last session: {fmtDate(logs[0]?.clock_in)} · {logs[0]?.total_hours ?? '—'}h
                    </p>
                )}
                {!activeLog && logs.length === 0 && (
                    <p className="text-xs text-slate-600 mb-6">No sessions recorded yet</p>
                )}
                {activeLog && <div className="mb-6" />}

                {/* Clock In / Clock Out CTA */}
                <div className="flex justify-center px-4 sm:px-0">
                    {activeLog ? (
                        // ── Clock Out button ─────────────────────────────────────────
                        <button
                            id="btn-clock-out"
                            onClick={() => openCamera('out')}
                            disabled={clockBusy}
                            className="relative group w-full sm:w-auto"
                        >
                            {/* Pulsing ring */}
                            <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                            <span className={`relative flex items-center justify-center gap-3 w-full sm:w-auto px-12 py-4 rounded-full text-base font-bold
                               bg-gradient-to-r from-red-600 to-rose-600 text-white
                               shadow-xl shadow-red-900/50 transition-all duration-200
                               ${clockBusy ? 'opacity-70 scale-95' : 'hover:scale-105 hover:shadow-red-800/60'}`}>
                                {clockBusy ? (
                                    <><span className="spinner" /> Clocking out...</>
                                ) : (
                                    <><StopIcon /> Clock Out</>
                                )}
                            </span>
                        </button>
                    ) : (
                        // ── Clock In button ──────────────────────────────────────────
                        <button
                            id="btn-clock-in"
                            onClick={() => openCamera('in')}
                            disabled={clockBusy}
                            className="relative group w-full sm:w-auto"
                        >
                            <span className={`relative flex items-center justify-center gap-3 w-full sm:w-auto px-12 py-4 rounded-full text-base font-bold
                               bg-gradient-to-r from-emerald-600 to-green-500 text-white
                               shadow-xl shadow-emerald-900/50 transition-all duration-200
                               ${clockBusy ? 'opacity-70 scale-95' : 'hover:scale-105 hover:shadow-emerald-800/60'}`}>
                                {clockBusy ? (
                                    <><span className="spinner" /> Clocking in...</>
                                ) : (
                                    <><PlayIcon /> Clock In</>
                                )}
                            </span>
                        </button>
                    )}
                </div>

                {/* Quick stats row */}
                <div className="flex justify-center gap-8 mt-8 pt-6 border-t border-slate-800">
                    <div className="text-center">
                        <p className="text-lg font-bold text-emerald-400">{totalApproved.toFixed(1)}h</p>
                        <p className="text-xs text-slate-500 mt-0.5">Approved</p>
                    </div>
                    <div className="w-px bg-slate-800" />
                    <div className="text-center">
                        <p className="text-lg font-bold text-amber-400">{totalPending.toFixed(1)}h</p>
                        <p className="text-xs text-slate-500 mt-0.5">Pending</p>
                    </div>
                    <div className="w-px bg-slate-800" />
                    <div className="text-center">
                        <p className="text-lg font-bold text-slate-300">{logs.length}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Total Sessions</p>
                    </div>
                </div>
            </div>

            {/* ── Manual Entry Toggle ───────────────────────────────────────────── */}
            <div className="card">
                <button
                    onClick={() => setShowManual(!showManual)}
                    className="w-full flex items-center justify-between group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                            <PencilIcon />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-white">Manual Entry</p>
                            <p className="text-xs text-slate-500">Log hours for a past or offline session</p>
                        </div>
                    </div>
                    <ChevronIcon open={showManual} />
                </button>

                {showManual && (
                    <form
                        onSubmit={handleManualSubmit}
                        className="mt-5 pt-5 border-t border-slate-800 fade-in"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Date */}
                            <div className="input-group">
                                <label className="input-label">Date</label>
                                <input
                                    type="date" required
                                    value={manualForm.date}
                                    max={format(new Date(), 'yyyy-MM-dd')}
                                    onChange={e => setManualForm({ ...manualForm, date: e.target.value })}
                                    className="input"
                                />
                            </div>

                            {/* Time In */}
                            <div className="input-group">
                                <label className="input-label">Time In</label>
                                <input
                                    type="time" required
                                    value={manualForm.time_in}
                                    onChange={e => setManualForm({ ...manualForm, time_in: e.target.value })}
                                    className="input"
                                />
                            </div>

                            {/* Time Out */}
                            <div className="input-group">
                                <label className="input-label">Time Out <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
                                <input
                                    type="time"
                                    value={manualForm.time_out}
                                    onChange={e => setManualForm({ ...manualForm, time_out: e.target.value })}
                                    className="input"
                                />
                            </div>

                            {/* Remarks */}
                            <div className="input-group">
                                <label className="input-label">Remarks</label>
                                <input
                                    type="text"
                                    placeholder="Optional note…"
                                    value={manualForm.remarks}
                                    onChange={e => setManualForm({ ...manualForm, remarks: e.target.value })}
                                    className="input"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-4">
                            <button type="submit" disabled={manualBusy} className="btn btn-primary">
                                {manualBusy ? <><span className="spinner" /> Saving…</> : '💾 Save Log'}
                            </button>
                            <button type="button" onClick={() => setShowManual(false)} className="btn btn-ghost btn-sm">
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* ── Logs Table ────────────────────────────────────────────────────── */}
            <div className="card !p-0 overflow-hidden">
                {/* Table header */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
                    <div>
                        <h2 className="text-sm font-semibold text-white">Time Log History</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{filteredLogs.length} entries shown</p>
                    </div>
                    {/* Filter tabs */}
                    <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1">
                        {['all', 'pending', 'approved', 'rejected'].map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${statusFilter === f
                                        ? 'bg-slate-700 text-white shadow'
                                        : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr>
                                {['Date', 'Clock In', 'Clock Out', 'Total Hours', 'Status', 'Verification', 'Remarks'].map(h => (
                                    <th key={h} className="table-head first:pl-5 last:pr-5">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton />
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-slate-600">
                                        <p className="text-3xl mb-2">⏱️</p>
                                        <p className="text-sm font-medium text-slate-500">
                                            {statusFilter === 'all' ? 'No time logs yet.' : `No ${statusFilter} logs.`}
                                        </p>
                                        {statusFilter === 'all' && (
                                            <p className="text-xs mt-1">Clock in above to start your first session!</p>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log, i) => (
                                    <tr key={log.ID || i} className="table-row group">
                                        <td className="table-cell pl-5 font-medium text-white">
                                            {fmtDate(log.clock_in)}
                                        </td>
                                        <td className="table-cell font-mono text-xs text-slate-300">
                                            {fmtTime(log.clock_in)}
                                        </td>
                                        <td className="table-cell font-mono text-xs text-slate-300">
                                            {log.clock_out ? fmtTime(log.clock_out) : (
                                                <span className="flex items-center gap-1.5 text-emerald-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    Ongoing
                                                </span>
                                            )}
                                        </td>
                                        <td className="table-cell">
                                            {log.total_hours ? (
                                                <span className="font-semibold text-indigo-400">{log.total_hours}h</span>
                                            ) : (
                                                <span className="text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="table-cell">
                                            <StatusBadge status={log.status} />
                                        </td>
                                        <td className="table-cell">
                                            <div className="flex items-center gap-1.5">
                                                {log.clock_in_photo && (
                                                    <button 
                                                        onClick={() => setPreviewPhoto({ url: log.clock_in_photo, title: 'Clock In Photo', date: log.clock_in })}
                                                        className="w-7 h-7 rounded border border-slate-700 overflow-hidden hover:border-emerald-500 transition"
                                                    >
                                                        <img src={log.clock_in_photo} alt="In" className="w-full h-full object-cover" />
                                                    </button>
                                                )}
                                                {log.clock_out_photo && (
                                                    <button 
                                                        onClick={() => setPreviewPhoto({ url: log.clock_out_photo, title: 'Clock Out Photo', date: log.clock_out })}
                                                        className="w-7 h-7 rounded border border-slate-700 overflow-hidden hover:border-rose-500 transition"
                                                    >
                                                        <img src={log.clock_out_photo} alt="Out" className="w-full h-full object-cover" />
                                                    </button>
                                                )}
                                                {!log.clock_in_photo && !log.clock_out_photo && (
                                                    <span className="text-[10px] text-slate-600 italic">No photo</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="table-cell pr-5 text-slate-500 text-xs max-w-[160px] truncate">
                                            {log.remarks || <span className="text-slate-700">—</span>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table footer */}
                {!loading && filteredLogs.length > 0 && (
                    <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <span>{filteredLogs.length} record{filteredLogs.length > 1 ? 's' : ''}</span>
                        <span className="text-indigo-400 font-semibold">
                            {filteredLogs.reduce((s, l) => s + (l.total_hours || 0), 0).toFixed(1)}h total shown
                        </span>
                    </div>
                )}
            </div>
            {/* ── Photo Verification Modal ─────────────────────────────────────── */}
            {showCamera && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white">Identity Verification</h3>
                                <p className="text-xs text-slate-500">Please show your face clearly to clock {cameraMode}</p>
                            </div>
                            <button 
                                onClick={() => setShowCamera(false)}
                                className="text-slate-500 hover:text-white transition"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="relative aspect-video bg-black">
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{
                                    facingMode: "user",
                                    width: 1280,
                                    height: 720
                                }}
                                className="w-full h-full object-cover"
                            />
                            {/* Overlay frame */}
                            <div className="absolute inset-0 border-2 border-dashed border-emerald-500/30 m-8 rounded-xl pointer-events-none" />
                        </div>

                        <div className="p-6 bg-slate-900/50 flex flex-col gap-4">
                            <button
                                onClick={captureAndSubmit}
                                disabled={clockBusy}
                                className="btn btn-primary w-full py-4 rounded-xl text-base font-bold shadow-xl shadow-emerald-900/20"
                            >
                                {clockBusy ? (
                                    <><span className="spinner" /> Uploading...</>
                                ) : (
                                    <>📸 Capture & Clock {cameraMode === 'in' ? 'In' : 'Out'}</>
                                )}
                            </button>
                            <p className="text-[10px] text-center text-slate-500 italic">
                                Your photo will be stored for attendance verification purposes.
                            </p>
                        </div>
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
                                <p className="text-xs text-slate-500">{fmtDate(previewPhoto.date)} at {fmtTime(previewPhoto.date)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Inline Icons ──────────────────────────────────────────────────────────────
function PlayIcon() { return <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg> }
function StopIcon() { return <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg> }
function PencilIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> }
function ChevronIcon({ open }) {
    return (
        <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    )
}
