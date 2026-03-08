import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import api from '../../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColorClass(score) {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    if (score >= 80) return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10'
    return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
}

function progressColorClass(score) {
    if (score >= 90) return 'bg-emerald-500'
    if (score >= 80) return 'bg-indigo-500'
    return 'bg-amber-500'
}

// ── Skeleton Loader ───────────────────────────────────────────────────────────
function SkeletonEval() {
    return (
        <div className="card animate-pulse border-slate-800/50">
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                <div className="space-y-2">
                    <div className="skeleton h-6 w-32 rounded" />
                    <div className="skeleton h-4 w-48 rounded" />
                </div>
                <div className="skeleton h-16 w-16 rounded-2xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-6">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="space-y-2">
                        <div className="skeleton h-3 w-20 rounded" />
                        <div className="skeleton h-2 w-full rounded-full" />
                    </div>
                ))}
            </div>
            <div className="skeleton h-20 w-full rounded-xl" />
        </div>
    )
}

// ── Criteria Progress Bar ──────────────────────────────────────────────────────
function CriteriaScore({ label, score }) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] sm:text-xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                <span className="font-bold text-slate-200">{score}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ${progressColorClass(score)}`}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function StudentEvaluations() {
    const [evaluations, setEvaluations] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchEvals = async () => {
            try {
                const res = await api.get('/evaluations/me')
                setEvaluations(res.data?.evaluations || [])
            } catch (err) {
                console.error('Failed to fetch evaluations:', err)
                setError('Could not load evaluations. Please try again later.')
            } finally {
                setLoading(false)
            }
        }
        fetchEvals()
    }, [])

    return (
        <div className="fade-in space-y-6 max-w-5xl">
            {/* ── Page Header ──────────────────────────────────────────────────── */}
            <div className="page-header">
                <h1 className="page-title">My Evaluations</h1>
                <p className="page-sub">Review performance ratings and feedback from your site supervisor.</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
                    ⚠️ {error}
                </div>
            )}

            {loading ? (
                <div className="space-y-6">
                    <SkeletonEval />
                    <SkeletonEval />
                </div>
            ) : evaluations.length === 0 ? (
                // ── Empty State ─────────────────────────────────────────────────
                <div className="card text-center py-20 flex flex-col items-center border-dashed border-2 border-slate-800 bg-transparent">
                    <div className="w-24 h-24 mb-6 rounded-full bg-slate-900/50 flex items-center justify-center text-5xl">
                        📊
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">No Evaluations Yet</h2>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Your performance evaluations will appear here once your supervisor completes them for specific periods (Midterm, Final).
                    </p>
                </div>
            ) : (
                // ── Evaluations List ────────────────────────────────────────────
                <div className="space-y-6">
                    {evaluations.map((ev) => (
                        <div key={ev.ID} className="card relative group hover:border-slate-700 transition-colors">
                            {/* Header: Period, Supervisor, and Large Overall Score */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-6 border-b border-slate-800/50">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-xl font-bold text-white">{ev.period}</h2>
                                        <span className="badge badge-approved text-[9px] uppercase tracking-widest font-black">Submitted</span>
                                    </div>
                                    <div className="space-y-1 text-sm text-slate-500">
                                        <p className="flex items-center gap-2">
                                            <span className="p-1 rounded-md bg-slate-800 text-slate-400">
                                                <UserIcon />
                                            </span>
                                            Evaluated by <span className="text-slate-300 font-semibold">{ev.supervisor_name}</span>
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <span className="p-1 rounded-md bg-slate-800 text-slate-400">
                                                <CalendarIcon />
                                            </span>
                                            {ev.created_at ? format(new Date(ev.created_at), 'MMMM d, yyyy') : 'Date not available'}
                                        </p>
                                    </div>
                                </div>

                                {/* Overall Score Circle/Square */}
                                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border flex flex-col items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${scoreColorClass(ev.overall_score)}`}>
                                    <span className="text-3xl sm:text-4xl font-black">{ev.overall_score}</span>
                                    <span className="text-[10px] sm:text-xs font-bold uppercase opacity-60 mt-1">Overall</span>
                                </div>
                            </div>

                            {/* Individual Criteria Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 mb-8">
                                <CriteriaScore label="Technical Skills" score={ev.technical_score} />
                                <CriteriaScore label="Communication" score={ev.communication_score} />
                                <CriteriaScore label="Punctuality" score={ev.punctuality_score} />
                                <CriteriaScore label="Teamwork" score={ev.teamwork_score || 0} />
                                <CriteriaScore label="Initiative" score={ev.initiative_score || 0} />
                            </div>

                            {/* Feedback Section */}
                            <div className="bg-slate-900/40 border border-slate-700/30 rounded-2xl p-6">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    Supervisor Feedback
                                </h3>
                                <div className="relative">
                                    <span className="absolute -left-2 -top-2 text-4xl text-slate-800 font-serif opacity-50">“</span>
                                    <p className="text-slate-300 text-sm leading-relaxed italic pl-4 pr-4">
                                        {ev.remarks || "No additional feedback provided."}
                                    </p>
                                    <span className="absolute -right-2 -bottom-2 text-4xl text-slate-800 font-serif opacity-50 rotate-180">“</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Inline Icons ──────────────────────────────────────────────────────────────
function UserIcon() {
    return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
}

function CalendarIcon() {
    return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
}
