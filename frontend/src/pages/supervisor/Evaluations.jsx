import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────
const computeOverall = (scores) => {
    const values = Object.values(scores)
    const sum = values.reduce((acc, val) => acc + (Number(val) || 0), 0)
    return Math.round((sum / 5) * 100) / 100
}

const getGradeColor = (score) => {
    if (score >= 90) return 'text-emerald-400'
    if (score >= 80) return 'text-teal-400'
    if (score >= 70) return 'text-cyan-400'
    if (score >= 60) return 'text-amber-400'
    return 'text-red-400'
}

export default function SupervisorEvaluations() {
    const [searchParams] = useSearchParams()
    const studentQueryId = searchParams.get('student') // From URL if navigating from overview

    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState({})

    const [formData, setFormData] = useState({
        student_id: studentQueryId ? Number(studentQueryId) : '',
        period: 'Midterm', // Default
        technical_score: 85,
        communication_score: 85,
        punctuality_score: 85,
        teamwork_score: 85,
        initiative_score: 85,
        feedback: ''
    })

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await api.get('/supervisor/students')
                setStudents(res.data?.students || [])
                
                // If a student was in query but not in list, or no student elected, 
                // we'll just wait for user to select. But if we have students and no selection, pick first.
                if (!studentQueryId && res.data?.students?.length > 0) {
                    setFormData(prev => ({ ...prev, student_id: res.data.students[0].student_id }))
                }
            } catch (err) {
                console.error(err)
                toast.error('Failed to load students.')
            } finally {
                setLoading(false)
            }
        }
        fetchStudents()
    }, [studentQueryId])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }))
        }
    }

    const handleScoreChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: Number(value) }))
    }

    const validate = () => {
        const newErrors = {}
        if (!formData.student_id) newErrors.student_id = 'Please select a student'
        if (!formData.period) newErrors.period = 'Please select or enter an evaluation period'
        
        const criteria = ['technical_score', 'communication_score', 'punctuality_score', 'teamwork_score', 'initiative_score']
        criteria.forEach(c => {
            if (formData[c] < 0 || formData[c] > 100) {
                newErrors[c] = 'Score must be between 0 and 100'
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
            }
            const res = await api.post('/evaluations', payload)
            toast.success('Evaluation submitted successfully!')
            
            // Reset form (keep the same student and period, reset scores/feedback)
            setFormData(prev => ({
                ...prev,
                technical_score: 85,
                communication_score: 85,
                punctuality_score: 85,
                teamwork_score: 85,
                initiative_score: 85,
                feedback: ''
            }))
        } catch (err) {
            console.error(err)
            const msg = err.response?.data?.error || 'Failed to submit evaluation'
            toast.error(msg)
            setErrors(prev => ({ ...prev, submit: msg }))
        } finally {
            setSubmitting(false)
        }
    }

    const overallScore = computeOverall({
        tech: formData.technical_score,
        comm: formData.communication_score,
        punct: formData.punctuality_score,
        team: formData.teamwork_score,
        init: formData.initiative_score
    })

    const scoresList = [
        { name: 'technical_score', label: 'Technical Skills', desc: 'Proficiency and application of learned concepts' },
        { name: 'communication_score', label: 'Communication', desc: 'Clarity in written and verbal communication' },
        { name: 'teamwork_score', label: 'Teamwork', desc: 'Collaboration and cooperation with others' },
        { name: 'punctuality_score', label: 'Punctuality', desc: 'Attendance and timely completion of tasks' },
        { name: 'initiative_score', label: 'Initiative', desc: 'Proactiveness and willingness to learn' }
    ]

    return (
        <div className="fade-in max-w-4xl mx-auto space-y-6 pb-12">
            <div className="mb-6">
                <h1 className="page-title">Submit Performance Evaluation</h1>
                <p className="page-sub mt-1">Evaluate your assigned students based on their OJT performance.</p>
            </div>

            {loading ? (
                 <div className="flex justify-center p-12"><div className="spinner w-8 h-8" /></div>
            ) : students.length === 0 ? (
                <div className="card text-center py-12">
                    <p className="text-3xl mb-3">👥</p>
                    <p className="text-sm font-medium text-slate-400">No students assigned</p>
                    <p className="text-xs text-slate-600 mt-1">You need assigned students before you can submit evaluations.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="card space-y-8 relative overflow-hidden">
                    {/* Decorative backdrop glow */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

                    {/* Form Header info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 p-1">
                        <div className="input-group">
                            <label className="input-label">Student</label>
                            <select
                                name="student_id"
                                value={formData.student_id}
                                onChange={handleInputChange}
                                className={`input ${errors.student_id ? 'border-red-500 ring-red-500/20' : ''}`}
                            >
                                <option value="" disabled>Select a student</option>
                                {students.map(s => (
                                    <option key={s.student_id} value={s.student_id}>
                                        {s.student_name} ({s.company_name})
                                    </option>
                                ))}
                            </select>
                            {errors.student_id && <p className="text-[10px] text-red-500 mt-1">{errors.student_id}</p>}
                        </div>

                        <div className="input-group">
                            <label className="input-label">Evaluation Period</label>
                            <select
                                name="period"
                                value={formData.period}
                                onChange={handleInputChange}
                                className={`input ${errors.period ? 'border-red-500 ring-red-500/20' : ''}`}
                            >
                                <option value="Week 1-2">Week 1-2</option>
                                <option value="Midterm">Midterm</option>
                                <option value="Final">Final</option>
                                <option value="Overall">Overall</option>
                            </select>
                            {errors.period && <p className="text-[10px] text-red-500 mt-1">{errors.period}</p>}
                        </div>
                    </div>

                    <hr className="border-slate-800" />

                    {/* Scoring Grid */}
                    <div className="relative z-10">
                        <div className="flex items-center justify-between xl:items-end mb-6">
                            <div>
                                <h2 className="text-sm font-semibold text-white">Performance Criteria</h2>
                                <p className="text-xs text-slate-500 mt-1">Score each metric from 0 to 100.</p>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-4 text-right">
                                <div className="hidden sm:block">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Overall Average</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Calculated score</p>
                                </div>
                                <div className={`text-3xl font-black ${getGradeColor(overallScore)}`}>
                                    {overallScore.toFixed(1)}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {scoresList.map((item) => (
                                <div key={item.name} className="flex flex-col md:flex-row md:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/60 hover:border-slate-700 transition-colors">
                                    <div className="md:w-1/3">
                                        <p className="text-sm font-semibold text-slate-200">{item.label}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                                    </div>
                                    <div className="md:w-2/3 flex items-center gap-4">
                                        <input
                                            type="range"
                                            name={item.name}
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={formData[item.name]}
                                            onChange={handleScoreChange}
                                            className="flex-1 w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                        />
                                        <input
                                            type="number"
                                            name={item.name}
                                            min="0"
                                            max="100"
                                            value={formData[item.name]}
                                            onChange={handleScoreChange}
                                            className="w-16 bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-sm text-center font-semibold text-white focus:outline-none focus:border-teal-500"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <hr className="border-slate-800" />

                    {/* Feedback */}
                    <div className="relative z-10 input-group">
                        <label className="input-label">Qualitative Feedback</label>
                        <textarea
                            name="feedback"
                            rows="4"
                            placeholder="Provide constructive feedback, noting strengths and areas for improvement..."
                            value={formData.feedback}
                            onChange={handleInputChange}
                            className="input resize-none py-3"
                        ></textarea>
                        <p className="text-[11px] text-slate-500">This feedback will be visible to the student.</p>
                    </div>

                    {errors.submit && (
                        <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-xs text-red-400">
                            {errors.submit}
                        </div>
                    )}

                    {/* Submit */}
                    <div className="relative z-10 flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn bg-teal-600 hover:bg-teal-500 text-white min-w-[160px] justify-center shadow-lg shadow-teal-900/30 font-medium"
                        >
                            {submitting ? (
                                <><span className="spinner mr-2 border-white/40 border-t-white" /> Submitting...</>
                            ) : (
                                'Submit Evaluation'
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}
