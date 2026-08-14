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
            await api.post('/journals', form)
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

    // ── PDF Download ──────────────────────────────────────────────────────────
    const downloadJournalPDF = async (journal) => {
        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

        const pageW = doc.internal.pageSize.getWidth()
        const margin = 18
        const contentW = pageW - margin * 2
        let y = 0

        // ── Header bar ──────────────────────────────────────────────────────
        doc.setFillColor(15, 118, 110) // teal-700
        doc.rect(0, 0, pageW, 30, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(16)
        doc.text('OJT Accomplishment Journal', margin, 13)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text('On-the-Job Training Management System', margin, 20)

        // ── Acknowledged stamp (top-right) ───────────────────────────────────
        doc.setFillColor(5, 150, 105) // emerald-600
        doc.roundedRect(pageW - margin - 36, 5, 36, 12, 2, 2, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(255, 255, 255)
        doc.text('ACKNOWLEDGED', pageW - margin - 33, 13)

        y = 40

        // ── Meta info ────────────────────────────────────────────────────────
        doc.setTextColor(30, 41, 59)
        doc.setFillColor(241, 245, 249)
        doc.roundedRect(margin, y, contentW, 22, 3, 3, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(100, 116, 139)
        doc.text('JOURNAL DATE', margin + 4, y + 7)
        doc.text('SUPERVISOR', margin + contentW / 2 + 4, y + 7)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(15, 23, 42)
        doc.text(format(new Date(journal.date), 'MMMM d, yyyy'), margin + 4, y + 16)
        doc.text(journal.supervisor?.name || 'Supervisor', margin + contentW / 2 + 4, y + 16)

        y += 30

        // ── Helper: section block ────────────────────────────────────────────
        const addSection = (title, content, r, g, b) => {
            doc.setFillColor(r, g, b)
            doc.setDrawColor(r, g, b)
            doc.setLineWidth(0.4)
            doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(8)
            doc.setTextColor(255, 255, 255)
            doc.text(title.toUpperCase(), margin + 4, y + 5.5)
            y += 12

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(10)
            doc.setTextColor(51, 65, 85)
            const lines = doc.splitTextToSize(content, contentW)
            lines.forEach(line => {
                if (y > 270) { doc.addPage(); y = 20 }
                doc.text(line, margin, y)
                y += 5.5
            })
            y += 6
        }

        addSection('Tasks Accomplished', journal.tasks, 15, 118, 110)
        addSection('Key Learnings / Challenges', journal.learnings, 99, 102, 241)

        if (journal.feedback) {
            addSection('Supervisor Feedback', journal.feedback, 245, 158, 11)
        }

        // ── Footer ───────────────────────────────────────────────────────────
        const totalPages = doc.internal.getNumberOfPages()
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i)
            doc.setDrawColor(203, 213, 225)
            doc.setLineWidth(0.3)
            doc.line(margin, 285, pageW - margin, 285)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(148, 163, 184)
            doc.text(`OJT Journal — ${format(new Date(journal.date), 'MMMM d, yyyy')}`, margin, 290)
            doc.text(`Page ${i} of ${totalPages}`, pageW - margin, 290, { align: 'right' })
        }

        const fileName = `Journal_${format(new Date(journal.date), 'yyyy-MM-dd')}.pdf`
        doc.save(fileName)
        toast.success(`Downloaded: ${fileName}`)
    }
    // ─────────────────────────────────────────────────────────────────────────

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
                            <div className="p-5 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center gap-3">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-sm shrink-0">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-white font-semibold text-base">{format(new Date(j.date), 'MMMM d, yyyy')}</h3>
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            To: {j.supervisor?.name || 'Supervisor'}
                                        </p>
                                    </div>
                                </div>

                                {/* Status badge + Download button */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${j.status === 'acknowledged' ? 'bg-emerald-500/10 text-emerald-400' : j.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                        {j.status}
                                    </span>
                                    {j.status === 'acknowledged' && (
                                        <button
                                            onClick={() => downloadJournalPDF(j)}
                                            title="Download acknowledged journal as PDF"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            <span className="hidden sm:inline">PDF</span>
                                        </button>
                                    )}
                                </div>
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
