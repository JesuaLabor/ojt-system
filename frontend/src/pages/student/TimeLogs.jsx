import { useEffect, useState, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Webcam from 'react-webcam'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

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

function StatusBadge({ status }) {
    const map = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' }
    return <span className={`badge ${map[status] || 'badge-active'}`}>{status}</span>
}

function TableSkeleton() {
    return (
        <>
            {[1, 2, 3, 4].map(i => (
                <tr key={i} className="border-b border-slate-800 animate-pulse">
                    {[1, 2, 3, 4, 5].map(j => (
                        <td key={j} className="px-4 py-3.5"><div className="skeleton h-3.5 rounded w-full" /></td>
                    ))}
                </tr>
            ))}
        </>
    )
}

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
            toast.success('Clocked in successfully! 🚀')
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
        <div className="fade-in space-y-6 max-w-6xl">
            <div className="page-header">
                <h1 className="page-title">Time Logs</h1>
                <p className="page-sub">Track your daily OJT hours.</p>
            </div>

            <div className="card text-center py-10 relative overflow-hidden">
                <div className="flex justify-center mb-5">
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${activeLog ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${activeLog ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        {activeLog ? 'Active Session' : 'Not Clocked In'}
                    </div>
                </div>

                <div className="mb-2">
                    <p className="font-mono text-6xl font-bold tracking-tight text-white">{formatElapsed(elapsed)}</p>
                </div>

                <div className="flex justify-center px-4 sm:px-0 mt-6">
                    {activeLog ? (
                        <button onClick={() => { setCameraMode('out'); setShowCamera(true); }} disabled={clockBusy} className="btn btn-primary bg-red-600 hover:bg-red-500">Clock Out</button>
                    ) : (
                        <button onClick={() => { setCameraMode('in'); setShowCamera(true); }} disabled={clockBusy} className="btn btn-primary bg-emerald-600 hover:bg-emerald-500">Clock In</button>
                    )}
                </div>
            </div>

            <div className="card !p-0 overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex gap-2">
                        <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 rounded-full text-xs ${statusFilter === 'all' ? 'bg-indigo-600' : ''}`}>All</button>
                        <button onClick={() => setStatusFilter('pending')} className={`px-3 py-1 rounded-full text-xs ${statusFilter === 'pending' ? 'bg-amber-600' : ''}`}>Pending</button>
                    </div>
                </div>
                <div className="table-wrap border-0 rounded-none">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Date</th>
                                <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Hours</th>
                                <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <TableSkeleton /> : filteredLogs.map(log => (
                                <tr key={log.id} className="border-b border-slate-800/50">
                                    <td className="px-5 py-4 text-sm font-medium text-white">{fmtDate(log.clock_in)}</td>
                                    <td className="px-5 py-4 text-sm text-slate-300">{log.total_hours?.toFixed(1)}h</td>
                                    <td className="px-5 py-4"><StatusBadge status={log.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showCamera && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                        <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="rounded-xl mb-4" />
                        <button onClick={captureAndSubmit} disabled={clockBusy} className="btn btn-primary w-full">Capture Photo</button>
                        <button onClick={() => setShowCamera(false)} className="btn btn-ghost w-full mt-2">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    )
}
