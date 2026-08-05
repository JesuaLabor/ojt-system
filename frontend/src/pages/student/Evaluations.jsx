import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import api from '../../services/api'

// ── Job Factor Definitions (for display) ──────────────────────────────────────
const JOB_FACTORS = [
    { key: 'quality_work_accuracy',    label: 'Quality of Work (Accuracy & Neatness)',      max: 20 },
    { key: 'quality_work_timeliness',  label: 'Quality of Work (Completion in Allotted Time)', max: 20 },
    { key: 'dependability',            label: 'Dependability, Reliability & Resourcefulness', max: 10 },
    { key: 'attendance',               label: 'Attendance & Punctuality',                    max: 10 },
    { key: 'cooperation',              label: 'Cooperation',                                  max: 10 },
    { key: 'company_rules_observance', label: 'Observance of Company Rules & Regulations',   max: 10 },
    { key: 'personality',              label: 'Personality',                                  max: 5  },
    { key: 'safety_housekeeping',      label: 'Safety and Housekeeping',                     max: 10 },
    { key: 'tools_equipment',          label: 'Proper Use of Tools / Equipment',             max: 5  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGradeInfo(score) {
    if (score >= 90) return { label: 'Outstanding',         color: 'text-emerald-400', ring: 'border-emerald-500/30 bg-emerald-500/10' }
    if (score >= 80) return { label: 'Very Satisfactory',   color: 'text-teal-400',    ring: 'border-teal-500/30 bg-teal-500/10' }
    if (score >= 70) return { label: 'Satisfactory',        color: 'text-cyan-400',    ring: 'border-cyan-500/30 bg-cyan-500/10' }
    if (score >= 60) return { label: 'Fairly Satisfactory', color: 'text-amber-400',   ring: 'border-amber-500/30 bg-amber-500/10' }
    return                   { label: 'Needs Improvement',  color: 'text-red-400',     ring: 'border-red-500/30 bg-red-500/10' }
}

function progressBarColor(pct) {
    if (pct >= 90) return 'bg-emerald-500'
    if (pct >= 70) return 'bg-teal-500'
    if (pct >= 50) return 'bg-cyan-500'
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
                <div className="skeleton h-20 w-20 rounded-2xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                    <div key={i} className="space-y-2">
                        <div className="skeleton h-3 w-36 rounded" />
                        <div className="skeleton h-2 w-full rounded-full" />
                    </div>
                ))}
            </div>
            <div className="skeleton h-20 w-full rounded-xl" />
        </div>
    )
}

// ── Job Factor Score Bar ──────────────────────────────────────────────────────
function FactorScore({ label, score, max }) {
    const pct = Math.min(100, (score / max) * 100)
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-end text-[10px] sm:text-xs">
                <span className="font-semibold text-slate-400 leading-tight">{label}</span>
                <span className="font-bold text-slate-200 shrink-0 ml-2">
                    {score} <span className="text-slate-600 font-normal">/ {max}</span>
                </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ${progressBarColor(pct)}`}
                    style={{ width: `${pct}%` }}
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
                <p className="page-sub">Review your OJT performance ratings and recommendations from your site supervisor.</p>
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
                // ── Empty State ──────────────────────────────────────────────────
                <div className="card text-center py-20 flex flex-col items-center border-dashed border-2 border-slate-800 bg-transparent">
                    <div className="w-24 h-24 mb-6 rounded-full bg-slate-900/50 flex items-center justify-center text-5xl">
                        📊
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">No Evaluations Yet</h2>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Your performance evaluations will appear here once your supervisor submits them after you complete your required OJT hours.
                    </p>
                </div>
            ) : (
                // ── Evaluations List ─────────────────────────────────────────────
                <div className="space-y-6">
                    {evaluations.map((ev) => {
                        const grade = getGradeInfo(ev.overall_score)
                        return (
                            <div key={ev.id} className="card relative group hover:border-slate-700 transition-colors">
                                {/* Header: Period, Supervisor, Total Score */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-6 border-b border-slate-800/50">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-xl font-bold text-white">🎓 OJT Completion Evaluation</h2>
                                            <span className="badge badge-approved text-[9px] uppercase tracking-widest font-black">Submitted</span>
                                        </div>
                                        <div className="space-y-1 text-sm text-slate-500">
                                            <p className="flex items-center gap-2">
                                                <span className="p-1 rounded-md bg-slate-800 text-slate-400"><UserIcon /></span>
                                                Evaluated by <span className="text-slate-300 font-semibold">{ev.supervisor_name}</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <span className="p-1 rounded-md bg-slate-800 text-slate-400"><CalendarIcon /></span>
                                                {ev.created_at ? format(new Date(ev.created_at), 'MMMM d, yyyy') : 'Date not available'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Total Score Badge */}
                                    <div className={`w-24 h-24 rounded-2xl border flex flex-col items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${grade.ring}`}>
                                        <span className={`text-3xl font-black ${grade.color}`}>{ev.overall_score}</span>
                                        <span className="text-[10px] font-bold uppercase opacity-60 mt-1">/ 100</span>
                                        <span className={`text-[9px] font-bold uppercase mt-0.5 ${grade.color}`}>{grade.label}</span>
                                    </div>
                                </div>

                                {/* Job Factors Grid */}
                                <div className="mb-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                        Job Factor Ratings
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5">
                                        {JOB_FACTORS.map(f => (
                                            <FactorScore
                                                key={f.key}
                                                label={f.label}
                                                score={ev[f.key] ?? 0}
                                                max={f.max}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Total row */}
                                <div className="flex items-center justify-between mt-5 mb-6 px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Rating</span>
                                    <span className={`text-sm font-black ${grade.color}`}>{ev.overall_score} / 100</span>
                                </div>

                                {/* Recommendation Section */}
                                <div className="bg-slate-900/40 border border-slate-700/30 rounded-2xl p-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        Recommendation For the Trainees Growth
                                    </h3>
                                    <div className="relative">
                                        <span className="absolute -left-2 -top-2 text-4xl text-slate-800 font-serif opacity-50">"</span>
                                        <p className="text-slate-300 text-sm leading-relaxed italic pl-4 pr-4">
                                            {ev.recommendation || 'No recommendation provided.'}
                                        </p>
                                        <span className="absolute -right-2 -bottom-2 text-4xl text-slate-800 font-serif opacity-50 rotate-180">"</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
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
