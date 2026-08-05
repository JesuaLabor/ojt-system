import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'

// ── Job Factor Definitions (for display) ──────────────────────────────────────
const JOB_FACTORS = [
    { key: 'quality_work_accuracy',    label: 'Quality of Work (Accuracy & Neatness)',         max: 20 },
    { key: 'quality_work_timeliness',  label: 'Quality of Work (Completion in Allotted Time)', max: 20 },
    { key: 'dependability',            label: 'Dependability, Reliability & Resourcefulness',   max: 10 },
    { key: 'attendance',               label: 'Attendance & Punctuality',                       max: 10 },
    { key: 'cooperation',              label: 'Cooperation',                                    max: 10 },
    { key: 'company_rules_observance', label: 'Observance of Company Rules & Regulations',     max: 10 },
    { key: 'personality',              label: 'Personality',                                    max: 5  },
    { key: 'safety_housekeeping',      label: 'Safety and Housekeeping',                       max: 10 },
    { key: 'tools_equipment',          label: 'Proper Use of Tools / Equipment',               max: 5  },
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
                    className={`h-full rounded-full transition-all duration-700 ${progressBarColor(pct)}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FacultyEvaluations() {
    const [searchParams, setSearchParams] = useSearchParams()
    const studentQueryId = searchParams.get('student')

    const [students, setStudents] = useState([])
    const [evals, setEvals] = useState([])
    const [summary, setSummary] = useState(null)
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [loadingStudents, setLoadingStudents] = useState(true)
    const [loadingEvals, setLoadingEvals] = useState(false)

    // Load student list
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await api.get('/faculty/students')
                const list = res.data?.students || []
                setStudents(list)
                const initial = studentQueryId
                    ? list.find(s => String(s.student_id) === studentQueryId)
                    : list[0]
                if (initial) setSelectedStudent(initial)
            } catch (err) {
                console.error(err)
            } finally {
                setLoadingStudents(false)
            }
        }
        fetchStudents()
    }, [])

    // Load evaluations when selected student changes
    useEffect(() => {
        if (!selectedStudent) return
        const fetchEvals = async () => {
            setLoadingEvals(true)
            try {
                const res = await api.get(`/evaluations/${selectedStudent.student_id}`)
                setEvals(res.data?.evaluations || [])
                setSummary(res.data?.summary || null)
            } catch (err) {
                console.error(err)
                setEvals([])
                setSummary(null)
            } finally {
                setLoadingEvals(false)
            }
        }
        fetchEvals()
    }, [selectedStudent?.student_id])

    const handleStudentChange = (e) => {
        const student = students.find(s => String(s.student_id) === e.target.value)
        setSelectedStudent(student || null)
        setSearchParams(student ? { student: e.target.value } : {})
    }

    return (
        <div className="fade-in max-w-5xl mx-auto space-y-6 pb-12">
            <div className="mb-6">
                <h1 className="page-title">Student Evaluations</h1>
                <p className="page-sub mt-1">View OJT performance evaluations — read-only access.</p>
            </div>

            {/* Info banner */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/30 text-xs text-slate-400">
                <span>ℹ️</span>
                <span>Evaluations are submitted by assigned supervisors only, after students complete their required OJT hours. You have read-only access.</span>
            </div>

            {/* Student selector */}
            {loadingStudents ? (
                <div className="flex justify-center p-12"><div className="spinner w-8 h-8" /></div>
            ) : (
                <div className="card">
                    <div className="input-group">
                        <label className="input-label">Select Student</label>
                        <select
                            value={selectedStudent?.student_id || ''}
                            onChange={handleStudentChange}
                            className="input"
                        >
                            <option value="" disabled>Choose a student to view evaluations</option>
                            {students.map(s => (
                                <option key={s.student_id} value={s.student_id}>
                                    {s.student_name} — {s.company_name || s.department_name || ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Evaluations */}
            {selectedStudent && (
                loadingEvals ? (
                    <div className="flex justify-center p-12"><div className="spinner w-8 h-8" /></div>
                ) : evals.length === 0 ? (
                    <div className="card text-center py-12">
                        <p className="text-3xl mb-3">📋</p>
                        <p className="text-sm font-medium text-slate-400">No evaluations yet for {selectedStudent.student_name}</p>
                        <p className="text-xs text-slate-600 mt-1">
                            Evaluation is only available after the student completes their required OJT hours.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Summary card */}
                        {summary && (
                            <div className="card bg-gradient-to-br from-slate-800/30 to-slate-900/50 border-slate-700/40">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Average Across {summary.total_evaluations} Evaluation{summary.total_evaluations !== 1 ? 's' : ''}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
                                    {JOB_FACTORS.map(f => (
                                        <FactorScore
                                            key={f.key}
                                            label={f.label}
                                            score={summary[`avg_${f.key}`] ?? 0}
                                            max={f.max}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center justify-between mt-5 px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Average Total</span>
                                    <div className={`text-sm font-black ${getGradeInfo(summary.avg_overall_score).color}`}>
                                        {summary.avg_overall_score} / 100 — {summary.grade}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Individual evaluations */}
                        {evals.map((ev) => {
                            const grade = getGradeInfo(ev.overall_score)
                            return (
                                <div key={ev.ID || ev.id} className="card hover:border-slate-700 transition-colors">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 pb-6 border-b border-slate-800/50">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h2 className="text-lg font-bold text-white">🎓 OJT Completion Evaluation</h2>
                                                <span className="badge badge-approved text-[9px] uppercase tracking-widest font-black">Submitted</span>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                By <span className="text-slate-300 font-semibold">{ev.Supervisor?.name || ev.supervisor_name}</span>
                                            </p>
                                        </div>
                                        <div className={`w-20 h-20 rounded-2xl border flex flex-col items-center justify-center ${grade.ring}`}>
                                            <span className={`text-3xl font-black ${grade.color}`}>{ev.overall_score ?? ev.OverallScore}</span>
                                            <span className={`text-[9px] font-bold uppercase mt-0.5 ${grade.color}`}>{grade.label}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 mb-5">
                                        {JOB_FACTORS.map(f => (
                                            <FactorScore
                                                key={f.key}
                                                label={f.label}
                                                score={ev[f.key] ?? 0}
                                                max={f.max}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between mb-5 px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Rating</span>
                                        <span className={`text-sm font-black ${grade.color}`}>{ev.overall_score ?? ev.OverallScore} / 100</span>
                                    </div>

                                    {(ev.recommendation || ev.Recommendation) && (
                                        <div className="bg-slate-900/40 border border-slate-700/30 rounded-2xl p-5">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                Recommendation For the Trainees Growth
                                            </h3>
                                            <p className="text-slate-300 text-sm leading-relaxed italic">
                                                {ev.recommendation || ev.Recommendation}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )
            )}
        </div>
    )
}
