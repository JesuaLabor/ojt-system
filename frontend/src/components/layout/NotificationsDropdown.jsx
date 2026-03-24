import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import api from '../../services/api'
import toast from 'react-hot-toast'

const IconBell = ({ unreadCount }) => (
    <div className="relative">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-slate-950">
                {unreadCount > 99 ? '99+' : unreadCount}
            </span>
        )}
    </div>
)

export default function NotificationsDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const dropdownRef = useRef(null)
    const navigate = useNavigate()

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications/')
            setNotifications(res.data?.notifications || [])
            setUnreadCount(res.data?.unread_count || 0)
        } catch (err) {
            console.error('Failed to fetch notifications:', err)
        }
    }

    // Polling every 30 seconds
    useEffect(() => {
        fetchNotifications() // Initial fetch
        const intervalId = setInterval(fetchNotifications, 30000)
        return () => clearInterval(intervalId)
    }, [])

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleNotificationClick = async (notif) => {
        if (!notif.is_read) {
            try {
                await api.patch(`/notifications/${notif.ID}/read`)
                // Optimistic UI update
                setNotifications(prev => prev.map(n => n.ID === notif.ID ? { ...n, is_read: true } : n))
                setUnreadCount(prev => Math.max(0, prev - 1))
            } catch (err) {
                console.error(err)
            }
        }
        setIsOpen(false)
        if (notif.link) {
            navigate(notif.link)
        }
    }

    const handleMarkAllRead = async () => {
        try {
            await api.patch('/notifications/read-all')
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            setUnreadCount(0)
            toast.success('All notifications marked as read')
        } catch (err) {
            toast.error('Failed to mark all as read')
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-full transition-colors relative ${isOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'}`}
                title="Notifications"
            >
                <IconBell unreadCount={unreadCount} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50">
                        <h3 className="font-bold text-white text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-orange-400 hover:text-orange-300 font-medium transition"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-800/50">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                <p className="text-sm">You're all caught up!</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <button
                                    key={n.ID}
                                    onClick={() => handleNotificationClick(n)}
                                    className={`w-full text-left p-4 hover:bg-slate-800/60 transition ${n.is_read ? 'opacity-70' : 'bg-slate-800/20'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        {!n.is_read && (
                                            <div className="mt-1.5 w-2 h-2 rounded-full bg-rose-500 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm leading-snug ${n.is_read ? 'text-slate-300' : 'text-slate-100 font-medium'}`}>
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {formatDistanceToNow(new Date(n.CreatedAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
