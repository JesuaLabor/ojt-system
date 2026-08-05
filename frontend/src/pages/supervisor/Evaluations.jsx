import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'

// ── Job Factor Definitions ────────────────────────────────────────────────────
const JOB_FACTORS = [
    {
        name: 'quality_work_accuracy',
        label: 'Quality of Work',
        desc: 'Accuracy, neatness and orderliness',
        max: 20,
    },
    {
        name: 'quality_work_timeliness',
        label: 'Quality of Work',
        desc: 'Able to complete work in allotted time',
        max: 20,
    },
    {
        name: 'dependability',
        label: 'Dependability, Reliability & Resourcefulness',
        desc: 'Ability to work with minimum amount of supervision',
        max: 10,
    },
    {
        name: 'attendance',
        label: 'Attendance',
        desc: 'Regularly and punctuality in attendance',
        max: 10,
    },
    {
        name: 'cooperation',
        label: 'Cooperation',
        desc: 'Works well with everyone, good team worker',
        max: 10,
    },
    {
        name: 'company_rules_observance',
        label: 'Observance of Company Rules & Regulations',
        desc: 'Adherence to company policies and standards',
        max: 10,
    },
    {
        name: 'personality',
        label: 'Personality',
        desc: 'Personal grooming and pleasant disposition',
        max: 5,
    },
    {
        name: 'safety_housekeeping',
        label: 'Safety and Housekeeping',
        desc: 'Maintains a safe and orderly work environment',
        max: 10,
    },
    {
        name: 'tools_equipment',
        label: 'Proper Use of Tools / Equipment',
        desc: 'Correct and careful handling of tools and equipment',
        max: 5,
    },
]

const defaultScores = JOB_FACTORS.reduce((acc, f) => {
    acc[f.name] = f.max // Default to max rating
    return acc
}, {})

// ── Helpers ───────────────────────────────────────────────────────────────────
const computeTotal = (scores) =>
    Math.round(JOB_FACTORS.reduce((sum, f) => sum + (Number(scores[f.name]) || 0), 0) * 100) / 100

const getGradeInfo = (score) => {
    if (score >= 90) return { label: 'Outstanding', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' }
    if (score >= 80) return { label: 'Very Satisfactory', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/30' }
    if (score >= 70) return { label: 'Satisfactory', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' }
    if (score >= 60) return { label: 'Fairly Satisfactory', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' }
    return { label: 'Needs Improvement', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SupervisorEvaluations() {
    const [searchParams] = useSearchParams()
    const studentQueryId = searchParams.get('student')

    const [allStudents, setAllStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState({})

    const [formData, setFormData] = useState({
        student_id: studentQueryId ? Number(studentQueryId) : '',
        ...defaultScores,
        recommendation: '',
    })

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await api.get('/supervisor/students')
                setAllStudents(res.data?.students || [])
            } catch (err) {
                console.error(err)
                toast.error('Failed to load students.')
            } finally {
                setLoading(false)
            }
        }
        fetchStudents()
    }, [])

    // Only students who have completed their required hours are eligible
    const eligibleStudents = allStudents.filter(s => s.status === 'Completed')
    const ineligibleCount = allStudents.length - eligibleStudents.length

    // Auto-select first eligible student if none specified
    useEffect(() => {
        if (!studentQueryId && eligibleStudents.length > 0 && !formData.student_id) {
            setFormData(prev => ({ ...prev, student_id: eligibleStudents[0].student_id }))
        }
    }, [eligibleStudents.length])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
    }

    const handleScoreChange = (name, value, max) => {
        const clamped = Math.min(max, Math.max(0, Number(value)))
        setFormData(prev => ({ ...prev, [name]: clamped }))
    }

    const validate = () => {
        const newErrors = {}
        if (!formData.student_id) newErrors.student_id = 'Please select a student'
        JOB_FACTORS.forEach(f => {
            const val = Number(formData[f.name])
            if (isNaN(val) || val < 0 || val > f.max) {
                newErrors[f.name] = `Must be between 0 and ${f.max}`
            }
        })
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        setSubmitting(true)
        try {
            const payload = {
                ...formData,
                student_id: Number(formData.student_id),
                ...JOB_FACTORS.reduce((acc, f) => {
                    acc[f.name] = Number(formData[f.name])
                    return acc
                }, {}),
            }
            await api.post('/evaluations', payload)
            toast.success('Evaluation submitted successfully!')
            setFormData(prev => ({ ...prev, ...defaultScores, recommendation: '' }))
            setErrors({})
        } catch (err) {
            console.error(err)
            const errData = err.response?.data
            const msg = errData?.error || 'Failed to submit evaluation'
            // Show hours info if it's the completion gate
            if (errData?.remaining_hours != null) {
                toast.error(`${msg} — ${errData.remaining_hours} hrs remaining`)
            } else {
                toast.error(msg)
            }
            setErrors(prev => ({ ...prev, submit: msg }))
        } finally {
            setSubmitting(false)
        }
    }

    const totalScore = computeTotal(formData)
    const gradeInfo = getGradeInfo(totalScore)
    const selectedStudent = eligibleStudents.find(s => s.student_id === Number(formData.student_id))

    return (
        <div className="fade-in max-w-4xl mx-auto space-y-6 pb-12">
            <div className="mb-6">
                <h1 className="page-title">Submit Performance Evaluation</h1>
                <p className="page-sub mt-1">Rate your assigned students using the official OJT Job Factor criteria.</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><div className="spinner w-8 h-8" /></div>
            ) : allStudents.length === 0 ? (
                <div className="card text-center py-12">
                    <p className="text-3xl mb-3">👥</p>
                    <p className="text-sm font-medium text-slate-400">No students assigned</p>
                    <p className="text-xs text-slate-600 mt-1">You need assigned students before you can submit evaluations.</p>
                </div>
            ) : eligibleStudents.length === 0 ? (
                // All students assigned but none have completed hours
                <div className="space-y-4">
                    <div className="card border-amber-800/30 bg-amber-900/10 flex items-start gap-4 py-5">
                        <span className="text-2xl mt-0.5">⏳</span>
                        <div>
                            <p className="text-sm font-semibold text-amber-300">No Students Eligible for Evaluation</p>
                            <p className="text-xs text-amber-500/80 mt-1 leading-relaxed">
                                Evaluation is only allowed after a student completes their required OJT hours.
                                You have <span className="font-bold text-amber-300">{allStudents.length}</span> assigned student{allStudents.length !== 1 ? 's' : ''} who {allStudents.length !== 1 ? 'have' : 'has'} not yet fulfilled their required hours.
                            </p>
                        </div>
                    </div>
                    {/* Show progress of ineligible students */}
                    <div className="card space-y-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Student Progress</h2>
                        {allStudents.map(s => (
                            <div key={s.student_id} className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-300 truncate">{s.student_name}</p>
                                    <p className="text-xs text-slate-500">{s.company_name}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs font-semibold text-slate-300">{s.completed_hours} / {s.required_hours} hrs</p>
                                    <p className="text-[10px] text-amber-500 font-medium">{s.progress_pct}% complete</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Ineligible students notice */}
                    {ineligibleCount > 0 && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-900/10 border border-amber-800/30 text-xs text-amber-400">
                            <span>⚠️</span>
                            <span>
                                <strong>{ineligibleCount}</strong> of your {allStudents.length} student{allStudents.length !== 1 ? 's are' : ' is'} not yet eligible — they haven&apos;t completed their required hours.
                            </span>
                        </div>
                    )}

                    <div className="card space-y-8 relative overflow-hidden">
                        {/* Decorative glow */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

                        {/* Student selector + one-time badge */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <div className="input-group">
                                <label className="input-label">Student</label>
                                <select
                                    name="student_id"
                                    value={formData.student_id}
                                    onChange={handleInputChange}
                                    className={`input ${errors.student_id ? 'border-red-500 ring-red-500/20' : ''}`}
                                >
                                    <option value="" disabled>Select a student</option>
                                    {eligibleStudents.map(s => (
                                        <option key={s.student_id} value={s.student_id}>
                                            {s.student_name} — {s.company_name}
                                        </option>
                                    ))}
                                </select>
                                {selectedStudent && (
                                    <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1">
                                        <span>✓</span> {selectedStudent.completed_hours} / {selectedStudent.required_hours} hrs completed
                                    </p>
                                )}
                                {errors.student_id && <p className="text-[10px] text-red-500 mt-1">{errors.student_id}</p>}
                            </div>

                            {/* One-time evaluation notice */}
                            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-teal-900/10 border border-teal-800/30">
                                <span className="text-xl mt-0.5">🎓</span>
                                <div>
                                    <p className="text-xs font-bold text-teal-300">OJT Completion Evaluation</p>
                                    <p className="text-[10px] text-teal-500/80 mt-1 leading-relaxed">
                                        This is a one-time evaluation submitted after the student has fully completed their required OJT hours.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-800" />

                        {/* Job Factors Scoring */}
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-sm font-semibold text-white">Job Factors</h2>
                                    <p className="text-xs text-slate-500 mt-1">Rate each factor from 0 to its maximum rating.</p>
                                </div>
                                {/* Live Total Score */}
                                <div className={`border rounded-xl px-4 py-3 flex items-center gap-3 text-right ${gradeInfo.bg}`}>
                                    <div className="hidden sm:block">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Rating</p>
                                        <p className={`text-[10px] font-semibold mt-0.5 ${gradeInfo.color}`}>{gradeInfo.label}</p>
                                    </div>
                                    <div className={`text-3xl font-black ${gradeInfo.color}`}>
                                        {totalScore.toFixed(1)}
                                    </div>
                                </div>
                            </div>

                            {/* Header row */}
                            <div className="hidden md:grid grid-cols-12 gap-4 px-4 mb-2">
                                <div className="col-span-5 text-[10px] font-bold uppercase tracking-widest text-slate-600">Job Factor</div>
                                <div className="col-span-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">Rating Slider</div>
                                <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-slate-600 text-center">Score</div>
                                <div className="col-span-1 text-[10px] font-bold uppercase tracking-widest text-slate-600 text-center">Max</div>
                            </div>

                            <div className="space-y-3">
                                {JOB_FACTORS.map((factor, idx) => {
                                    const val = Number(formData[factor.name]) || 0
                                    const pct = (val / factor.max) * 100
                                    return (
                                        <div
                                            key={factor.name}
                                            className="grid grid-cols-12 gap-4 items-center bg-slate-900/50 px-4 py-3 rounded-xl border border-slate-800/60 hover:border-slate-700 transition-colors"
                                        >
                                            {/* Number + Name */}
                                            <div className="col-span-12 md:col-span-5">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-[10px] font-black text-slate-600 mt-0.5 shrink-0">{idx + 1}.</span>
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-200 leading-snug">{factor.label}</p>
                                                        <p className="text-[10px] text-slate-500 italic mt-0.5">{factor.desc}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Slider */}
                                            <div className="col-span-8 md:col-span-4 flex items-center">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={factor.max}
                                                    step="0.5"
                                                    value={val}
                                                    onChange={e => handleScoreChange(factor.name, e.target.value, factor.max)}
                                                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                                    style={{
                                                        background: `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${pct}%, #1e293b ${pct}%, #1e293b 100%)`
                                                    }}
                                                />
                                            </div>

                                            {/* Number input */}
                                            <div className="col-span-2 md:col-span-2 flex justify-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={factor.max}
                                                    step="0.5"
                                                    value={val}
                                                    onChange={e => handleScoreChange(factor.name, e.target.value, factor.max)}
                                                    className="w-14 bg-slate-950 border border-slate-700 rounded-md px-1 py-1 text-sm text-center font-bold text-white focus:outline-none focus:border-teal-500"
                                                />
                                            </div>

                                            {/* Max badge */}
                                            <div className="col-span-2 md:col-span-1 flex justify-center">
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                                                    {factor.max}%
                                                </span>
                                            </div>

                                            {errors[factor.name] && (
                                                <p className="col-span-12 text-[10px] text-red-500 -mt-2">{errors[factor.name]}</p>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Total row */}
                            <div className="flex items-center justify-between mt-4 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Rating</span>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-semibold ${gradeInfo.color}`}>{gradeInfo.label}</span>
                                    <span className={`text-lg font-black ${gradeInfo.color}`}>{totalScore.toFixed(1)} / 100</span>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-800" />

                        {/* Recommendation */}
                        <div className="relative z-10 input-group">
                            <label className="input-label">Recommendation For the Trainees Growth</label>
                            <textarea
                                name="recommendation"
                                rows="4"
                                placeholder="Provide your recommendation for the trainee's continued growth and development..."
                                value={formData.recommendation}
                                onChange={handleInputChange}
                                className="input resize-none py-3"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">This recommendation will be visible to the student and coordinator.</p>
                        </div>

                        {errors.submit && (
                            <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-xs text-red-400">
                                {errors.submit}
                            </div>
                        )}

                        {/* Submit */}
                        <div className="relative z-10 flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn bg-teal-600 hover:bg-teal-500 text-white min-w-[180px] justify-center shadow-lg shadow-teal-900/30 font-medium"
                            >
                                {submitting ? (
                                    <><span className="spinner mr-2 border-white/40 border-t-white" /> Submitting...</>
                                ) : (
                                    'Submit Evaluation'
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    )
}
