import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'

const IconCheck = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
const IconX = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
const IconLink = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>

function StatusBadge({ status }) {
    const map = {
        'pending': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
        'approved': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        'rejected': 'bg-red-500/15 text-red-400 border-red-500/20',
    }

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${map[status] || 'bg-slate-800 text-slate-400'}`}>
            {status}
        </span>
    )
}

export default function CoordinatorDocuments() {
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('pending') // pending, approved, rejected, all
    const [processing, setProcessing] = useState(null) // ID of doc being processed

    // Reject Modal state
    const [rejectDoc, setRejectDoc] = useState(null)
    const [rejectReason, setRejectReason] = useState('')

    const fetchDocuments = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/coordinator/documents${filter !== 'all' ? `?status=${filter}` : ''}`)
            setDocuments(res.data?.documents || [])
        } catch (err) {
            console.error(err)
            toast.error('Failed to load documents')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDocuments()
    }, [filter])

    const handleApprove = async (id) => {
        setProcessing(id)
        try {
            await api.patch(`/coordinator/documents/${id}/approve`)
            toast.success('Document approved')
            fetchDocuments()
        } catch (err) {
            toast.error('Failed to approve document')
        } finally {
            setProcessing(null)
        }
    }

    const openRejectModal = (doc) => {
        setRejectDoc(doc)
        setRejectReason('')
    }

    const handleReject = async (e) => {
        e.preventDefault()
        if (!rejectReason.trim()) return toast.error('Please provide a reason')
        
        setProcessing(rejectDoc.id)
        try {
            await api.patch(`/coordinator/documents/${rejectDoc.id}/reject`, { reason: rejectReason })
            toast.success('Document rejected')
            setRejectDoc(null)
            fetchDocuments()
        } catch (err) {
            toast.error('Failed to reject document')
        } finally {
            setProcessing(null)
        }
    }

    return (
        <div className="fade-in max-w-7xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Document Approvals</h1>
                    <p className="page-sub mt-1">Review student requirements and compliance documents.</p>
                </div>

                <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700/50 w-full sm:w-auto overflow-x-auto">
                    {['pending', 'approved', 'rejected', 'all'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider capitalize whitespace-nowrap transition-colors ${
                                filter === f ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card !p-0 overflow-hidden border border-slate-800">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr>
                                <th className="table-head">Student</th>
                                <th className="table-head">Document Type</th>
                                <th className="table-head">File</th>
                                <th className="table-head">Status</th>
                                <th className="table-head">Date Uploaded</th>
                                <th className="table-head text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="table-cell text-center py-10">
                                        <div className="spinner w-8 h-8 mx-auto" />
                                    </td>
                                </tr>
                            ) : documents.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="table-cell text-center py-12 text-slate-500">
                                        <p className="text-4xl mb-3">📄</p>
                                        <p className="text-sm font-medium">No {filter !== 'all' ? filter : ''} documents found.</p>
                                    </td>
                                </tr>
                            ) : (
                                documents.map(d => (
                                    <tr key={d.id} className="table-row group">
                                        <td className="table-cell">
                                            <p className="text-sm font-bold text-white whitespace-nowrap">{d.student_name}</p>
                                        </td>
                                        <td className="table-cell">
                                            <p className="text-sm font-medium text-slate-300">{d.document_type}</p>
                                            {d.status === 'rejected' && d.rejection_reason && (
                                                <p className="text-[10px] text-red-400 mt-1 max-w-[200px] truncate" title={d.rejection_reason}>
                                                    Reason: {d.rejection_reason}
                                                </p>
                                            )}
                                        </td>
                                        <td className="table-cell">
                                            <a 
                                                href={`${api.defaults.baseURL.replace('/api', '')}/uploads/${d.file_url}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-lg transition"
                                            >
                                                <IconLink /> View File
                                            </a>
                                        </td>
                                        <td className="table-cell whitespace-nowrap">
                                            <StatusBadge status={d.status} />
                                        </td>
                                        <td className="table-cell whitespace-nowrap">
                                            <p className="text-xs text-slate-400">
                                                {format(new Date(d.created_at), 'MMM d, yyyy')}
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">
                                                {format(new Date(d.created_at), 'h:mm a')}
                                            </p>
                                        </td>
                                        <td className="table-cell text-right">
                                            {d.status === 'pending' ? (
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openRejectModal(d)}
                                                        disabled={processing === d.id}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                                                        title="Reject"
                                                    >
                                                        <IconX />
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(d.id)}
                                                        disabled={processing === d.id}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition disabled:opacity-50"
                                                        title="Approve"
                                                    >
                                                        {processing === d.id ? <span className="spinner w-4 h-4 border-emerald-400" /> : <IconCheck />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-slate-500 italic">No actions available</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reject Reason Modal */}
            {rejectDoc && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => setRejectDoc(null)} />
                    <form onSubmit={handleReject} className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Reject Document</h3>
                            <button type="button" onClick={() => setRejectDoc(null)} className="text-slate-500 hover:text-white"><IconX /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-300">Student: <span className="text-white">{rejectDoc.student_name}</span></p>
                                <p className="text-sm font-semibold text-slate-300">Document: <span className="text-white">{rejectDoc.document_type}</span></p>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Reason for Rejection <span className="text-red-500">*</span></label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="e.g. Scanned image is too blurry..."
                                    required
                                    className="input min-h-[100px] resize-none"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-900/80 border-t border-slate-800 flex gap-3 justify-end">
                            <button type="button" onClick={() => setRejectDoc(null)} className="btn btn-ghost text-sm">Cancel</button>
                            <button type="submit" disabled={processing === rejectDoc.id} className="btn bg-red-600 hover:bg-red-500 text-white text-sm">
                                {processing === rejectDoc.id ? <span className="spinner w-4 h-4 mr-2" /> : null}
                                Confirm Rejection
                            </button>
                        </div>
                    </form>
                </div>
            , document.body)}
        </div>
    )
}
