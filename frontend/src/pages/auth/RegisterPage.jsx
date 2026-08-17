import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import logo from '../../assets/ojt_logo.png'

const ROLES = [
  { value: 'student', label: '🎓 Student', desc: 'Track your OJT hours & evaluations' },
  { value: 'supervisor', label: '🏢 Company Supervisor', desc: 'Review logs & evaluate students' },
  { value: 'coordinator', label: '📋 School Coordinator', desc: 'Manage OJT assignments' },
  { value: 'faculty', label: '👨‍🏫 Faculty Adviser', desc: 'Monitor student performance' },
]

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', department_id: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [departments, setDepartments] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/departments')
      .then(res => setDepartments(res.data?.departments || []))
      .catch(() => {}) // silently fail — departments may not exist yet
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form }
      // Convert department_id to number or remove if empty
      if (payload.department_id) {
        payload.department_id = Number(payload.department_id)
      } else {
        delete payload.department_id
      }
      await api.post('/auth/register', payload)
      toast.success('Account created! Please wait for approval by a Coordinator or Superadmin.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg py-8">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <div className="auth-card relative z-10 fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-16 h-16 rounded-2xl bg-white/10 p-1 flex items-center justify-center shadow-2xl shadow-indigo-900/40 mb-4">
            <img
              src={logo}
              alt="Logo"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-sm text-slate-500 mt-1">Join the OJT Tracking System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input
              id="reg-name"
              type="text" required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="Juan dela Cruz"
            />
          </div>

          {/* Email */}
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              id="reg-email"
              type="email" required autoComplete="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="input"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPw ? 'text' : 'password'} required minLength={6}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="input pr-10"
                placeholder="Min. 6 characters"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPw
                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                }
              </button>
            </div>
          </div>

          {/* Role selector */}
          <div className="input-group">
            <label className="input-label">I am a...</label>
            <div className="grid grid-cols-1 gap-2">
              {ROLES.map(r => (
                <label key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                    ${form.role === r.value
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'}`}
                >
                  <input
                    type="radio" name="role" value={r.value}
                    checked={form.role === r.value}
                    onChange={() => setForm({ ...form, role: r.value })}
                    className="hidden"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${form.role === r.value ? 'border-indigo-500' : 'border-slate-600'}`}>
                    {form.role === r.value && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-slate-500">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Department selector — hidden for coordinator */}
          {form.role !== 'coordinator' && departments.length > 0 && (
            <div className="input-group">
              <label className="input-label">Department</label>
              <select
                id="reg-department"
                value={form.department_id}
                onChange={e => setForm({ ...form, department_id: e.target.value })}
                className="input"
              >
                <option value="">— Select your department —</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">You can update this later with your coordinator.</p>
            </div>
          )}

          <button id="reg-submit" type="submit" disabled={loading} className="btn btn-primary btn-lg w-full justify-center mt-1">
            {loading ? <><span className="spinner" /> Creating account...</> : 'Create Account'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
