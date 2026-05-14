import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import ConfirmModal from '../../components/ui/ConfirmModal'

export default function Announcements() {
    const { user } = useAuthStore()
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState({ title: '', content: '', target: 'all' })

    const canPost = ['coordinator', 'supervisor', 'admin', 'faculty'].includes(user?.role)

    const fetchAnnouncements = async () => {
        setLoading(true)
        try {
            const res = await api.get('/announcements/')
            setAnnouncements(res.data.announcements || [])
        } catch (err) {
            toast.error('Failed to load announcements')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAnnouncements() }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.title || !form.content) return toast.error("Title and content are required")

        setSubmitting(true)
        try {
            await api.post('/announcements/', form)
            toast.success('Announcement posted!')
            setShowModal(false)
            setForm({ title: '', content: '', target: 'all' })
            fetchAnnouncements()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to post announcement')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return
        try {
            await api.delete(`/announcements/${id}`)
            toast.success("Announcement deleted")
            fetchAnnouncements()
        } catch (err) {
            toast.error("Failed to delete announcement")
        }
    }

    return (
        <div className="fade-in space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Announcements</h1>
                    <p className="page-sub">Stay updated with the latest news and schedules.</p>
                </div>
                {canPost && (
                    <button onClick={() => setShowModal(true)} className="btn btn-primary">
                        + New Announcement
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center text-slate-500 py-10 animate-pulse">Loading announcements...</div>
                ) : announcements.length === 0 ? (
                    <div className="card text-center py-16 text-slate-500">
                        <p className="text-4xl mb-3">📢</p>
                        <p>No announcements yet.</p>
                    </div>
                ) : (
                    announcements.map(a => (
                        <div key={a.ID} className="card p-0 overflow-hidden relative group">
                            {/* Header */}
                            <div className="p-5 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {a.author?.profile_photo ? (
                                        <img src={a.author.profile_photo} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">
                                            {a.author?.name?.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-white font-bold">{a.author?.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                            <span className="capitalize">{a.author?.role}</span>
                                            <span>•</span>
                                            <span>{format(new Date(a.CreatedAt), 'MMMM d, yyyy h:mm a')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 rounded bg-slate-800/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider border border-slate-700/50">
                                        To: {a.target}
                                    </span>
                                    {(user.role === 'admin' || user.ID === a.author_id) && (
                                        <button onClick={() => handleDelete(a.ID)} className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="p-6">
                                <h2 className="text-xl font-bold text-white mb-3">{a.title}</h2>
                                <div className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
                                    {a.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                📢 Post Announcement
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Target Audience</label>
                                    <select value={form.target} onChange={e => setForm({...form, target: e.target.value})} className="input w-full">
                                        <option value="all">Everyone (Students & Staff)</option>
                                        <option value="students">Students Only</option>
                                        <option value="supervisors">Supervisors Only</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Title</label>
                                    <input type="text" required placeholder="e.g., Upcoming Seminar on UI/UX" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input w-full" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Content</label>
                                    <textarea required rows="5" placeholder="Write your announcement here..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="input w-full py-2" />
                                </div>
                            </div>
                            <div className="p-5 bg-slate-800/50 flex justify-end gap-3 border-t border-slate-800">
                                <button type="button" onClick={() => setShowModal(false)} className="btn bg-transparent hover:bg-slate-800 text-slate-300">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className="btn btn-primary">
                                    {submitting ? 'Posting...' : 'Post Announcement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
