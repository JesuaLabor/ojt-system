import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

export default function Profile() {
  const { user, fetchMe } = useAuthStore()

  // Profile Update State
  const [profileData, setProfileData] = useState({
    name: user?.name || ''
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(user?.profile_photo || '')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  // Keep avatar preview in sync with the user store (e.g. after a successful upload)
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(user?.profile_photo || '')
    }
  }, [user?.profile_photo])

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Handlers
  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value })
  }

  const submitProfileUpdate = async (e) => {
    e.preventDefault()
    setIsUpdatingProfile(true)
    try {
      // 1. Update text info
      await api.put('/me', {
        name: profileData.name
      })

      // 2. Upload avatar if selected
      if (avatarFile) {
        const formData = new FormData()
        formData.append('file', avatarFile)
        await api.post('/me/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      await fetchMe() // update local user state
      toast.success('Profile updated successfully!')
      setAvatarFile(null)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const submitPasswordChange = async (e) => {
    e.preventDefault()
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match')
      return
    }

    setIsChangingPassword(true)
    try {
      await api.post('/auth/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      })
      toast.success('Password changed successfully!')
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (!user) return null

  return (
    <div className="fade-in space-y-6 max-w-4xl mx-auto pb-10">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="page-title">My Profile</h1>
        <p className="page-sub mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Card: User Info Summary ────────────────────────────────────────── */}
        <div className="card flex flex-col items-center text-center">
          {avatarPreview ? (
            <img 
              src={avatarPreview} 
              alt="Profile" 
              className="w-24 h-24 rounded-full object-cover border-4 border-slate-700/50 mb-4"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl font-bold mb-4 border-4 border-slate-700/50">
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <h2 className="text-xl font-bold text-white">{user.name}</h2>
          <p className="text-sm text-indigo-400 font-medium capitalize mt-1">{user.role}</p>

          <div className="w-full mt-6 space-y-4 text-left border-t border-slate-800 pt-6">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Email Address</p>
              <p className="text-sm text-slate-300 mt-1 truncate">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Joined At</p>
              <p className="text-sm text-slate-300 mt-1">
                {user.created_at ? format(new Date(user.created_at), 'MMMM d, yyyy') : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Forms Area ────────────────────────────────────────────────────── */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Update Profile Form */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-1">Personal Information</h3>
            <p className="text-xs text-slate-400 mb-5">Update your display name and profile picture.</p>
            
            <form onSubmit={submitProfileUpdate} className="space-y-4">
              <div>
                <label className="input-label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="input-label">Profile Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={isUpdatingProfile}
                  className="btn btn-primary"
                >
                  {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="card border border-rose-900/20">
            <h3 className="text-lg font-semibold text-white mb-1">Security</h3>
            <p className="text-xs text-slate-400 mb-5">Ensure your account is using a long, random password to stay secure.</p>
            
            <form onSubmit={submitPasswordChange} className="space-y-4">
              <div>
                <label className="input-label">Current Password</label>
                <input
                  type="password"
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">New Password</label>
                  <input
                    type="password"
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    minLength={6}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Confirm Password</label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    minLength={6}
                    className="input focus:border-emerald-500 focus:ring-emerald-500/20"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={isChangingPassword}
                  className="btn btn-danger"
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
