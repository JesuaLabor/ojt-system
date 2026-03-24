import { useEffect, useState, useCallback, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
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

    // ── Clock In ────────────────────────────────────────────────────────────────
    const handleClockIn = async () => {
        setClockBusy(true)
        try {
            await api.post('/timelogs/clockin')
            toast.success('Clocked in successfully! Have a productive session 🚀')
            await fetchLogs()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Clock-in failed. Please try again.')
        } finally {
            setClockBusy(false)
        }
    }

    // ── Clock Out ───────────────────────────────────────────────────────────────
    const handleClockOut = async () => {
        setClockBusy(true)
        try {
            const res = await api.patch('/timelogs/clockout')
            const hours = res.data?.log?.total_hours ?? res.data?.total_hours
            toast.success(`Session ended! ${hours ? `${hours}h logged` : 'Log saved'} ✅`)
            setActiveLog(null)
            setElapsed(0)
            await fetchLogs()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Clock-out failed. Please try again.')
        } finally {
            setClockBusy(false)
        }
    }

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
                            onClick={handleClockOut}
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
                            onClick={handleClockIn}
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
                                {['Date', 'Clock In', 'Clock Out', 'Total Hours', 'Status', 'Remarks'].map(h => (
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
