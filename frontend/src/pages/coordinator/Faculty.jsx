import { useEffect, useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function CoordinatorFaculty() {
    const [faculty, setFaculty] = useState([])
    const [departments, setDepartments] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [editingFaculty, setEditingFaculty] = useState(null)
    const [selectedDept, setSelectedDept] = useState('')
    const [updating, setUpdating] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const [facRes, deptRes] = await Promise.all([
                api.get('/coordinator/faculty'),
                api.get('/departments')
            ])
            setFaculty(facRes.data?.faculty || [])
            setDepartments(deptRes.data?.departments || [])
        } catch (err) {
            toast.error('Failed to load faculty data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleUpdateDept = async () => {
        if (!editingFaculty) return
        setUpdating(true)
        try {
            await api.patch(`/coordinator/users/${editingFaculty.id || editingFaculty.ID}`, {
                department_id: selectedDept ? Number(selectedDept) : null
            })
            toast.success('Department updated successfully')
            setEditingFaculty(null)
            fetchData()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Update failed')
        } finally {
            setUpdating(false)
        }
    }

    const filteredFaculty = faculty.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.department?.name && f.department.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className="fade-in space-y-6 max-w-6xl pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Manage Faculty</h1>
                    <p className="page-sub mt-1">Directory of all faculty advisers and department monitoring staff.</p>
                </div>

                <div className="relative min-w-[320px]">
                    <input
                        type="text"
                        placeholder="Search by name, email, department..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input w-full pl-10"
                    />
                    <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6M9 13a4 4 0 110-8 4 4 0 010 8zM15 15a6 6 0 11-12 0 6 6 0 0112 0z" />
                    </svg>
                </div>
            </div>

            {loading ? (
                <div className="card py-20 flex justify-center"><div className="spinner" /></div>
            ) : faculty.length === 0 ? (
                <div className="card text-center py-20">
                    <p className="text-4xl mb-3">👨‍🏫</p>
                    <p className="text-lg font-semibold text-white">No faculty members found</p>
                    <p className="text-sm text-slate-500 mt-1">Once faculty accounts are approved, they will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFaculty.map(f => (
                        <div key={f.id || f.ID} className="card bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all p-5 flex flex-col gap-4 group">
                            <div className="flex items-center gap-4">
                                {f.profile_photo ? (
                                    <img src={f.profile_photo} alt="Avatar" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-700/50" />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-lg font-bold">{f.name?.charAt(0).toUpperCase()}</span>
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-white font-bold truncate">{f.name}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{f.email}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-800/50">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Assignment</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-300 font-medium">
                                        {f.department?.name || <span className="text-slate-600 italic">No Department</span>}
                                    </p>
                                    <button
                                        onClick={() => {
                                            setEditingFaculty(f)
                                            setSelectedDept(f.department_id || '')
                                        }}
                                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-auto pt-2">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${f.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                    {f.status.toUpperCase()}
                                </span>
                                <span className="text-[9px] text-slate-600 font-medium">Joined {new Date(f.CreatedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editingFaculty && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-white">Assign Department</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Faculty: {editingFaculty.name}</p>
                            </div>
                            <button onClick={() => setEditingFaculty(null)} className="text-slate-500 hover:text-white transition">✕</button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="input-group">
                                <label className="input-label">Select Department</label>
                                <select
                                    value={selectedDept}
                                    onChange={e => setSelectedDept(e.target.value)}
                                    className="input"
                                >
                                    <option value="">— Unassigned —</option>
                                    {departments.map(d => (
                                        <option key={d.id || d.ID} value={d.id || d.ID}>{d.name}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-500 mt-2 italic">
                                    Note: This will determine which students this faculty member can monitor.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setEditingFaculty(null)} className="btn btn-ghost text-sm">Cancel</button>
                            <button
                                onClick={handleUpdateDept}
                                disabled={updating}
                                className="btn btn-primary text-sm"
                            >
                                {updating ? <span className="spinner w-4 h-4 mr-2" /> : null}
                                Update Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
