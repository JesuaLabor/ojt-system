import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import logo from '../../assets/ojt_logo.png'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post(`${API}/auth/forgot-password`, { email })
      setSubmitted(true)
    } catch (err) {
      // Still show success to prevent email enumeration
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

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
          <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
          <p className="text-sm text-slate-500 mt-1">We'll send a reset link to your email</p>
        </div>

        {submitted ? (
          /* Success state */
          <div className="text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-lg mb-1">Check your inbox</p>
              <p className="text-slate-400 text-sm leading-relaxed">
                If <span className="text-indigo-400 font-medium">{email}</span> is registered, you'll receive a password reset link shortly. The link expires in <strong className="text-slate-300">1 hour</strong>.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Didn't receive it? Check your spam folder or{' '}
              <button
                onClick={() => setSubmitted(false)}
                className="text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
              >
                try again
              </button>
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mt-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Login
            </Link>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="input-group">
              <label className="input-label">Email address</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <button
              id="forgot-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-full justify-center mt-2"
            >
              {loading
                ? <><span className="spinner" /> Sending reset link...</>
                : 'Send Reset Link'}
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
