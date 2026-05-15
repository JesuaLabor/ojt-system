import axios from 'axios'
import useAuthStore from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request (read from in-memory store)
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally — but skip public endpoints that are allowed to fail silently
const PUBLIC_ENDPOINTS = ['/departments', '/auth']
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || ''
      const isPublic = PUBLIC_ENDPOINTS.some((p) => url.includes(p))
      if (!isPublic) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
