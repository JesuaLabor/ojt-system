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

    // ── Combined PDF Download ─────────────────────────────────────────────────
    const downloadAllJournalsPDF = async () => {
        const acknowledged = journals
            .filter(j => j.status === 'acknowledged')
            .sort((a, b) => new Date(a.date) - new Date(b.date))

        if (acknowledged.length === 0) {
            toast.error('No acknowledged journals to download.')
            return
        }

        setDownloading(true)
        try {
            const { jsPDF } = await import('jspdf')
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

            const pageW  = doc.internal.pageSize.getWidth()
            const pageH  = doc.internal.pageSize.getHeight()
            const margin = 20
            const cW     = pageW - margin * 2   // usable content width

            // ── Color palette (named Tailwind-like) ──────────────────────────
            const C = {
                teal:       [15, 118, 110],
                tealMid:    [20, 140, 130],
                tealLight:  [204, 240, 236],
                tealDark:   [6,   78,  74],
                emerald:    [5,  150, 105],
                indigo:     [99, 102, 241],
                indigoLight:[224, 231, 255],
                amber:      [217, 119,   6],
                amberLight: [254, 243, 199],
                white:      [255, 255, 255],
                slate50:    [248, 250, 252],
                slate200:   [226, 232, 240],
                slate400:   [148, 163, 184],
                slate500:   [100, 116, 139],
                slate700:   [ 51,  65,  85],
                dark:       [ 15,  23,  42],
                darkMid:    [ 22,  34,  55],
                darkDeep:   [ 18,  28,  46],
            }

            const sf = (arr) => doc.setFillColor(...arr)
            const ss = (arr) => doc.setDrawColor(...arr)
            const sc = (arr) => doc.setTextColor(...arr)

            // ── Page-break-aware text writer, returns new Y ──────────────────
            const writeText = (text, x, y, maxW, lineH = 5.5) => {
                doc.splitTextToSize(text, maxW).forEach(line => {
                    if (y > pageH - 22) {
                        doc.addPage()
                        drawEntryChromeOnCurrentPage()
                        y = 38
                    }
                    doc.text(line, x, y)
                    y += lineH
                })
                return y
            }

            // ── Left teal accent bar (entry pages only) ──────────────────────
            const drawAccentBar = () => {
                sf(C.teal);    doc.rect(0, 0, 6, pageH, 'F')
                sf(C.tealMid); doc.rect(0, 0, 2, pageH, 'F')
            }

            // ── Entry-page chrome (called by continuation pages too) ──────────
            let _entryLabel = ''
            const drawEntryChromeOnCurrentPage = () => {
                drawAccentBar()
                sf(C.dark); doc.rect(6, 0, pageW - 6, 22, 'F')
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
                sc(C.white); doc.text('OJT Accomplishment Journals', 14, 10)
                doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
                sc(C.slate400); doc.text('On-the-Job Training Management System', 14, 16.5)
                sf(C.teal); doc.roundedRect(pageW - margin - 44, 5, 44, 11, 2, 2, 'F')
                doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
                sc(C.white); doc.text(_entryLabel, pageW - margin - 41, 12)
            }

            // ── Global footer applied after all pages are built ───────────────
            const applyAllFooters = () => {
                const n = doc.internal.getNumberOfPages()
                for (let i = 1; i <= n; i++) {
                    doc.setPage(i)
                    ss(C.slate200); doc.setLineWidth(0.25)
                    doc.line(margin, pageH - 10, pageW - margin, pageH - 10)
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5)
                    sc(C.slate400)
                    doc.text('OJT Performance Monitoring System  •  Accomplishment Journals', margin, pageH - 5.5)
                    doc.text(`Page ${i} of ${n}`, pageW - margin, pageH - 5.5, { align: 'right' })
                    sf(C.teal); doc.circle(pageW / 2, pageH - 5.5, 0.8, 'F')
                }
            }

            // ════════════════════════════════════════════════════════════════
            // PAGE 1 — COVER
            // ════════════════════════════════════════════════════════════════
            sf(C.dark);     doc.rect(0, 0, pageW, pageH, 'F')   // full dark bg
            sf(C.teal);     doc.rect(0, 0, pageW, 62, 'F')       // teal header band
            sf(C.tealDark); doc.triangle(pageW - 55, 0, pageW, 0, pageW, 62, 'F') // corner triangle
            sf(C.white);    doc.rect(0, 0, 8, 62, 'F')           // white left edge

            // System label + titles
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5)
            sc([204, 240, 236])
            doc.text('ON-THE-JOB TRAINING MANAGEMENT SYSTEM', 18, 16)

            doc.setFont('helvetica', 'bold'); doc.setFontSize(26); sc(C.white)
            doc.text('Accomplishment', 18, 33)
            doc.text('Journal Compilation', 18, 46)
            ss(C.white); doc.setLineWidth(0.5); doc.line(18, 50, 120, 50)
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9); sc([204, 240, 236])
            doc.text('Acknowledged OJT Journal Entries', 18, 57)

            // ── 3 stat cards ────────────────────────────────────────────────
            const cardY = 76, cardH = 28, cardW = (cW - 8) / 3
            ;[
                { label: 'Total Entries', value: String(acknowledged.length) },
                { label: 'From',  value: format(new Date(acknowledged[0].date), 'MMM d, yyyy') },
                { label: 'To',    value: format(new Date(acknowledged[acknowledged.length - 1].date), 'MMM d, yyyy') },
            ].forEach((s, i) => {
                const cx = margin + i * (cardW + 4)
                sf(C.darkMid); doc.roundedRect(cx, cardY, cardW, cardH, 3, 3, 'F')
                sf(C.teal);    doc.roundedRect(cx, cardY, cardW, 2.5, 1, 1, 'F')
                doc.setFont('helvetica', 'bold'); doc.setFontSize(13); sc(C.white)
                doc.text(s.value, cx + cardW / 2, cardY + 14, { align: 'center' })
                doc.setFont('helvetica', 'normal'); doc.setFontSize(7); sc(C.slate400)
                doc.text(s.label.toUpperCase(), cx + cardW / 2, cardY + 21, { align: 'center' })
            })

            // ── Table of contents ────────────────────────────────────────────
            const tocY = cardY + cardH + 14
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8); sc(C.slate400)
            doc.text('TABLE OF CONTENTS', margin, tocY)
            ss(C.teal); doc.setLineWidth(0.4); doc.line(margin, tocY + 3, margin + 40, tocY + 3)

            let ty = tocY + 11
            acknowledged.forEach((j, idx) => {
                if (ty > pageH - 20) return
                sf(idx % 2 === 0 ? C.darkMid : C.darkDeep)
                doc.roundedRect(margin, ty - 5, cW, 8.5, 1.5, 1.5, 'F')

                // Number bubble
                sf(C.teal); doc.circle(margin + 6, ty - 0.8, 3.5, 'F')
                doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); sc(C.white)
                doc.text(String(idx + 1), margin + 6, ty + 0.8, { align: 'center' })

                doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); sc(C.white)
                doc.text(format(new Date(j.date), 'MMMM d, yyyy'), margin + 14, ty)

                doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); sc(C.slate400)
                doc.text(j.supervisor?.name || '—', pageW - margin - 4, ty, { align: 'right' })

                // Dotted connector
                ss([40, 58, 80]); doc.setLineWidth(0.2)
                doc.setLineDashPattern([0.5, 1.5], 0)
                doc.line(margin + 72, ty - 1, pageW - margin - 30, ty - 1)
                doc.setLineDashPattern([], 0)
                ty += 10
            })

            // ── Cover bottom bar ─────────────────────────────────────────────
            sf(C.teal);  doc.rect(0, pageH - 14, pageW, 14, 'F')
            sf(C.white); doc.rect(0, pageH - 14, 8, 14, 'F')
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); sc(C.white)
            doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy  h:mm a')}`, 18, pageH - 5.5)
            doc.text('Confidential — For Official Use Only', pageW - margin, pageH - 5.5, { align: 'right' })

            // ════════════════════════════════════════════════════════════════
            // PAGES 2+ — One entry per page
            // ════════════════════════════════════════════════════════════════
            acknowledged.forEach((j, idx) => {
                doc.addPage()
                _entryLabel = `ENTRY ${String(idx + 1).padStart(2, '0')} / ${acknowledged.length}`
                drawEntryChromeOnCurrentPage()

                let ey = 30

                // ── Date hero card ───────────────────────────────────────────
                sf(C.slate50); doc.roundedRect(margin, ey, cW, 26, 3, 3, 'F')
                sf(C.teal);    doc.roundedRect(margin, ey, 3.5, 26, 2, 2, 'F')

                doc.setFont('helvetica', 'bold'); doc.setFontSize(15); sc(C.dark)
                doc.text(format(new Date(j.date), 'MMMM d, yyyy'), margin + 10, ey + 11)
                doc.setFont('helvetica', 'normal'); doc.setFontSize(8); sc(C.slate500)
                doc.text(format(new Date(j.date), 'EEEE'), margin + 10, ey + 19)

                // Supervisor (right side of card)
                doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); sc(C.slate400)
                doc.text('REVIEWED BY', pageW - margin - 4, ey + 9, { align: 'right' })
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); sc(C.dark)
                doc.text(j.supervisor?.name || 'Supervisor', pageW - margin - 4, ey + 17, { align: 'right' })

                // ✓ ACKNOWLEDGED pill
                sf(C.emerald); doc.roundedRect(pageW - margin - 38, ey + 20, 38, 4.5, 2, 2, 'F')
                doc.setFont('helvetica', 'bold'); doc.setFontSize(6); sc(C.white)
                doc.text('✓  ACKNOWLEDGED', pageW - margin - 36, ey + 23.5)
                ey += 33

                // ── Section renderer (left bar + title rule + text) ──────────
                const section = (title, text, color, lightColor, italic = false) => {
                    // Left accent bar
                    sf(color); doc.rect(margin, ey, 3, 7, 'F')
                    // Title
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); sc(color)
                    doc.text(title, margin + 6, ey + 5.5)
                    // Thin rule
                    sf(lightColor); doc.roundedRect(margin, ey + 9, cW, 3, 1.5, 1.5, 'F')
                    ey += 14
                    // Body text
                    doc.setFont('helvetica', italic ? 'italic' : 'normal')
                    doc.setFontSize(10)
                    sc(italic ? [146, 64, 14] : C.slate700)
                    ey = writeText(italic ? `"${text}"` : text, margin, ey, cW)
                    ey += 6
                }

                section('TASKS ACCOMPLISHED',        j.tasks,     C.teal,   C.tealLight)
                section('KEY LEARNINGS & CHALLENGES', j.learnings, C.indigo, C.indigoLight)
                if (j.feedback) {
                    if (ey > pageH - 55) {
                        doc.addPage(); drawEntryChromeOnCurrentPage(); ey = 38
                    }
                    section('SUPERVISOR FEEDBACK', j.feedback, C.amber, C.amberLight, true)
                }

                // ── Signature / verification block ───────────────────────────
                if (ey > pageH - 38) {
                    doc.addPage(); drawEntryChromeOnCurrentPage(); ey = 38
                }
                const sigY = pageH - 38
                ss(C.slate200); doc.setLineWidth(0.25)
                doc.line(margin, sigY, pageW - margin, sigY)

                const bW = cW / 2 - 6
                ;[
                    { x: margin,      label: 'STUDENT SIGNATURE',     name: 'Student' },
                    { x: margin + bW + 12, label: 'SUPERVISOR SIGNATURE', name: j.supervisor?.name || 'Supervisor' },
                ].forEach(({ x, label, name }) => {
                    sf(C.slate50); doc.roundedRect(x, sigY + 4, bW, 20, 2, 2, 'F')
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); sc(C.slate400)
                    doc.text(label, x + bW / 2, sigY + 10, { align: 'center' })
                    ss(C.slate400); doc.setLineWidth(0.3)
                    doc.line(x + 8, sigY + 20, x + bW - 8, sigY + 20)
                    doc.setFontSize(6.5)
                    doc.text(name, x + bW / 2, sigY + 24, { align: 'center' })
                })
            })

            // ── Stamp footers on every page ──────────────────────────────────
            applyAllFooters()

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
