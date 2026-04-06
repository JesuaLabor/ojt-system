import { create } from 'zustand'
import api from '../services/api'

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('ojt_token') || null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    const res = await api.post('/auth/login', { email, password })
    const { token, user } = res.data
    localStorage.setItem('ojt_token', token)
    set({ token, user, isLoading: false })
    return user
  },

  logout: () => {
    localStorage.removeItem('ojt_token')
    set({ user: null, token: null })
  },

  // Patch specific fields in the user object without a full re-fetch
  updateUser: (updates) => set(state => ({ user: { ...state.user, ...updates } })),

  fetchMe: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get('/me')
      set({ user: res.data, isLoading: false })
    } catch {
      localStorage.removeItem('ojt_token')
      set({ user: null, token: null, isLoading: false })
    }
  },
}))

export default useAuthStore
