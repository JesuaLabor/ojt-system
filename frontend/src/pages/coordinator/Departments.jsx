import { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'

// ── Icons ──────────────────────────────────────────────────────────────────────
function IconBuilding({ className }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
    )
}
function IconUsers({ className }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    )
}
function IconPlus({ className }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    )
}
function IconX({ className }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    )
}

// ── Department Form Modal ──────────────────────────────────────────────────────
function DeptModal({ dept, onClose, onSaved }) {
    const isEdit = !!dept
    const [form, setForm] = useState({
        name: dept?.name || '',
        code: dept?.code || '',
        description: dept?.description || '',
    })
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (isEdit) {
                // dept.id (new backend) or dept.ID (gorm default uppercase) — handle both
                const deptId = dept.id ?? dept.ID
                await api.patch(`/departments/${deptId}`, form)
                toast.success('Department updated!')
            } else {
                await api.post('/departments/', form)
                toast.success('Department created!')
            }
            onSaved()
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save department')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-white font-bold text-lg">{isEdit ? 'Edit Department' : 'New Department'}</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                        <IconX className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="input-group">
                        <label className="input-label">Department Name</label>
                        <input
                            type="text" required
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="input"
                            placeholder="e.g. IT Department"
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Department Code</label>
                        <input
                            type="text" required
                            value={form.code}
                            onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                            className="input"
                            placeholder="e.g. IT, BSBA, CRIM"
                            maxLength={10}
                        />
                        <p className="text-xs text-slate-500 mt-1">Short unique code for the department.</p>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Description <span className="text-slate-600">(optional)</span></label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            className="input min-h-[80px] resize-none"
                            placeholder="Brief description of this department..."
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
                        <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
                            {saving ? <><span className="spinner" /> Saving...</> : isEdit ? 'Save Changes' : 'Create Department'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ── Members Panel Modal ────────────────────────────────────────────────────────
function MembersPanel({ dept, onClose }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const deptId = dept.id ?? dept.ID
        api.get(`/departments/${deptId}/members`)
            .then(res => setData(res.data))
            .catch(() => toast.error('Failed to load members'))
            .finally(() => setLoading(false))
    }, [dept.id, dept.ID])

    const RoleGroup = ({ title, emoji, members }) => (
        members.length === 0 ? null : (
            <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{emoji} {title} ({members.length})</p>
                <div className="space-y-2">
                    {members.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-bold">{m.name?.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm text-white font-medium truncate">{m.name}</p>
                                <p className="text-xs text-slate-500 truncate">{m.email}</p>
                            </div>
                            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                {m.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl fade-in max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between mb-5 flex-shrink-0">
                    <div>
                        <h2 className="text-white font-bold text-lg">{dept.name}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Department Members</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                        <IconX className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex justify-center py-10"><div className="spinner" /></div>
                    ) : !data ? (
                        <p className="text-slate-500 text-center py-8">Failed to load members.</p>
                    ) : data.members.total === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-4xl mb-2">🏫</p>
                            <p className="text-white font-semibold">No members yet</p>
                            <p className="text-slate-500 text-sm mt-1">Users can be assigned to this department during registration or approval.</p>
                        </div>
                    ) : (
                        <>
                            <RoleGroup title="Students" emoji="🎓" members={data.members.students} />
                            <RoleGroup title="Supervisors" emoji="🏢" members={data.members.supervisors} />
                            <RoleGroup title="Faculty" emoji="👨‍🏫" members={data.members.faculty} />
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Main Departments Page ──────────────────────────────────────────────────────
export default function Departments() {
    const [departments, setDepartments] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(null) // null | { type: 'create' | 'edit' | 'members', dept?: {} }

    const fetchDepts = async () => {
        setLoading(true)
        try {
            const res = await api.get('/departments/')
            setDepartments(res.data?.departments || [])
        } catch {
            toast.error('Failed to load departments')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchDepts() }, [])

    const handleDelete = async (dept) => {
        if (!window.confirm(`Delete "${dept.name}"? This action cannot be undone.`)) return
        try {
            const deptId = dept.id ?? dept.ID
            await api.delete(`/departments/${deptId}`)
            toast.success('Department deleted')
            fetchDepts()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete department')
        }
    }

    const ROLE_COLORS = ['bg-indigo-500/15 text-indigo-400', 'bg-teal-500/15 text-teal-400', 'bg-violet-500/15 text-violet-400', 'bg-rose-500/15 text-rose-400', 'bg-amber-500/15 text-amber-400']

    return (
        <div className="fade-in space-y-6 max-w-5xl pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Departments</h1>
                    <p className="page-sub mt-1">Manage academic departments and their members.</p>
                </div>
                <button
                    onClick={() => setModal({ type: 'create' })}
                    className="btn btn-primary gap-2 self-start sm:self-auto"
                >
                    <IconPlus className="w-4 h-4" />
                    New Department
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner" /></div>
            ) : departments.length === 0 ? (
                <div className="card text-center py-20 border-dashed opacity-70">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
                        <IconBuilding className="w-7 h-7 text-slate-600" />
                    </div>
                    <p className="text-white font-bold text-lg">No departments yet</p>
                    <p className="text-slate-500 text-sm mt-1">Create your first department to start organizing users.</p>
                    <button onClick={() => setModal({ type: 'create' })} className="btn btn-primary mt-5 mx-auto gap-2">
                        <IconPlus className="w-4 h-4" /> Create Department
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departments.map((dept, i) => (
                        <div
                            key={dept.id}
                            className="card bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all p-5 flex flex-col gap-4 group"
                        >
                            {/* Top row */}
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm ${ROLE_COLORS[i % ROLE_COLORS.length]}`}>
                                    {dept.code}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-white font-bold text-sm leading-snug truncate">{dept.name}</p>
                                    {dept.description && (
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{dept.description}</p>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 border-t border-slate-800 pt-4">
                                <button
                                    onClick={() => setModal({ type: 'members', dept })}
                                    className="btn btn-sm btn-ghost gap-1.5 flex-1 justify-center"
                                >
                                    <IconUsers className="w-3.5 h-3.5" />
                                    Members
                                </button>
                                <button
                                    onClick={() => setModal({ type: 'edit', dept })}
                                    className="btn btn-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 flex-1 justify-center"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(dept)}
                                    className="btn btn-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {modal?.type === 'create' && (
                <DeptModal onClose={() => setModal(null)} onSaved={fetchDepts} />
            )}
            {modal?.type === 'edit' && (
                <DeptModal dept={modal.dept} onClose={() => setModal(null)} onSaved={fetchDepts} />
            )}
            {modal?.type === 'members' && (
                <MembersPanel dept={modal.dept} onClose={() => setModal(null)} />
            )}
        </div>
    )
}
