import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default leaflet marker icon (vite asset issue)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const IconEdit = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
const IconDelete = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
const IconPlus = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
const IconX = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>

function MapClickHandler({ onPinSet }) {
    useMapEvents({ click(e) { onPinSet(e.latlng.lat, e.latlng.lng) } })
    return null
}

function GeoMapPicker({ latitude, longitude, geoRadius, onChange }) {
    const hasPin = latitude !== 0 && longitude !== 0
    const center = hasPin ? [latitude, longitude] : [14.5995, 120.9842]
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="input-label mb-0">Geofence Location</label>
                {hasPin ? (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-emerald-400 font-medium">📍 {latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
                        <button type="button" onClick={() => onChange(0, 0, geoRadius)} className="text-[10px] text-slate-500 hover:text-red-400 transition underline">Clear</button>
                    </div>
                ) : (
                    <span className="text-[10px] text-slate-500">Click map to drop pin</span>
                )}
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-700 h-56">
                <MapContainer center={center} zoom={hasPin ? 16 : 13} style={{ height: '100%', width: '100%' }} key={`${latitude}-${longitude}`}>
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapClickHandler onPinSet={(lat, lng) => onChange(lat, lng, geoRadius)} />
                    {hasPin && (
                        <>
                            <Marker position={[latitude, longitude]} />
                            <Circle center={[latitude, longitude]} radius={geoRadius || 200} pathOptions={{ color: '#14b8a6', fillColor: '#14b8a6', fillOpacity: 0.12, weight: 2 }} />
                        </>
                    )}
                </MapContainer>
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="input-label mb-0">Allowed Radius</label>
                    <span className="text-sm font-bold text-teal-400">{geoRadius || 200}m</span>
                </div>
                <input type="range" min={50} max={1000} step={50} value={geoRadius || 200} onChange={e => onChange(latitude, longitude, Number(e.target.value))} className="w-full accent-teal-500" />
                <div className="flex justify-between text-[10px] text-slate-600"><span>50m</span><span>500m</span><span>1000m</span></div>
            </div>
        </div>
    )
}

export default function CoordinatorCompanies() {
    const [companies, setCompanies] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [showCreate, setShowCreate] = useState(false)
    const [editCompany, setEditCompany] = useState(null)
    const [deleteId, setDeleteId] = useState(null)

    const initialForm = { name: '', address: '', contact_person: '', contact_email: '', contact_phone: '', status: 'active', latitude: 0, longitude: 0, geo_radius: 200 }
    const [formData, setFormData] = useState(initialForm)

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await api.get('/companies')
            setCompanies(res.data?.companies || [])
        } catch (err) {
            toast.error('Failed to load companies')
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => { fetchData() }, [])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleGeoChange = (lat, lng, radius) => {
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng, geo_radius: radius }))
    }

    const openCreate = () => { setFormData(initialForm); setEditCompany(null); setShowCreate(true) }
    const openEdit = (company) => {
        setFormData({
            name: company.name, address: company.address || '', contact_person: company.contact_person || '',
            contact_email: company.contact_email || '', contact_phone: company.contact_phone || '', status: company.status,
            latitude: company.latitude || 0, longitude: company.longitude || 0, geo_radius: company.geo_radius || 200,
        })
        setEditCompany(company)
        setShowCreate(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault(); setSubmitting(true)
        try {
            if (editCompany) { await api.patch(`/companies/${editCompany.id}`, formData); toast.success('Company updated successfully') }
            else { await api.post('/companies', formData); toast.success('Company created successfully') }
            setShowCreate(false); fetchData()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Operation failed')
        } finally { setSubmitting(false) }
    }

    const confirmDelete = async () => {
        if (!deleteId) return
        try { await api.delete(`/companies/${deleteId}`); toast.success('Company deleted'); setDeleteId(null); fetchData() }
        catch { toast.error('Failed to delete company') }
    }

    return (
        <div className="fade-in max-w-7xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Partner Companies</h1>
                    <p className="page-sub mt-1">Manage corporate partners for OJT deployments.</p>
                </div>
                <button onClick={openCreate} className="btn bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/30 font-medium whitespace-nowrap">
                    <IconPlus /> Add Company
                </button>
            </div>

            <div className="card !p-0 overflow-hidden border border-slate-800">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr>
                                <th>Name</th><th>Contact Information</th><th>Geofence</th><th>Status</th><th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-10"><div className="spinner w-8 h-8 mx-auto" /></td></tr>
                            ) : companies.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-12 text-slate-500"><p className="text-4xl mb-3">🏢</p><p className="text-sm font-medium">No partner companies found.</p></td></tr>
                            ) : companies.map(c => (
                                <tr key={c.id} className="hover:bg-slate-800/40 transition">
                                    <td>
                                        <p className="text-sm font-semibold text-white">{c.name}</p>
                                        <p className="text-xs text-slate-500 truncate max-w-xs">{c.address}</p>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-0.5">
                                            <p className="text-xs text-slate-300 font-medium">{c.contact_person}</p>
                                            <p className="text-[10px] text-slate-500">{c.contact_email} | {c.contact_phone}</p>
                                        </div>
                                    </td>
                                    <td>
                                        {(c.latitude && c.longitude) ? (
                                            <span className="text-[10px] font-bold text-emerald-400">📍 {c.geo_radius}m</span>
                                        ) : (
                                            <span className="text-xs text-slate-600">—</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>{c.status}</span>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <button onClick={() => openEdit(c)} className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"><IconEdit /></button>
                                            <button onClick={() => setDeleteId(c.id)} className="w-7 h-7 flex items-center justify-center rounded-md bg-red-500/10 text-red-400 hover:text-white hover:bg-red-500 transition"><IconDelete /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showCreate && createPortal(
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => setShowCreate(false)} />
                    <div className="flex min-h-full items-center justify-center p-4">
                        <form onSubmit={handleSubmit} className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 my-4">
                            <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                                <h2 className="text-lg font-bold text-white">{editCompany ? 'Edit Company' : 'Add New Company'}</h2>
                                <button type="button" onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white transition"><IconX /></button>
                            </div>
                            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                                <div className="input-group">
                                    <label className="input-label">Company Name</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g. Acme Corp" className="input" />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Address</label>
                                    <textarea name="address" value={formData.address} onChange={handleInputChange} placeholder="Full office address" className="input min-h-[80px]" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="input-group">
                                        <label className="input-label">Contact Person</label>
                                        <input type="text" name="contact_person" value={formData.contact_person} onChange={handleInputChange} placeholder="Name of contact" className="input" />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Phone Number</label>
                                        <input type="text" name="contact_phone" value={formData.contact_phone} onChange={handleInputChange} placeholder="0917-000-0000" className="input" />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Email Address</label>
                                    <input type="email" name="contact_email" value={formData.contact_email} onChange={handleInputChange} placeholder="hr@company.com" className="input" />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Status</label>
                                    <select name="status" value={formData.status} onChange={handleInputChange} required className="input">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="border-t border-slate-800 pt-4">
                                    <p className="text-xs text-slate-500 mb-3">📍 <span className="font-semibold text-slate-400">Geofencing</span> — Optional. Drop a pin to set the allowed clock-in zone for onsite students.</p>
                                    <GeoMapPicker latitude={formData.latitude} longitude={formData.longitude} geoRadius={formData.geo_radius} onChange={handleGeoChange} />
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost text-sm">Cancel</button>
                                <button type="submit" disabled={submitting} className="btn bg-orange-600 hover:bg-orange-500 text-white text-sm">
                                    {submitting ? <span className="spinner w-4 h-4 mr-2" /> : null}
                                    {editCompany ? 'Save Changes' : 'Create Company'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {deleteId && createPortal(
                <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => setDeleteId(null)} />
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200 my-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4"><IconDelete /></div>
                            <h3 className="text-xl font-bold text-white mb-2">Delete Company?</h3>
                            <p className="text-sm text-slate-400 mb-6">This will permanently remove the company record. Active student assignments will still retain the company name as a string.</p>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setDeleteId(null)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                                <button onClick={confirmDelete} className="btn bg-red-600 hover:bg-red-500 text-white flex-1 justify-center">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            , document.body)}
        </div>
    )
}
