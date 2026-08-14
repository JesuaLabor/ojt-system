import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default leaflet marker icon (vite asset issue)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function getDistanceMetres(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c)
}

export default function CoordinatorTimeLogs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStudentId = searchParams.get('student')

  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(initialStudentId || '')
  
  const [logs, setLogs] = useState([])
  const [summary, setSummary] = useState(null)
  const [company, setCompany] = useState(null)
  const [loadingLogs, setLoadingLogs] = useState(false)
  
  const [rejectingLogId, setRejectingLogId] = useState(null)
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [previewPhoto, setPreviewPhoto] = useState(null)
  const [previewMap, setPreviewMap] = useState(null)

  // Load students for the dropdown using coordinator endpoint
  useEffect(() => {
    api.get('/coordinator/students')
      .then(res => {
        setStudents(res.data?.students || [])
        // optionally select first student with pending logs if none selected
        if (!initialStudentId && res.data?.students?.length > 0) {
          const pendingStd = res.data.students.find(s => s.pending_logs > 0)
          setSelectedStudent(pendingStd ? pendingStd.student_id : res.data.students[0].student_id)
        }
      })
      .catch(console.error)
  }, [initialStudentId])

  // Load logs when student changes
  useEffect(() => {
    if (!selectedStudent) return
    setSearchParams({ student: selectedStudent })
    
    setLoadingLogs(true)
    api.get(`/timelogs/${selectedStudent}`)
      .then(res => {
        setLogs(res.data?.logs || [])
        setSummary(res.data?.summary || null)
        setCompany(res.data?.company || null)
      })
      .catch(err => {
        console.error(err)
        toast.error('Failed to load time logs.')
      })
      .finally(() => setLoadingLogs(false))
  }, [selectedStudent, setSearchParams])

  const handleApprove = async (logId) => {
    try {
      await api.patch(`/timelogs/${logId}/approve`)
      toast.success('Time log approved')
      setLogs(prev => prev.map(l => l.ID === logId ? { ...l, status: 'approved' } : l))
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve log')
    }
  }

  const handleReject = async (logId) => {
    if (!rejectRemarks.trim()) {
      toast.error('Rejection remarks are required')
      return
    }
    try {
      await api.patch(`/timelogs/${logId}/reject`, { remarks: rejectRemarks })
      toast.success('Time log rejected')
      setLogs(prev => prev.map(l => l.ID === logId ? { ...l, status: 'rejected', remarks: rejectRemarks } : l))
      setRejectingLogId(null)
      setRejectRemarks('')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject log')
    }
  }

  return (
    <div className="fade-in space-y-6 max-w-7xl pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Time Logs Review</h1>
          <p className="page-sub mt-1">Review and approve daily hours submitted by students across the system.</p>
        </div>
        
        <div className="min-w-[300px]">
          <select 
            className="input w-full cursor-pointer bg-slate-900"
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
          >
            <option value="" disabled>Select a student...</option>
            {students.map(s => (
              <option key={s.student_id} value={s.student_id}>
                {s.student_name} {s.pending_logs > 0 ? `(${s.pending_logs} pending)` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedStudent ? (
         <div className="card text-center py-12">
            <p className="text-3xl mb-3">👨‍🎓</p>
            <p className="text-sm font-medium text-slate-400">No student selected</p>
            <p className="text-xs text-slate-600 mt-1">Please select a student from the dropdown to review their time logs.</p>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Student Logs</h2>
              {company?.name && (
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                  🏢 <span>Assigned to <strong className="text-white">{company.name}</strong></span>
                  {company.latitude && company.longitude ? (
                    <span className="text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                      📍 Geofence Set ({company.geo_radius || 200}m)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                      No Geofence Set
                    </span>
                  )}
                </p>
              )}
            </div>
            {summary && (
               <div className="flex gap-4 text-xs">
                 <div className="text-center px-3 py-1 bg-emerald-500/10 rounded border border-emerald-500/20 text-emerald-400">
                    <span className="font-bold">{summary.total_approved_hours}h</span> Approved
                 </div>
                 <div className="text-center px-3 py-1 bg-amber-500/10 rounded border border-amber-500/20 text-amber-400">
                    <span className="font-bold">{summary.total_pending_hours}h</span> Pending
                 </div>
               </div>
            )}
          </div>

          <div className="table-wrap">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr>
                  <th className="table-head">Date</th>
                  <th className="table-head">Clock In</th>
                  <th className="table-head">Clock Out</th>
                  <th className="table-head">Total Hours</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Location</th>
                  <th className="table-head">Photos</th>
                  <th className="table-head">Remarks</th>
                  <th className="table-head text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loadingLogs ? (
                   <tr>
                     <td colSpan="9" className="text-center py-10 text-slate-500 text-sm animate-pulse">
                        Loading logs...
                     </td>
                   </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-10 text-slate-500 text-sm">
                       No time logs submitted by this student yet.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => {
                    const clockIn = log.clock_in ? new Date(log.clock_in) : null;
                    const clockOut = log.clock_out ? new Date(log.clock_out) : null;
                    const hasGPS = log.clock_in_lat && log.clock_in_lng;
                    return (
                      <tr key={log.ID} className="table-row">
                        <td className="table-cell font-medium text-white">
                          {clockIn ? format(clockIn, 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="table-cell">
                          {clockIn ? format(clockIn, 'h:mm a') : '—'}
                        </td>
                        <td className="table-cell">
                          {clockOut ? format(clockOut, 'h:mm a') : <span className="text-indigo-400">Ongoing</span>}
                        </td>
                        <td className="table-cell font-semibold text-teal-400">
                          {log.total_hours ? `${log.total_hours}h` : '—'}
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${
                              log.status === 'approved' ? 'badge-approved' : 
                              log.status === 'rejected' ? 'badge-rejected' : 'badge-pending'
                            }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="table-cell">
                          {hasGPS ? (
                            <button
                              onClick={() => setPreviewMap({
                                clockInLat: log.clock_in_lat,
                                clockInLng: log.clock_in_lng,
                                clockInTime: log.clock_in,
                                companyLat: company?.latitude,
                                companyLng: company?.longitude,
                                companyRadius: company?.geo_radius || 200,
                                companyName: company?.name
                              })}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition shadow-sm"
                              title="View student clock-in location on map"
                            >
                              <span>📍</span>
                              <span>View Map</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-600 italic">No GPS</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1.5">
                              {log.clock_in_photo && (
                                  <button 
                                      onClick={() => setPreviewPhoto({ url: log.clock_in_photo, title: 'Clock In Photo', date: log.clock_in })}
                                      className="w-8 h-8 rounded border border-slate-700 overflow-hidden hover:border-emerald-500 transition shadow-sm"
                                  >
                                      <img src={log.clock_in_photo} alt="In" className="w-full h-full object-cover" />
                                  </button>
                              )}
                              {log.clock_out_photo && (
                                  <button 
                                      onClick={() => setPreviewPhoto({ url: log.clock_out_photo, title: 'Clock Out Photo', date: log.clock_out })}
                                      className="w-8 h-8 rounded border border-slate-700 overflow-hidden hover:border-rose-500 transition shadow-sm"
                                  >
                                      <img src={log.clock_out_photo} alt="Out" className="w-full h-full object-cover" />
                                  </button>
                              )}
                              {!log.clock_in_photo && !log.clock_out_photo && (
                                  <span className="text-[10px] text-slate-600 italic">None</span>
                              )}
                          </div>
                        </td>
                        <td className="table-cell text-xs text-slate-400 max-w-[150px] truncate" title={log.remarks}>
                          {log.status === 'rejected' ? <span className="text-red-400">Rejected: {log.remarks}</span> : (log.remarks || '—')}
                        </td>
                        <td className="table-cell text-right">
                          {log.status === 'pending' && clockOut ? (
                            <div className="flex items-center justify-end gap-2">
                              {rejectingLogId === log.ID ? (
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="text" 
                                    placeholder="Reason..."
                                    className="input-field bg-slate-800 border-red-500/50 text-xs py-1 px-2 w-32 rounded outline-none text-white focus:border-red-500"
                                    value={rejectRemarks}
                                    onChange={(e) => setRejectRemarks(e.target.value)}
                                    autoFocus
                                  />
                                  <button onClick={() => handleReject(log.ID)} className="btn btn-sm btn-danger px-2 py-1">Confirm</button>
                                  <button onClick={() => setRejectingLogId(null)} className="text-[10px] text-slate-400 hover:text-white px-1">Cancel</button>
                                </div>
                              ) : (
                                <>
                                  <button onClick={() => handleApprove(log.ID)} className="btn btn-sm btn-success">Approve</button>
                                  <button onClick={() => setRejectingLogId(log.ID)} className="btn btn-sm btn-danger">Reject</button>
                                </>
                              )}
                            </div>
                          ) : (
                             <span className="text-[10px] text-slate-500 uppercase tracking-widest">{log.status}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Photo Preview Modal ────────────────────────────────────────── */}
      {previewPhoto && createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
              <div className="fixed inset-0" onClick={() => setPreviewPhoto(null)} />
              <div className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl my-auto z-10 animate-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                      <div>
                          <h4 className="text-white font-semibold">{previewPhoto.title}</h4>
                          <p className="text-xs text-slate-500">{previewPhoto.date ? format(new Date(previewPhoto.date), 'MMM d, yyyy · h:mm a') : '—'}</p>
                      </div>
                      <button 
                          onClick={() => setPreviewPhoto(null)}
                          className="text-slate-400 hover:text-white p-1 rounded-lg border border-slate-800 hover:border-slate-700 transition"
                      >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>
                  <div className="p-2 bg-black/40 flex items-center justify-center max-h-[70vh] overflow-hidden">
                      <img src={previewPhoto.url} alt="Verification" className="max-h-[65vh] w-auto object-contain rounded-lg shadow-lg" />
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* ── Location Map Preview Modal ─────────────────────────────────── */}
      {previewMap && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setPreviewMap(null)} />
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col my-auto z-10 animate-in zoom-in-95 duration-200 max-h-[92vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2 text-base sm:text-lg">
                  <span>📍 Student Clock-In Location Map</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Clock-in time: {previewMap.clockInTime ? format(new Date(previewMap.clockInTime), 'MMM d, yyyy · h:mm a') : '—'}
                </p>
              </div>
              <button 
                onClick={() => setPreviewMap(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Map Container */}
            <div className="h-[300px] sm:h-[400px] w-full relative z-0">
              <MapContainer 
                center={[previewMap.clockInLat, previewMap.clockInLng]} 
                zoom={16} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer 
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                />
                
                {/* Student Clock In Marker */}
                <Marker position={[previewMap.clockInLat, previewMap.clockInLng]}>
                  <Popup>
                    <div className="text-xs font-sans">
                      <strong className="text-slate-900 block mb-1">🎓 Student Clock-In Location</strong>
                      <span className="text-slate-600">GPS: {previewMap.clockInLat.toFixed(5)}, {previewMap.clockInLng.toFixed(5)}</span>
                    </div>
                  </Popup>
                </Marker>

                {/* Company Geofence Marker & Boundary Circle */}
                {previewMap.companyLat && previewMap.companyLng && previewMap.companyLat !== 0 && (
                  <>
                    <Marker position={[previewMap.companyLat, previewMap.companyLng]}>
                      <Popup>
                        <div className="text-xs font-sans">
                          <strong className="text-slate-900 block mb-1">🏢 {previewMap.companyName || 'Company'}</strong>
                          <span className="text-slate-600">Geofence Radius: {previewMap.companyRadius}m</span>
                        </div>
                      </Popup>
                    </Marker>
                    <Circle 
                      center={[previewMap.companyLat, previewMap.companyLng]} 
                      radius={previewMap.companyRadius} 
                      pathOptions={{ color: '#14b8a6', fillColor: '#14b8a6', fillOpacity: 0.15, weight: 2 }} 
                    />
                  </>
                )}
              </MapContainer>
            </div>

            {/* Location & Geofence Details Footer */}
            <div className="p-4 bg-slate-900/95 border-t border-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-slate-400">
                <div>
                  <span className="text-slate-500">Student GPS: </span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {previewMap.clockInLat.toFixed(5)}, {previewMap.clockInLng.toFixed(5)}
                  </span>
                </div>
                {previewMap.companyLat && previewMap.companyLng && previewMap.companyLat !== 0 && (
                  <div>
                    <span className="text-slate-500">Company Geofence: </span>
                    <span className="font-mono text-teal-400 font-medium">
                      {previewMap.companyName} ({previewMap.companyRadius}m radius)
                    </span>
                  </div>
                )}
              </div>

              {previewMap.companyLat && previewMap.companyLng && previewMap.companyLat !== 0 && (() => {
                const dist = getDistanceMetres(previewMap.clockInLat, previewMap.clockInLng, previewMap.companyLat, previewMap.companyLng)
                const isInside = dist <= previewMap.companyRadius
                return (
                  <div className={`px-3 py-1 rounded-lg border text-xs font-medium whitespace-nowrap ${
                    isInside ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    {dist}m from company center ({isInside ? 'Inside Geofence ✅' : 'Outside Geofence ⚠️'})
                  </div>
                )
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

