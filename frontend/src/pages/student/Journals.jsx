import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function StudentJournals() {
    const [journals, setJournals] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), tasks: '', learnings: '' })

    const fetchJournals = async () => {
        setLoading(true)
        try {
            const res = await api.get('/journals/me')
            setJournals(res.data.journals || [])
        } catch (err) {
            toast.error('Failed to load journals')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchJournals() }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            await api.post('/journals/', form)
            toast.success('Journal submitted successfully!')
            setShowForm(false)
            setForm({ date: format(new Date(), 'yyyy-MM-dd'), tasks: '', learnings: '' })
            fetchJournals()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit journal')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fade-in space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Accomplishment Journals</h1>
                    <p className="page-sub">Document your daily progress and learnings.</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
                    {showForm ? 'Cancel Entry' : '+ New Journal Entry'}
                </button>
            </div>

            {showForm && (
                <div className="card bg-slate-900 border-slate-800 animate-in slide-in-from-top-4">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4">New Entry</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date</label>
                            <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="input w-full" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tasks Accomplished</label>
                            <textarea required rows="3" placeholder="What did you do?" value={form.tasks} onChange={e => setForm({...form, tasks: e.target.value})} className="input w-full py-2" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Key Learnings / Challenges</label>
                            <textarea required rows="3" placeholder="What did you learn? Any issues faced?" value={form.learnings} onChange={e => setForm({...form, learnings: e.target.value})} className="input w-full py-2" />
                        </div>
                        <div className="flex justify-end pt-2">
                            <button type="submit" disabled={submitting} className="btn btn-primary">
                                {submitting ? 'Submitting...' : 'Submit Journal'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center text-slate-500 py-10 animate-pulse">Loading journals...</div>
                ) : journals.length === 0 ? (
                    <div className="card text-center py-16 text-slate-500">
                        <p className="text-4xl mb-3">📝</p>
                        <p>No journal entries yet.</p>
                    </div>
                ) : (
                    journals.map(j => (
                        <div key={j.ID} className="card p-0 overflow-hidden">
                            <div className="p-5 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-sm shrink-0">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold text-base">{format(new Date(j.date), 'MMMM d, yyyy')}</h3>
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            To: {j.supervisor?.name || 'Supervisor'}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${j.status === 'acknowledged' ? 'bg-emerald-500/10 text-emerald-400' : j.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                    {j.status}
                                </span>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tasks</h4>
                                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{j.tasks}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Learnings</h4>
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
        </div>
    )
}
