import { useLocation, Link } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import NotificationsDropdown from './NotificationsDropdown'

// Map route segments to readable breadcrumb names
const ROUTE_LABELS = {
    student: 'Student', supervisor: 'Supervisor', coordinator: 'Coordinator', faculty: 'Faculty', admin: 'Admin',
    timelogs: 'Time Logs', evaluations: 'Evaluations', documents: 'Documents',
    profile: 'Profile', students: 'Students', reports: 'Reports',
    assignments: 'Assignments', clockin: 'Clock In', announcements: 'Announcements',
    messages: 'Messages', approvals: 'Approvals', departments: 'Departments', companies: 'Companies'
}

function Breadcrumbs() {
    const { pathname } = useLocation()
    const parts = pathname.split('/').filter(Boolean)

    return (
        <nav className="flex items-center gap-1 sm:gap-1.5 text-xs text-slate-500 min-w-0 overflow-hidden" aria-label="Breadcrumb">
            <span className="hidden xs:inline sm:inline shrink-0">Home</span>
            {parts.map((part, i) => {
                const isLast = i === parts.length - 1
                return (
                    <span 
                        key={i} 
                        className={`flex items-center gap-1 sm:gap-1.5 min-w-0 ${
                            !isLast && parts.length > 2 ? 'hidden sm:flex' : 'flex'
                        }`}
                    >
                        <svg className="w-3 h-3 shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className={`truncate ${isLast ? 'text-slate-300 font-medium' : ''}`}>
                            {ROUTE_LABELS[part] || part}
                        </span>
                    </span>
                )
            })}
        </nav>
    )
}

export default function Navbar({ onMenuClick }) {
    const { user } = useAuthStore()
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
    const dateStr = now.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })

    return (
        <header className="sticky top-0 z-20 flex items-center justify-between
                       px-3.5 sm:px-5 py-3 bg-slate-950/80 backdrop-blur-md
                       border-b border-slate-800/80">
            {/* Left: Hamburger (Mobile) + Breadcrumbs */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden pr-2">
                {/* Mobile Drawer Trigger */}
                <button
                    id="sidebar-toggle-mobile"
                    onClick={onMenuClick}
                    className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl
                     bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700
                     transition-colors shrink-0"
                    aria-label="Open navigation drawer"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <Breadcrumbs />
            </div>

            {/* Right: Date/Time + Notifications + User avatar */}
            <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
                {/* Clock */}
                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-semibold text-white">{timeStr}</span>
                    <span className="text-[10px] text-slate-500">{dateStr}</span>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-slate-800 hidden sm:block" />

                {/* Notifications Bell Dropdown */}
                <NotificationsDropdown />

                {/* User avatar pill button */}
                <Link to={`/${user?.role || 'student'}/profile`} 
                      title={`${user?.name || 'User'} (${user?.role || ''}) - View Profile`}
                      className="flex items-center gap-2 bg-slate-800/70 border border-slate-700/60
                        rounded-full p-1 sm:pl-1.5 sm:pr-3.5 sm:py-1 cursor-pointer 
                        hover:bg-slate-700/80 hover:border-indigo-500/50 transition-all 
                        group shrink-0 active:scale-95">
                    {user?.profile_photo ? (
                        <img
                            src={user.profile_photo}
                            alt="Avatar"
                            className="w-8 h-8 sm:w-7 sm:h-7 rounded-full object-cover shrink-0 border border-slate-600/50 group-hover:border-indigo-500/50 transition-colors"
                        />
                    ) : (
                        <div className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600
                              flex items-center justify-center shrink-0">
                            <span className="text-white text-xs font-bold leading-none">
                                {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                            </span>
                        </div>
                    )}
                    <div className="hidden sm:block text-left">
                        <p className="text-xs font-semibold text-white leading-none group-hover:text-indigo-400 transition-colors truncate max-w-[120px]">
                            {user?.name ? user.name.split(' ')[0] : 'User'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 capitalize leading-none font-medium">{user?.role || 'Profile'}</p>
                    </div>
                </Link>
            </div>
        </header>
    )
}
