import { useEffect, useState } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { format, parseISO, startOfWeek, addDays } from 'date-fns'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

// ── Constants ─────────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── Helpers ───────────────────────────────────────────────────────────────────
const round2 = (n) => Math.round(n * 100) / 100

function getWeeklyData(logs) {
    // Build a map: day index (0=Mon … 6=Sun) → hours
    const now = new Date()
    const monday = startOfWeek(now, { weekStartsOn: 1 })

    return DAYS.map((day, idx) => {
        const target = addDays(monday, idx)
        const dateStr = format(target, 'yyyy-MM-dd')

        const hours = logs
            .filter((l) => {
                const d = l.clock_in ? l.clock_in.slice(0, 10) : ''
                return d === dateStr
            })
            .reduce((sum, l) => sum + (l.total_hours || 0), 0)

        return { day, hours: round2(hours), isToday: dateStr === format(now, 'yyyy-MM-dd') }
    })
}

function avgEvalScore(evaluations) {
    if (!evaluations?.length) return null
    const sum = evaluations.reduce((s, e) => s + (e.overall_score || 0), 0)
    return round2(sum / evaluations.length)
}

function gradeLabel(score) {
    if (score === null) return '—'
    if (score >= 90) return 'Outstanding'
    if (score >= 80) return 'Very Satisfactory'
    if (score >= 70) return 'Satisfactory'
    if (score >= 60) return 'Fairly Satisfactory'
    return 'Needs Improvement'
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="stat-card animate-pulse">
            <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="skeleton h-6 w-20 rounded" />
                <div className="skeleton h-3 w-28 rounded" />
                <div className="skeleton h-3 w-16 rounded" />
            </div>
        </div>
    )
}

function SkeletonBlock({ h = 'h-48' }) {
    return <div className={`skeleton ${h} w-full rounded-2xl animate-pulse`} />
}

// ── Custom Recharts Tooltip ────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm shadow-xl">
            <p className="text-slate-400 font-medium">{label}</p>
            <p className="text-cyan-400 font-bold mt-0.5">{payload[0].value}h</p>
        </div>
    )
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

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, sub, accent, trend }) {
    return (
        <div className="stat-card group">
            <div className={`stat-icon ${accent} text-xl transition-transform group-hover:scale-110`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-white leading-none">{value}</p>
                <p className="text-xs font-semibold text-slate-300 mt-1">{label}</p>
                {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
                {trend && <p className="text-[11px] text-emerald-400 mt-0.5">{trend}</p>}
            </div>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Overview() {
    const { user } = useAuthStore()
    const [logs, setLogs] = useState([])
    const [evals, setEvals] = useState([])
    const [requiredHours, setRequiredHours] = useState(600)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [logsRes, evalsRes] = await Promise.all([
                    api.get('/timelogs/'),
                    api.get('/evaluations/me'),
                ])
                setLogs(logsRes.data?.logs || [])
                setRequiredHours(logsRes.data?.required_hours || 600)
                setEvals(evalsRes.data?.evaluations || [])
            } catch (err) {
                setError('Failed to load dashboard data.')
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [])

    // ── Derived stats ───────────────────────────────────────────────────────────
    const approvedHours = round2(logs.filter(l => l.status === 'approved').reduce((s, l) => s + l.total_hours, 0))
    const pendingHours = round2(logs.filter(l => l.status === 'pending').reduce((s, l) => s + l.total_hours, 0))
    const totalLogged = round2(approvedHours + pendingHours)
    const remainingHours = Math.max(0, round2(requiredHours - approvedHours))
    const progressPct = Math.min(100, round2((approvedHours / requiredHours) * 100))
    const daysRemaining = Math.ceil(remainingHours / 8)
    const avgScore = avgEvalScore(evals)
    const weeklyData = getWeeklyData(logs)
    const recentLogs = [...logs].sort((a, b) => new Date(b.clock_in) - new Date(a.clock_in)).slice(0, 3)
    const maxWeekHours = Math.max(...weeklyData.map(d => d.hours), 1)

    // Progress bar color
    const progressColor = progressPct >= 80 ? 'from-emerald-500 to-green-400'
        : progressPct >= 40 ? 'from-indigo-600 to-violet-500'
            : 'from-amber-500 to-orange-400'

    const greeting = () => {
        const h = new Date().getHours()
        if (h < 12) return '🌅 Good morning'
        if (h < 17) return '☀️ Good afternoon'
        return '🌙 Good evening'
    }

    return (
        <div className="fade-in space-y-6 max-w-7xl">
            {/* ── Page Header ──────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="page-title">
                        {greeting()}, <span className="text-indigo-400">{user?.name?.split(' ')[0]}</span>!
                    </h1>
                    <p className="page-sub mt-1">Here's your OJT progress at a glance.</p>
                </div>
                <div className="hidden sm:flex flex-col items-end text-right">
                    <p className="text-xs text-slate-500">
                        {format(new Date(), 'EEEE, MMMM d, yyyy')}
                    </p>
                    <span className={`badge mt-1 ${progressPct >= 100 ? 'badge-approved' : 'badge-active'}`}>
                        {progressPct >= 100 ? '✅ OJT Complete' : `${progressPct}% complete`}
                    </span>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 bg-red-900/30 border border-red-800 rounded-xl p-4 text-sm text-red-400">
                    <span>⚠️</span> {error}
                </div>
            )}

            {/* ── Stat Cards ────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {loading ? (
                    <>
                        <SkeletonCard /><SkeletonCard /><SkeletonCard />
                    </>
                ) : (
                    <>
                        <StatCard
                            icon="⏱️"
                            value={`${approvedHours}h`}
                            label="Hours Logged"
                            sub={`${pendingHours}h pending approval`}
                            accent="bg-indigo-500/15 text-indigo-400"
                            trend={totalLogged > 0 ? `↑ ${totalLogged}h total logged` : null}
                        />
                        <StatCard
                            icon="📅"
                            value={progressPct >= 100 ? 'Done!' : `${daysRemaining}d`}
                            label="Est. Days Remaining"
                            sub={`${remainingHours}h left of ${requiredHours}h`}
                            accent="bg-cyan-500/15 text-cyan-400"
                        />
                        <StatCard
                            icon="⭐"
                            value={avgScore !== null ? avgScore.toFixed(1) : '—'}
                            label="Avg. Evaluation Score"
                            sub={avgScore !== null ? gradeLabel(avgScore) : `${evals.length === 0 ? 'No evaluations yet' : ''}`}
                            accent="bg-purple-500/15 text-purple-400"
                        />
                    </>
                )}
            </div>

            {/* ── Progress Bar ──────────────────────────────────────────────────── */}
            {loading ? <SkeletonBlock h="h-32" /> : (
                <div className="card">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-white">OJT Completion</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                <span className="text-indigo-400 font-semibold">{approvedHours}h</span> approved
                                {pendingHours > 0 && <> · <span className="text-amber-400 font-semibold">{pendingHours}h</span> pending</>}
                                {' '}· <span className="text-slate-400">{requiredHours}h required</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-white">{progressPct}%</p>
                            <p className="text-xs text-slate-500">{remainingHours}h remaining</p>
                        </div>
                    </div>

                    {/* Full track */}
                    <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden">
                        {/* Pending overlay (lighter shade) */}
                        {pendingHours > 0 && (
                            <div
                                className="absolute top-0 left-0 h-full rounded-full bg-amber-500/30"
                                style={{ width: `${Math.min(100, round2(((approvedHours + pendingHours) / requiredHours) * 100))}%` }}
                            />
                        )}
                        {/* Approved fill */}
                        <div
                            className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-1000`}
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>

                    {/* Milestone markers */}
                    <div className="flex justify-between mt-2 text-[10px] text-slate-600">
                        {[0, 25, 50, 75, 100].map(pct => (
                            <span key={pct} className={progressPct >= pct ? 'text-slate-400' : ''}>{pct}%</span>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Bottom Grid: Chart + Activity ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Weekly Bar Chart (3/5 width) */}
                <div className="card lg:col-span-3">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-sm font-semibold text-white">Weekly Hours</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Hours logged this week</p>
                        </div>
                        <span className="badge badge-active">
                            {round2(weeklyData.reduce((s, d) => s + d.hours, 0))}h this week
                        </span>
                    </div>

                    {loading ? <SkeletonBlock h="h-52" /> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={weeklyData} barSize={28} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.08)" vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    axisLine={false} tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    axisLine={false} tickLine={false}
                                    tickFormatter={v => `${v}h`}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                                <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                                    {weeklyData.map((entry, i) => (
                                        <Cell
                                            key={i}
                                            fill={entry.isToday
                                                ? '#6366f1'
                                                : entry.hours >= maxWeekHours * 0.75
                                                    ? '#818cf8'
                                                    : '#1e293b'}
                                            stroke={entry.isToday ? '#4f46e5' : 'transparent'}
                                            strokeWidth={1}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                            <span className="text-[10px] text-slate-500">Today</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-sm bg-slate-800" />
                            <span className="text-[10px] text-slate-500">Other days</span>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Feed (2/5 width) */}
                <div className="card lg:col-span-2 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Last 3 time log entries</p>
                        </div>
                        <span className="badge badge-active">{logs.length} total</span>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-start gap-3 animate-pulse">
                                    <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="skeleton h-3 w-28 rounded" />
                                        <div className="skeleton h-3 w-16 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : recentLogs.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-8">
                            <p className="text-3xl mb-2">⏱️</p>
                            <p className="text-sm font-medium">No time logs yet</p>
                            <p className="text-xs mt-1 text-center">
                                Clock in to start tracking your OJT hours.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3 flex-1">
                            {recentLogs.map((log, i) => {
                                const clockIn = log.clock_in ? new Date(log.clock_in) : null
                                const clockOut = log.clock_out ? new Date(log.clock_out) : null
                                return (
                                    <div key={log.ID || i}
                                        className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50
                               border border-slate-700/50 hover:border-slate-600 transition-colors">
                                        {/* Timeline dot */}
                                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${log.status === 'approved' ? 'bg-emerald-400' :
                                                log.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'
                                            }`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-semibold text-white">
                                                    {clockIn ? format(clockIn, 'MMM d, yyyy') : '—'}
                                                </p>
                                                <StatusBadge status={log.status} />
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {clockIn ? format(clockIn, 'h:mm a') : '—'}
                                                {' → '}
                                                {clockOut ? format(clockOut, 'h:mm a') : 'ongoing'}
                                            </p>
                                            <div className="flex items-center justify-between mt-1">
                                                <p className="text-xs font-bold text-indigo-400">
                                                    {log.total_hours ? `${log.total_hours}h` : 'In progress'}
                                                </p>
                                                {log.remarks && (
                                                    <p className="text-[10px] text-slate-600 truncate max-w-[100px]" title={log.remarks}>
                                                        📝 {log.remarks}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {logs.length > 3 && (
                        <div className="pt-3 mt-3 border-t border-slate-800">
                            <a href="/student/timelogs"
                                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                                View all {logs.length} entries →
                            </a>
                        </div>
                    )}
                </div>

            </div>

            {/* ── Evaluation Scores Mini-Summary ────────────────────────────────── */}
            {!loading && evals.length > 0 && (
                <div className="card fade-in">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-white">Evaluation Scores</h2>
                            <p className="text-xs text-slate-500 mt-0.5">{evals.length} evaluation{evals.length > 1 ? 's' : ''} received</p>
                        </div>
                        <span className={`badge ${avgScore >= 90 ? 'badge-approved' :
                                avgScore >= 70 ? 'badge-active' : 'badge-warning'
                            }`}>
                            {avgScore?.toFixed(1)} avg
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {evals.slice(0, 3).map((ev, i) => (
                            <div key={i}
                                className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold text-white">{ev.period}</p>
                                    <span className="text-lg font-bold text-purple-400">{ev.overall_score}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mb-2">{ev.supervisor_name}</p>
                                {/* Mini score bars */}
                                {[
                                    { label: 'Technical', val: ev.technical_score },
                                    { label: 'Communication', val: ev.communication_score },
                                    { label: 'Punctuality', val: ev.punctuality_score },
                                ].map(({ label, val }) => (
                                    <div key={label} className="flex items-center gap-2 mb-1 last:mb-0">
                                        <span className="text-[10px] text-slate-600 w-20 flex-shrink-0">{label}</span>
                                        <div className="flex-1 progress-track">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${val}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-400 w-8 text-right">{val}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
