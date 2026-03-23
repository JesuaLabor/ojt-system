import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { format } from 'date-fns'

const IconEdit = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
const IconDelete = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
const IconPlus = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>

export default function CoordinatorAssignments() {
    const [assignments, setAssignments] = useState([])
    const [options, setOptions] = useState({ students: [], supervisors: [] })
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Form states
    const [showCreate, setShowCreate] = useState(false)
    const [editAssignment, setEditAssignment] = useState(null)
    const [deleteId, setDeleteId] = useState(null)

    const initialForm = {
        student_id: '',
        supervisor_id: '',
        company_name: '',
        required_hours: 600,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(new Date().setMonth(new Date().getMonth() + 4)), 'yyyy-MM-dd'),
        status: 'active'
    }
    const [formData, setFormData] = useState(initialForm)

    const fetchData = async () => {
        setLoading(true)
        try {
            const [assRes, optRes] = await Promise.all([
                api.get('/assignments/'),
                api.get('/assignments/options')
            ])
            setAssignments(assRes.data?.assignments || [])
            setOptions(optRes.data || { students: [], supervisors: [] })
        } catch (err) {
            console.error(err)
            toast.error('Failed to load assignments data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ 
            ...prev, 
            [name]: name === 'student_id' || name === 'supervisor_id' || name === 'required_hours' ? Number(value) : value 
        }))
    }

    const openCreate = () => {
        setFormData(initialForm)
        setEditAssignment(null)
        setShowCreate(true)
    }

    const openEdit = (assignment) => {
        setFormData({
            student_id: assignment.student_id,
            supervisor_id: assignment.supervisor_id,
            company_name: assignment.company_name,
            required_hours: assignment.required_hours,
            start_date: assignment.start_date.split('T')[0],
            end_date: assignment.end_date.split('T')[0],
            status: assignment.status
        })
        setEditAssignment(assignment)
        setShowCreate(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            if (editAssignment) {
                await api.patch(`/assignments/${editAssignment.id}`, formData)
                toast.success('Assignment updated successfully')
            } else {
                await api.post('/assignments/', formData)
                toast.success('Assignment created successfully')
            }
            setShowCreate(false)
            fetchData() 
        } catch (err) {
            toast.error(err.response?.data?.error || 'Operation failed')
        } finally {
            setSubmitting(false)
        }
    }

    const confirmDelete = async () => {
        if (!deleteId) return
        try {
            await api.delete(`/assignments/${deleteId}`)
            toast.success('Assignment deleted')
            setDeleteId(null)
            fetchData()
        } catch (err) {
            toast.error('Failed to delete assignment')
        }
    }

    return (
        <div className="fade-in max-w-7xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">OJT Assignments</h1>
                    <p className="page-sub mt-1">Manage corporate deployments and supervisor delegations.</p>
                </div>
                <button 
                    onClick={openCreate}
                    className="btn bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/30 font-medium whitespace-nowrap"
                >
                    <IconPlus /> New Assignment
                </button>
            </div>

            {/* Assignments Table */}
            <div className="card !p-0 overflow-hidden border border-slate-800">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Company</th>
                                <th>Supervisor</th>
                                <th>Duration / Hours</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-10">
                                        <div className="spinner w-8 h-8 mx-auto" />
                                    </td>
                                </tr>
                            ) : assignments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-12 text-slate-500">
                                        <p className="text-4xl mb-3">🏢</p>
                                        <p className="text-sm font-medium">No active assignments found.</p>
                                    </td>
                                </tr>
                            ) : (
                                assignments.map(a => (
                                    <tr key={a.id} className="hover:bg-slate-800/40 transition">
                                        <td>
                                            <p className="text-sm font-semibold text-white">{a.student_name}</p>
                                        </td>
                                        <td>
                                            <p className="text-sm text-slate-300">{a.company_name}</p>
                                        </td>
                                        <td>
                                            <p className="text-sm text-slate-400">{a.supervisor_name || <span className="italic text-slate-600">Unassigned</span>}</p>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-xs text-slate-300 font-medium">{a.required_hours}h Required</p>
                                                <p className="text-[10px] text-slate-500">{a.start_date || 'N/A'} - {a.end_date || 'N/A'}</p>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${a.status === 'active' ? 'bg-orange-500/15 text-orange-400' : 'bg-slate-500/15 text-slate-400'}`}>
                                                {a.status}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                <button 
                                                    onClick={() => openEdit(a)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                                                    title="Edit Assignment"
                                                >
                                                    <IconEdit />
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteId(a.id)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-md bg-red-500/10 text-red-400 hover:text-white hover:bg-red-500 transition"
                                                    title="Delete Assignment"
                                                >
                                                    <IconDelete />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => setShowCreate(false)} />
                    <form onSubmit={handleSubmit} className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <h2 className="text-lg font-bold text-white">{editAssignment ? 'Edit Assignment' : 'Create New Assignment'}</h2>
                            <button type="button" onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white transition"><IconX /></button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="input-group">
                                <label className="input-label">Student</label>
                                <select 
                                    name="student_id" 
                                    value={formData.student_id} 
                                    onChange={handleInputChange} 
                                    required 
                                    disabled={!!editAssignment} // Can't swap student easily once created, better to recreate
                                    className={`input ${editAssignment ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <option value="" disabled>Select Student</option>
                                    {editAssignment && (
                                        <option value={editAssignment.student_id}>{editAssignment.student_name}</option>
                                    )}
                                    {options.students.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Company Name</label>
                                <input 
                                    type="text" 
                                    name="company_name" 
                                    value={formData.company_name} 
                                    onChange={handleInputChange} 
                                    required 
                                    placeholder="e.g. Acme Corp" 
                                    className="input" 
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Assigned Supervisor</label>
                                <select 
                                    name="supervisor_id" 
                                    value={formData.supervisor_id} 
                                    onChange={handleInputChange} 
                                    required
                                    className="input"
                                >
                                    <option value="" disabled>Select Supervisor</option>
                                    {options.supervisors.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Required Hours</label>
                                <input 
                                    type="number" 
                                    name="required_hours" 
                                    value={formData.required_hours} 
                                    onChange={handleInputChange} 
                                    required
                                    min="1"
                                    className="input" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="input-group">
                                    <label className="input-label">Start Date</label>
                                    <input 
                                        type="date" 
                                        name="start_date" 
                                        value={formData.start_date} 
                                        onChange={handleInputChange} 
                                        required 
                                        className="input" 
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">End Date</label>
                                    <input 
                                        type="date" 
                                        name="end_date" 
                                        value={formData.end_date} 
                                        onChange={handleInputChange} 
                                        required 
                                        className="input" 
                                    />
                                </div>
                            </div>
                            
                            {editAssignment && (
                                <div className="input-group pt-2">
                                    <label className="input-label">Status</label>
                                    <select 
                                        name="status" 
                                        value={formData.status} 
                                        onChange={handleInputChange} 
                                        required
                                        className="input"
                                    >
                                        <option value="active">Active</option>
                                        <option value="withdrawn">Withdrawn</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost text-sm">Cancel</button>
                            <button type="submit" disabled={submitting} className="btn bg-orange-600 hover:bg-orange-500 text-white text-sm">
                                {submitting ? <span className="spinner w-4 h-4 mr-2" /> : null}
                                {editAssignment ? 'Save Changes' : 'Create Assignment'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {deleteId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => setDeleteId(null)} />
                    <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                            <IconDelete className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Delete Assignment?</h3>
                        <p className="text-sm text-slate-400 mb-6">This action cannot be undone. This records the operational allocation but child logs/evaluations may be orphaned.</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setDeleteId(null)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                            <button onClick={confirmDelete} className="btn bg-red-600 hover:bg-red-500 text-white flex-1 justify-center">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
