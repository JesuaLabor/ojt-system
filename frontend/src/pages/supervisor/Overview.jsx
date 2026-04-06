import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import Avatar from '../../components/ui/Avatar'

// ── Helpers ───────────────────────────────────────────────────────────────────
const round2 = (n) => Math.round(n * 100) / 100
const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
}

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

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="card animate-pulse">
            <div className="flex items-center gap-3 mb-4">
                <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-28 rounded" />
                    <div className="skeleton h-3 w-20 rounded" />
                </div>
            </div>
            <div className="skeleton h-3 w-full rounded mb-3" />
            <div className="skeleton h-8 w-full rounded" />
        </div>
    )
}

function SkeletonStat() {
    return (
        <div className="stat-card animate-pulse">
            <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="skeleton h-6 w-16 rounded" />
                <div className="skeleton h-3 w-28 rounded" />
            </div>
        </div>
    )
}

// ── Student Card ──────────────────────────────────────────────────────────────
function StudentCard({ student, onViewLogs, onEvaluate }) {
    const progressColor = student.progress_pct >= 80
        ? 'from-emerald-500 to-teal-400'
        : student.progress_pct >= 40
            ? 'from-teal-500 to-cyan-400'
            : 'from-amber-500 to-orange-400'

    return (
        <div className="card group hover:border-teal-700/50 transition-all duration-300">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Avatar
                        photo={student.profile_photo}
                        name={student.student_name}
                        size="w-11 h-11"
                        gradient="from-teal-500 to-cyan-600"
                        className="border border-slate-700/50 shadow-lg group-hover:shadow-teal-800/50 transition-shadow"
                    />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{student.student_name}</p>
                        <p className="text-xs text-slate-500 truncate">{student.company_name}</p>
                    </div>
                </div>
                <StatusBadge status={student.status} />
            </div>

            {/* Progress */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-slate-400">Hours Progress</p>
                    <p className="text-xs font-semibold text-white">
                        <span className="text-teal-400">{student.completed_hours}h</span>
                        <span className="text-slate-600"> / </span>
                        {student.required_hours}h
                    </p>
                </div>
                <div className="relative h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    {student.pending_hours > 0 && (
                        <div
                            className="absolute top-0 left-0 h-full rounded-full bg-amber-500/25"
                            style={{ width: `${Math.min(100, ((student.completed_hours + student.pending_hours) / student.required_hours) * 100)}%` }}
                        />
                    )}
                    <div
                        className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-1000`}
                        style={{ width: `${student.progress_pct}%` }}
                    />
                </div>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-slate-600">{student.progress_pct}%</p>
                    {student.pending_hours > 0 && (
                        <p className="text-[10px] text-amber-400">{student.pending_hours}h pending</p>
                    )}
                </div>
            </div>

            {/* Pending Approvals */}
            {student.pending_logs > 0 && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="text-amber-400 text-xs">⏳</span>
                    <p className="text-xs text-amber-400 font-medium">
                        {student.pending_logs} pending approval{student.pending_logs > 1 ? 's' : ''}
                    </p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                    onClick={() => onViewLogs(student.student_id)}
                    className="btn btn-ghost btn-sm flex-1 justify-center"
                >
                    <IconClock className="w-3.5 h-3.5" />
                    View Logs
                </button>
                <button
                    onClick={() => onEvaluate(student.student_id)}
                    className="btn btn-sm flex-1 justify-center bg-teal-600/20 text-teal-400 border border-teal-500/30 hover:bg-teal-600/30"
                >
                    <IconStar className="w-3.5 h-3.5" />
                    Evaluate
                </button>
            </div>
        </div>
    )
}

// ── Notification Item ─────────────────────────────────────────────────────────
function NotificationItem({ notification }) {
    return (
        <div className={`flex items-start gap-3 p-3 rounded-xl transition-colors
            ${notification.is_read
                ? 'bg-slate-800/30 border border-slate-800/50'
                : 'bg-teal-500/5 border border-teal-500/20'}`}>
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notification.is_read ? 'bg-slate-600' : 'bg-teal-400'}`} />
            <div className="flex-1 min-w-0">
                <p className="text-xs text-white leading-relaxed">{notification.message}</p>
                <p className="text-[10px] text-slate-500 mt-1">{timeAgo(notification.CreatedAt)}</p>
            </div>
        </div>
    )
}

// ── Activity Item ─────────────────────────────────────────────────────────────
function ActivityItem({ activity }) {
    const statusColor = {
        pending: 'bg-amber-400',
        approved: 'bg-emerald-400',
        rejected: 'bg-red-400',
    }
    return (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/50 transition-colors">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusColor[activity.status] || 'bg-slate-500'}`} />
            <div className="flex-1 min-w-0">
                <p className="text-xs text-white">{activity.message}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{timeAgo(activity.timestamp)}</p>
            </div>
            <span className={`badge ${activity.status === 'approved' ? 'badge-approved' : activity.status === 'rejected' ? 'badge-rejected' : 'badge-pending'}`}>
                {activity.status}
            </span>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Overview() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [students, setStudents] = useState([])
    const [activities, setActivities] = useState([])
    const [notifications, setNotifications] = useState([])
    const [stats, setStats] = useState({ total: 0, pending: 0, unread: 0 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [studentsRes, activityRes, notifRes] = await Promise.all([
                    api.get('/supervisor/students'),
                    api.get('/supervisor/activity'),
                    api.get('/supervisor/notifications'),
                ])

                setStudents(studentsRes.data?.students || [])
                setActivities(activityRes.data?.activities || [])
                setNotifications(notifRes.data?.notifications || [])
                setStats({
                    total: studentsRes.data?.total_students || 0,
                    pending: studentsRes.data?.total_pending_approvals || 0,
                    unread: notifRes.data?.unread_count || 0,
                })
            } catch (err) {
                console.error(err)
                setError('Failed to load dashboard data.')
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [])

    // Derived stats
    const completedStudents = students.filter(s => s.status === 'Completed').length
    const avgProgress = students.length > 0
        ? round2(students.reduce((sum, s) => sum + s.progress_pct, 0) / students.length)
        : 0

    const handleViewLogs = (studentId) => navigate(`/supervisor/timelogs?student=${studentId}`)
    const handleEvaluate = (studentId) => navigate(`/supervisor/evaluations?student=${studentId}`)

    const greeting = () => {
        const h = new Date().getHours()
        if (h < 12) return '🌅 Good morning'
        if (h < 17) return '☀️ Good afternoon'
        return '🌙 Good evening'
    }

    const statCards = [
        {
            label: 'Total Students', value: stats.total, sub: 'Under your supervision',
            icon: '👥', color: 'bg-teal-500/15 text-teal-400',
        },
        {
            label: 'Pending Approvals', value: stats.pending, sub: 'Time logs awaiting review',
            icon: '⏳', color: 'bg-amber-500/15 text-amber-400',
        },
        {
            label: 'Completed', value: completedStudents, sub: 'Students who finished OJT',
            icon: '✅', color: 'bg-emerald-500/15 text-emerald-400',
        },
        {
            label: 'Avg. Progress', value: `${avgProgress}%`, sub: 'Across all students',
            icon: '📊', color: 'bg-cyan-500/15 text-cyan-400',
        },
    ]

    return (
        <div className="fade-in space-y-6 max-w-7xl">
            {/* ── Page Header ──────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="page-title">
                        {greeting()}, <span className="text-teal-400">{user?.name?.split(' ')[0]}</span>!
                    </h1>
                    <p className="page-sub mt-1">Manage your assigned students and track their progress.</p>
                </div>
                {stats.pending > 0 && (
                    <button
                        onClick={() => navigate('/supervisor/timelogs')}
                        className="btn btn-sm bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-600/20"
                    >
                        ⏳ {stats.pending} Pending
                    </button>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-3 bg-red-900/30 border border-red-800 rounded-xl p-4 text-sm text-red-400">
                    <span>⚠️</span> {error}
                </div>
            )}

            {/* ── Stat Cards ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {loading ? (
                    <>{[1,2,3,4].map(i => <SkeletonStat key={i} />)}</>
                ) : (
                    statCards.map(s => (
                        <div key={s.label} className="stat-card group">
                            <div className={`stat-icon ${s.color} transition-transform group-hover:scale-110`}>
                                {s.icon}
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{s.value}</p>
                                <p className="text-xs font-semibold text-white/80 mt-0.5">{s.label}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{s.sub}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ── Student Cards Grid ──────────────────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-sm font-semibold text-white">My Students</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Overview of all assigned students</p>
                    </div>
                    {students.length > 0 && (
                        <span className="badge bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/30">
                            {students.length} student{students.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1,2,3].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : students.length === 0 ? (
                    <div className="card text-center py-12">
                        <p className="text-3xl mb-3">👥</p>
                        <p className="text-sm font-medium text-slate-400">No students assigned yet</p>
                        <p className="text-xs text-slate-600 mt-1">Students will appear here once a coordinator assigns them to you.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {students.map(s => (
                            <StudentCard
                                key={s.student_id}
                                student={s}
                                onViewLogs={handleViewLogs}
                                onEvaluate={handleEvaluate}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Bottom Row: Activity Feed + Notifications ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Activity Feed (3/5) */}
                <div className="card lg:col-span-3 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-white">Recent Student Activity</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Latest actions from your students</p>
                        </div>
                        {activities.length > 0 && (
                            <span className="badge bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/30">
                                {activities.length} recent
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[1,2,3].map(i => (
                                <div key={i} className="flex items-start gap-3 animate-pulse">
                                    <div className="skeleton w-2 h-2 rounded-full mt-1.5 flex-shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="skeleton h-3 w-48 rounded" />
                                        <div className="skeleton h-3 w-20 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-8">
                            <p className="text-3xl mb-2">📋</p>
                            <p className="text-sm font-medium">No recent activity</p>
                            <p className="text-xs mt-1 text-center">Student activity will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 flex-1">
                            {activities.slice(0, 5).map((a, i) => (
                                <ActivityItem key={i} activity={a} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Notifications (2/5) */}
                <div className="card lg:col-span-2 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-white">Notifications</h2>
                            {stats.unread > 0 && (
                                <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center">
                                    {stats.unread}
                                </span>
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <button
                                onClick={async () => {
                                    try {
                                        await api.patch('/supervisor/notifications/read-all')
                                        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
                                        setStats(prev => ({ ...prev, unread: 0 }))
                                    } catch (e) { console.error(e) }
                                }}
                                className="text-[10px] text-teal-400 hover:text-teal-300 font-medium transition-colors"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[1,2,3].map(i => (
                                <div key={i} className="flex items-start gap-3 animate-pulse">
                                    <div className="skeleton w-2 h-2 rounded-full mt-1.5 flex-shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="skeleton h-3 w-40 rounded" />
                                        <div className="skeleton h-3 w-16 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-8">
                            <p className="text-3xl mb-2">🔔</p>
                            <p className="text-sm font-medium">No notifications</p>
                            <p className="text-xs mt-1 text-center">You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="space-y-2 flex-1 max-h-80 overflow-y-auto">
                            {notifications.slice(0, 8).map((n, i) => (
                                <NotificationItem key={n.ID || i} notification={n} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Inline SVG Icons ──────────────────────────────────────────────────────────
function IconClock({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
function IconStar({ className }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
}
