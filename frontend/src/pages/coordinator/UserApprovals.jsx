import { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function UserApprovals() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('pending') // pending, active, rejected

    const fetchUsers = async (statusArg) => {
        setLoading(true)
        try {
            const res = await api.get(`/coordinator/users/pending?status=${statusArg || activeTab}`)
            setUsers(res.data?.users || [])
        } catch (err) {
            toast.error('Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [activeTab])

    const handleAction = async (id, action) => {
        console.log('handleAction trigger:', { id, action });
        try {
            if (action === 'approve') {
                console.log('Approving user:', id);
                await api.patch(`/coordinator/users/${id}/approve`)
                toast.success('User approved successfully!')
            } else {
                console.log('Sending rejection PATCH for user:', id);
                await api.patch(`/coordinator/users/${id}/reject`)
                toast.success('User application has been rejected.')
            }
            console.log('Action complete, refreshing list...');
            fetchUsers()
        } catch (err) {
            console.error('Action failed:', err);
            toast.error('Action failed. Please try again.')
        }
    }

    const getRoleIcon = (role) => {
        switch (role) {
            case 'student': return '🎓'
            case 'supervisor': return '🏢'
            case 'faculty': return '🏫'
            case 'coordinator': return '🛡️'
            default: return '👤'
        }
    }

    const tabs = [
        { id: 'pending', label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-400/10' },
        { id: 'active', label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { id: 'rejected', label: 'Rejected', color: 'text-red-400', bg: 'bg-red-400/10' },
    ]

    return (
        <div className="fade-in max-w-5xl space-y-6">
            <div className="page-header">
                <h1 className="page-title">Registration Management</h1>
                <p className="page-sub mt-1">Review, approve, or manage account applications.</p>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeTab === tab.id
                            ? `${tab.color} ${tab.bg} border-current ring-2 ring-current ring-opacity-20`
                            : 'text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="spinner" />
                </div>
            ) : users.length === 0 ? (
                <div className="card text-center py-16 border-dashed opacity-60">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
                        <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-white font-bold text-lg">No {activeTab} users found</p>
                    <p className="text-slate-500 text-sm mt-1">The queue for this status is currently empty.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map(u => (
                        <div key={u.id} className="card bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all p-5 shadow-xl group">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-xl shadow-inner border border-slate-700/50">
                                        {getRoleIcon(u.role)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-white font-bold leading-none truncate">{u.name}</h3>
                                        <p className="text-[10px] text-slate-500 mt-2 truncate">{u.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-800/50 pt-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                            {u.role}
                                        </span>
                                        <span className="text-[9px] text-slate-600 font-medium">Joined {u.created_at}</span>
                                    </div>

                                    {activeTab === 'pending' ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAction(u.id, 'approve')}
                                                className="w-10 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/40 transition-all active:scale-95"
                                                title="Approve"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleAction(u.id, 'reject')}
                                                className="w-10 h-10 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/10 transition-all active:scale-95"
                                                title="Reject"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center">
                                            {activeTab === 'active' ? (
                                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                                    ACTIVE ACC.
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-3 py-1 rounded-full border border-red-400/20">
                                                    REJECTED
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
