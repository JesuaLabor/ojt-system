import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from 'axios'
import logo from '../../assets/ojt_logo.png'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token') || ''

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Redirect to forgot-password if no token in URL
  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token.')
      navigate('/forgot-password', { replace: true })
    }
  }, [token, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (form.password !== form.confirm) {
      toast.error('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        password: form.password,
      })
      setSuccess(true)
      toast.success('Password reset! Redirecting to login...')
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  const EyeIcon = ({ open }) => open
    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>

  return (
    <div className="auth-bg">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      </div>

      <div className="auth-card relative z-10 fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 p-1 flex items-center justify-center shadow-2xl shadow-indigo-900/40 mb-4">
            <img src={logo} alt="Logo" className="w-full h-full object-cover rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set New Password</h1>
          <p className="text-sm text-slate-500 mt-1">Choose a strong password for your account</p>
        </div>

        {success ? (
          /* Success state */
          <div className="text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-lg mb-1">Password updated!</p>
              <p className="text-slate-400 text-sm">Redirecting you to the login page in a moment...</p>
            </div>
            <Link to="/login" className="btn btn-primary btn-lg w-full justify-center">
              Go to Login
            </Link>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="input-group">
              <label className="input-label">New Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  id="reset-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input pl-9 pr-10"
                  placeholder="Min. 6 characters"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
                <input
                  id="reset-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={form.confirm}
                  onChange={e => setForm({ ...form, confirm: e.target.value })}
                  className={`input pl-9 pr-10 ${form.confirm && form.password !== form.confirm ? 'border-red-500/50' : ''}`}
                  placeholder="Re-enter your password"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {form.confirm && form.password !== form.confirm && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              id="reset-submit"
              type="submit"
              disabled={loading || (form.confirm && form.password !== form.confirm)}
              className="btn btn-primary btn-lg w-full justify-center mt-2"
            >
              {loading
                ? <><span className="spinner" /> Resetting password...</>
                : 'Reset Password'}
            </button>

            <div className="text-center mt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
