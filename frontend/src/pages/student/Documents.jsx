import { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'

// ── Constants ─────────────────────────────────────────────────────────────────
const REQUIRED_DOCS = [
    'MOA',
    'Endorsement Letter',
    'Waiver Form',
    'Insurance Certificate'
]

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        'not uploaded': 'bg-slate-800 text-slate-500 border-slate-700',
        'pending': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        'approved': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        'rejected': 'bg-red-500/10 text-red-400 border-red-500/20',
    }

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${map[status] || map['not uploaded']}`}>
            {status}
        </span>
    )
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon, accent }) {
    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 group hover:border-slate-700 transition-colors">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-black/20 ${accent}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">{label}</p>
                <p className="text-xl font-bold text-white leading-tight">{value}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
            </div>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function StudentDocuments() {
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(null) // ID of document type being uploaded
    const fileInputRef = useRef(null)
    const activeTypeRef = useRef(null)

    const fetchDocs = async () => {
        try {
            const res = await api.get('/documents')
            setDocuments(res.data?.documents || [])
        } catch (err) {
            console.error('Failed to fetch documents:', err)
            toast.error('Failed to load document list.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDocs()
    }, [])

    const handleFileClick = (docType) => {
        activeTypeRef.current = docType
        fileInputRef.current.click()
    }

    const handleFileChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const docType = activeTypeRef.current
        setUploading(docType)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('document_type', docType)

        try {
            await api.post('/documents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            toast.success(`${docType} uploaded successfully!`)
            fetchDocs()
        } catch (err) {
            console.error('Upload failed:', err)
            toast.error(err.response?.data?.error || 'Failed to upload document.')
        } finally {
            setUploading(null)
            e.target.value = '' // Reset input
        }
    }

    // ── Derived Stats ───────────────────────────────────────────────────────────
    const approvedCount = documents.filter(d => d.status === 'approved').length
    const pendingCount = documents.filter(d => d.status === 'pending').length
    const totalIncomplete = REQUIRED_DOCS.length - approvedCount
    const progressPct = Math.round((approvedCount / REQUIRED_DOCS.length) * 100)

    // Map existing docs to the required list
    const docMap = REQUIRED_DOCS.map(type => {
        const existing = documents.find(d => d.document_type === type)
        if (existing) return existing
        return { document_type: type, status: 'not uploaded' }
    })

    return (
        <div className="fade-in space-y-6 max-w-6xl">
            {/* ── Hidden File Input ────────────────────────────────────────────── */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
            />

            {/* ── Page Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Resource Documents</h1>
                    <p className="page-sub mt-1">Submit your requirements for OJT accreditation and compliance.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Compliance Status</p>
                        <p className={`text-sm font-bold ${progressPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {progressPct === 100 ? 'Fully Compliant ✅' : `${approvedCount} of ${REQUIRED_DOCS.length} Approved`}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl border border-slate-700/50 bg-slate-800/40 flex items-center justify-center relative overflow-hidden group">
                        <div
                            className={`absolute bottom-0 left-0 w-full transition-all duration-700 ${progressPct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ height: `${progressPct}%` }}
                        />
                        <span className="relative text-xs font-black text-white">{progressPct}%</span>
                    </div>
                </div>
            </div>

            {/* ── Quick Stats ────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    label="Required"
                    value={REQUIRED_DOCS.length}
                    sub="Total documents needed"
                    icon="📄"
                    accent="bg-slate-800 text-slate-400"
                />
                <MetricCard
                    label="Approved"
                    value={approvedCount}
                    sub="Verified by coordinator"
                    icon="✅"
                    accent="bg-emerald-500/10 text-emerald-400"
                />
                <MetricCard
                    label="Pending"
                    value={pendingCount}
                    sub="Awaiting review"
                    icon="⏳"
                    accent="bg-amber-500/10 text-amber-400"
                />
                <MetricCard
                    label="Remaining"
                    value={totalIncomplete}
                    sub="Still need to be cleared"
                    icon="🚀"
                    accent="bg-indigo-500/10 text-indigo-400"
                />
            </div>

            {/* ── Content Area ──────────────────────────────────────────────────── */}
            <div className="card !p-0 overflow-hidden border-slate-700/30">
                <div className="px-6 py-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-800/20">
                    <div>
                        <h2 className="text-sm font-bold text-white">Requirement Checklist</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">Please upload high-quality PDF or Image scans.</p>
                    </div>
                    <span className="badge badge-active">4 Documents Total</span>
                </div>

                <div className="divide-y divide-slate-800/50">
                    {loading ? (
                        [1, 2, 3, 4].map(i => (
                            <div key={i} className="p-6 animate-pulse flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-800 shadow-inner" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-32 bg-slate-800 rounded" />
                                    <div className="h-3 w-48 bg-slate-900 rounded" />
                                </div>
                                <div className="h-8 w-24 bg-slate-800 rounded-lg" />
                            </div>
                        ))
                    ) : (
                        docMap.map((doc, idx) => (
                            <div key={idx} className="p-6 group hover:bg-slate-800/30 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start md:items-center gap-4 flex-1">
                                        {/* Icon based on status */}
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg
                                  ${doc.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                                doc.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                                    doc.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                                        'bg-slate-800 text-slate-600'}`}>
                                            {doc.status === 'approved' ? <DocCheckIcon /> : <DocIcon />}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                    {doc.document_type}
                                                </h3>
                                                <StatusBadge status={doc.status} />
                                            </div>

                                            <div className="flex items-center gap-4 mt-1.5 min-h-[16px]">
                                                {doc.created_at ? (
                                                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                        <CalendarIcon /> Uploaded on {format(new Date(doc.created_at), 'MMM d, yyyy · hh:mm a')}
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] text-slate-600 italic">No document submitted yet.</p>
                                                )}

                                                {doc.file_url && doc.status !== 'rejected' && (
                                                    <a
                                                        href={`${api.defaults.baseURL.replace('/api', '')}/uploads/${doc.file_url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
                                                    >
                                                        <ViewIcon /> Preview File
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 self-end md:self-auto">
                                        {(doc.status === 'not uploaded' || doc.status === 'rejected') && (
                                            <button
                                                onClick={() => handleFileClick(doc.document_type)}
                                                disabled={uploading === doc.document_type}
                                                className={`btn px-5 py-2 rounded-xl text-xs font-bold transition-all
                                  ${doc.status === 'rejected'
                                                        ? 'bg-red-500 text-white shadow-lg shadow-red-900/30 border-red-400/20'
                                                        : 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 border-indigo-400/20 hover:scale-105'}
                                  disabled:opacity-50 disabled:scale-100 flex items-center gap-2`}
                                            >
                                                {uploading === doc.document_type ? (
                                                    <><span className="spinner w-3 h-3" /> Uploading...</>
                                                ) : (
                                                    <><UploadIcon /> {doc.status === 'rejected' ? 'Re-upload' : 'Upload File'}</>
                                                )}
                                            </button>
                                        )}

                                        {doc.status === 'pending' && (
                                            <button
                                                onClick={() => handleFileClick(doc.document_type)}
                                                disabled={uploading === doc.document_type}
                                                className="btn btn-ghost !text-slate-500 hover:!text-indigo-400 text-xs gap-2"
                                            >
                                                <UploadIcon /> Replace
                                            </button>
                                        )}

                                        {doc.status === 'approved' && (
                                            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400">
                                                <CheckIcon />
                                                <span className="text-[10px] font-black uppercase">Verified</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Rejection Reason */}
                                {doc.status === 'rejected' && doc.rejection_reason && (
                                    <div className="mt-4 p-4 rounded-2xl bg-red-900/20 border border-red-500/20 flex items-start gap-3 fade-in">
                                        <div className="text-red-400 mt-0.5"><WarningIcon /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none">Rejection Reason</p>
                                            <p className="text-xs text-red-300 mt-1 leading-relaxed">
                                                {doc.rejection_reason}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function DocIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> }
function DocCheckIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> }
function UploadIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> }
function ViewIcon() { return <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> }
function CalendarIcon() { return <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> }
function CheckIcon() { return <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> }
function WarningIcon() { return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> }
