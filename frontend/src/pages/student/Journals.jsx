import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function StudentJournals() {
    const [journals, setJournals] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [downloading, setDownloading] = useState(false)
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

    // ── Combined PDF Download (all acknowledged journals) ─────────────────────
    const downloadAllJournalsPDF = async () => {
        const acknowledged = journals
            .filter(j => j.status === 'acknowledged')
            .sort((a, b) => new Date(a.date) - new Date(b.date)) // oldest first

        if (acknowledged.length === 0) {
            toast.error('No acknowledged journals to download.')
            return
        }

        setDownloading(true)
        try {
            const { jsPDF } = await import('jspdf')
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

            const pageW = doc.internal.pageSize.getWidth()
            const pageH = doc.internal.pageSize.getHeight()
            const margin = 18
            const contentW = pageW - margin * 2

            // ── Helper: draw page header bar ────────────────────────────────
            const drawHeader = (pageLabel) => {
                doc.setFillColor(15, 118, 110)
                doc.rect(0, 0, pageW, 28, 'F')
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(13)
                doc.setTextColor(255, 255, 255)
                doc.text('OJT Accomplishment Journals', margin, 12)
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(7.5)
                doc.text('On-the-Job Training Management System', margin, 19)
                // Page label badge (top-right)
                doc.setFillColor(5, 150, 105)
                doc.roundedRect(pageW - margin - 42, 5, 42, 11, 2, 2, 'F')
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(7.5)
                doc.setTextColor(255, 255, 255)
                doc.text(pageLabel, pageW - margin - 39, 12.5)
            }

            // ── Helper: section block ────────────────────────────────────────
            const addSection = (doc, title, content, r, g, b, yRef) => {
                let y = yRef
                doc.setFillColor(r, g, b)
                doc.setLineWidth(0.4)
                doc.roundedRect(margin, y, contentW, 7.5, 2, 2, 'F')
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(7.5)
                doc.setTextColor(255, 255, 255)
                doc.text(title.toUpperCase(), margin + 4, y + 5.2)
                y += 11

                doc.setFont('helvetica', 'normal')
                doc.setFontSize(10)
                doc.setTextColor(51, 65, 85)
                const lines = doc.splitTextToSize(content, contentW)
                lines.forEach(line => {
                    if (y > pageH - 20) {
                        doc.addPage()
                        drawHeader('continued')
                        y = 36
                    }
                    doc.text(line, margin, y)
                    y += 5.5
                })
                return y + 5
            }

            // ── Helper: page footer ──────────────────────────────────────────
            const drawFooter = (doc, label) => {
                const totalPages = doc.internal.getNumberOfPages()
                for (let i = 1; i <= totalPages; i++) {
                    doc.setPage(i)
                    doc.setDrawColor(203, 213, 225)
                    doc.setLineWidth(0.3)
                    doc.line(margin, pageH - 8, pageW - margin, pageH - 8)
                    doc.setFont('helvetica', 'normal')
                    doc.setFontSize(7)
                    doc.setTextColor(148, 163, 184)
                    doc.text(label, margin, pageH - 4)
                    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 4, { align: 'right' })
                }
            }

            // ════════════════════════════════════════════════════════════════
            // PAGE 1 — Cover / Summary
            // ════════════════════════════════════════════════════════════════
            drawHeader('COVER PAGE')

            let y = 36

            // Big title block
            doc.setFillColor(241, 245, 249)
            doc.roundedRect(margin, y, contentW, 28, 4, 4, 'F')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(20)
            doc.setTextColor(15, 23, 42)
            doc.text('Accomplishment Journal', margin + contentW / 2, y + 12, { align: 'center' })
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(10)
            doc.setTextColor(100, 116, 139)
            doc.text('Compilation of Acknowledged OJT Journal Entries', margin + contentW / 2, y + 21, { align: 'center' })
            y += 36

            // Stats row
            const statW = contentW / 3 - 3
            const stats = [
                { label: 'Total Entries', value: String(acknowledged.length) },
                { label: 'Date From', value: format(new Date(acknowledged[0].date), 'MMM d, yyyy') },
                { label: 'Date To', value: format(new Date(acknowledged[acknowledged.length - 1].date), 'MMM d, yyyy') },
            ]
            stats.forEach((s, i) => {
                const x = margin + i * (statW + 4.5)
                doc.setFillColor(15, 118, 110, 0.08)
                doc.setFillColor(236, 253, 245)
                doc.roundedRect(x, y, statW, 18, 3, 3, 'F')
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(14)
                doc.setTextColor(15, 118, 110)
                doc.text(s.value, x + statW / 2, y + 10, { align: 'center' })
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(7.5)
                doc.setTextColor(100, 116, 139)
                doc.text(s.label.toUpperCase(), x + statW / 2, y + 16, { align: 'center' })
            })
            y += 26

            // Table of contents
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            doc.setTextColor(100, 116, 139)
            doc.text('INDEX OF JOURNAL ENTRIES', margin, y)
            y += 5
            doc.setDrawColor(203, 213, 225)
            doc.setLineWidth(0.3)
            doc.line(margin, y, pageW - margin, y)
            y += 6

            acknowledged.forEach((j, idx) => {
                if (y > pageH - 20) return // safety
                const isEven = idx % 2 === 0
                if (isEven) {
                    doc.setFillColor(248, 250, 252)
                    doc.rect(margin, y - 4, contentW, 8, 'F')
                }
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(9)
                doc.setTextColor(15, 23, 42)
                doc.text(`${String(idx + 1).padStart(2, '0')}.  ${format(new Date(j.date), 'MMMM d, yyyy')}`, margin + 3, y)
                doc.setFont('helvetica', 'normal')
                doc.setTextColor(100, 116, 139)
                doc.text(j.supervisor?.name || 'Supervisor', pageW - margin - 3, y, { align: 'right' })
                // Acknowledged badge dot
                doc.setFillColor(5, 150, 105)
                doc.circle(margin + contentW / 2, y - 1.2, 1.5, 'F')
                y += 9
            })

            // ════════════════════════════════════════════════════════════════
            // PAGES 2+ — One entry per new page
            // ════════════════════════════════════════════════════════════════
            acknowledged.forEach((j, idx) => {
                doc.addPage()
                drawHeader(`ENTRY ${String(idx + 1).padStart(2, '0')} OF ${acknowledged.length}`)

                let ey = 36

                // Entry meta card
                doc.setFillColor(241, 245, 249)
                doc.roundedRect(margin, ey, contentW, 20, 3, 3, 'F')

                doc.setFont('helvetica', 'bold')
                doc.setFontSize(8.5)
                doc.setTextColor(100, 116, 139)
                doc.text('JOURNAL DATE', margin + 4, ey + 6)
                doc.text('SUPERVISOR', margin + contentW / 2 + 4, ey + 6)

                doc.setFont('helvetica', 'bold')
                doc.setFontSize(12)
                doc.setTextColor(15, 23, 42)
                doc.text(format(new Date(j.date), 'MMMM d, yyyy'), margin + 4, ey + 15)
                doc.text(j.supervisor?.name || 'Supervisor', margin + contentW / 2 + 4, ey + 15)

                // Acknowledged stamp
                doc.setFillColor(5, 150, 105)
                doc.roundedRect(pageW - margin - 40, ey + 4, 40, 11, 2, 2, 'F')
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(7.5)
                doc.setTextColor(255, 255, 255)
                doc.text('✓ ACKNOWLEDGED', pageW - margin - 37, ey + 11)

                ey += 28

                ey = addSection(doc, 'Tasks Accomplished', j.tasks, 15, 118, 110, ey)
                ey = addSection(doc, 'Key Learnings / Challenges', j.learnings, 99, 102, 241, ey)

                if (j.feedback) {
                    ey = addSection(doc, 'Supervisor Feedback', j.feedback, 245, 158, 11, ey)
                }
            })

            // ── Apply footer to all pages ────────────────────────────────────
            drawFooter(doc, `OJT Journals — ${acknowledged.length} acknowledged entries`)

            const fileName = `OJT_Journals_${format(new Date(), 'yyyy-MM-dd')}.pdf`
            doc.save(fileName)
            toast.success(`Downloaded ${acknowledged.length} journal entries as PDF!`)
        } catch (err) {
            console.error(err)
            toast.error('Failed to generate PDF.')
        } finally {
            setDownloading(false)
        }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const acknowledgedCount = journals.filter(j => j.status === 'acknowledged').length

    return (
        <div className="fade-in space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Accomplishment Journals</h1>
                    <p className="page-sub">Document your daily progress and learnings.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Download All button — only shows when there are acknowledged entries */}
                    {acknowledgedCount > 0 && (
                        <button
                            onClick={downloadAllJournalsPDF}
                            disabled={downloading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title={`Download all ${acknowledgedCount} acknowledged journal${acknowledgedCount > 1 ? 's' : ''} as one PDF`}
                        >
                            {downloading ? (
                                <span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            )}
                            <span>Download Journals</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                {acknowledgedCount}
                            </span>
                        </button>
                    )}
                    <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
                        {showForm ? 'Cancel Entry' : '+ New Journal Entry'}
                    </button>
                </div>
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
                                {/* Status badge only */}
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${j.status === 'acknowledged' ? 'bg-emerald-500/10 text-emerald-400' : j.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
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
