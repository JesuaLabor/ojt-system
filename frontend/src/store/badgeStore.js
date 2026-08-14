import { create } from 'zustand'
import api from '../services/api'

const useBadgeStore = create((set, get) => ({
    badges: {
        unreadAnnouncements: 0,
        unreadMessages: 0,
        pendingApprovals: 0,
        pendingJournals: 0,
    },

    // ── Decrement a badge key by 1 (min 0) ────────────────────────────────────
    decrement: (key) => set(state => ({
        badges: {
            ...state.badges,
            [key]: Math.max(0, (state.badges[key] || 0) - 1),
        },
    })),

    // ── Set a badge key to 0 immediately ──────────────────────────────────────
    clear: (key) => set(state => ({
        badges: { ...state.badges, [key]: 0 },
    })),

    // ── Set a badge key to a specific value ───────────────────────────────────
    setBadge: (key, value) => set(state => ({
        badges: { ...state.badges, [key]: value },
    })),

    // ── Re-fetch all badge counts from the API ────────────────────────────────
    fetchAll: async (user) => {
        if (!user) return

        try {
            // Unread messages
            const msgRes = await api.get('/messages/unread')
            set(state => ({
                badges: { ...state.badges, unreadMessages: msgRes.data?.unread_count || 0 },
            }))
        } catch { /* silent */ }

        try {
            // Unread announcements (localStorage based)
            const annRes = await api.get('/announcements')
            const list = annRes.data?.announcements || []
            const lastRead = localStorage.getItem(`announcements_last_read_${user.id}`)
            const unread = list.filter(a => !lastRead || new Date(a.CreatedAt) > new Date(lastRead)).length
            set(state => ({
                badges: { ...state.badges, unreadAnnouncements: unread },
            }))
        } catch { /* silent */ }

        // Role-specific badges
        if (user.role === 'supervisor') {
            try {
                const studRes = await api.get('/supervisor/students')
                set(state => ({
                    badges: { ...state.badges, pendingApprovals: studRes.data?.total_pending_approvals || 0 },
                }))
            } catch { /* silent */ }

            try {
                const jRes = await api.get('/journals/supervisor/pending-count')
                set(state => ({
                    badges: { ...state.badges, pendingJournals: jRes.data?.pending_count || 0 },
                }))
            } catch { /* silent */ }
        }

        if (user.role === 'coordinator' || user.role === 'admin') {
            try {
                const pendRes = await api.get('/coordinator/users/pending')
                set(state => ({
                    badges: { ...state.badges, pendingUsers: pendRes.data?.users?.length || 0 },
                }))
            } catch { /* silent */ }
        }
    },
}))

export default useBadgeStore
