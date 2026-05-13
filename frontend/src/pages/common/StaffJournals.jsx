import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import ConfirmModal from '../../components/ui/ConfirmModal'

export default function StaffJournals() {
    const { user } = useAuthStore()
    const [journals, setJournals] = useState([])
    const [loading, setLoading] = useState(true)

    // Acknowledgement Modal
    const [ackJournal, setAckJournal] = useState(null)
    const [feedback, setFeedback] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const fetchJournals = async () => {
        setLoading(true)
        try {
            const endpoint = user?.role === 'supervisor' ? '/journals/supervisor' : '/journals/all'
            const res = await api.get(endpoint)
            setJournals(res.data.journals || [])
        } catch (err) {
            toast.error('Failed to load journals')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchJournals() }, [user])

    const handleReview = async (status) => {
        if (!ackJournal) return
        setSubmitting(true)
        try {
            await api.patch(`/journals/${ackJournal.ID}/review`, { status, feedback })
            toast.success(`Journal ${status}!`)
            setAckJournal(null)
            setFeedback('')
            fetchJournals()
        } catch (err) {
            toast.error(err.response?.data?.error || `Failed to review journal`)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fade-in space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Student Journals</h1>
                    <p className="page-sub">Review and acknowledge daily accomplishment reports.</p>
                </div>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center text-slate-500 py-10 animate-pulse">Loading journals...</div>
                ) : journals.length === 0 ? (
                    <div className="card text-center py-16 text-slate-500">
                        <p className="text-4xl mb-3">📝</p>
                        <p>No student journals found.</p>
                    </div>
                ) : (
                    journals.map(j => (
                        <div key={j.ID} className="card p-0 overflow-hidden">
                            <div className="p-5 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    {j.student?.profile_photo ? (
                                        <img src={j.student.profile_photo} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-700/50 shadow-sm" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-300 font-bold shadow-sm border border-slate-700/50">
                                            {j.student?.name?.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-white font-semibold text-base">{j.student?.name}</h3>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                            {j.student?.department?.code && (
                                                <span className="px-1.5 py-0.5 bg-slate-800 rounded-md text-slate-300 font-medium border border-slate-700/50 flex items-center">
                                                    {j.student.department.code}
                                                </span>
                                            )}
                                            {j.student?.department?.code && <span>•</span>}
                                            <span className="flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                {format(new Date(j.date), 'MMMM d, yyyy')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${j.status === 'acknowledged' ? 'bg-emerald-500/10 text-emerald-400' : j.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                        {j.status}
                                    </span>
                                    {j.status === 'pending' && user?.role === 'supervisor' && (
                                        <button onClick={() => { setAckJournal(j); setFeedback('') }} className="btn btn-sm btn-primary">
                                            Review
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tasks Accomplished</h4>
                                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{j.tasks}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Key Learnings</h4>
                                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{j.learnings}</p>
                                </div>
                                {j.feedback && (
                                    <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                        <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Supervisor Feedback</h4>
                                        <p className="text-sm text-indigo-200/80 whitespace-pre-wrap">{j.feedback}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Acknowledge Modal */}
            {ackJournal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-slate-800">
                            <h3 className="text-lg font-bold text-white">Review Journal</h3>
                            <p className="text-sm text-slate-400 mt-1">Provide optional feedback for {ackJournal.student?.name}</p>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Feedback (Optional)</label>
                                <textarea
                                    rows="4"
                                    placeholder="Great job this week! Keep it up..."
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                    className="input w-full py-2"
                                />
                            </div>
                        </div>
                        <div className="p-5 bg-slate-800/50 flex flex-col sm:flex-row justify-end gap-3">
                            <button onClick={() => setAckJournal(null)} className="btn bg-transparent hover:bg-slate-800 text-slate-300">
                                Cancel
                            </button>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button onClick={() => handleReview('rejected')} disabled={submitting} className="btn bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex-1 sm:flex-none">
                                    Decline
                                </button>
                                <button onClick={() => handleReview('acknowledged')} disabled={submitting} className="btn btn-primary flex-1 sm:flex-none">
                                    {submitting ? 'Saving...' : 'Acknowledge'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
