import { useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

// Map route segments to readable breadcrumb names
const ROUTE_LABELS = {
    student: 'Student', supervisor: 'Supervisor', coordinator: 'Coordinator', faculty: 'Faculty',
    timelogs: 'Time Logs', evaluations: 'Evaluations', documents: 'Documents',
    profile: 'Profile', students: 'Students', reports: 'Reports',
    assignments: 'Assignments', clockin: 'Clock In',
}

function Breadcrumbs() {
    const { pathname } = useLocation()
    const parts = pathname.split('/').filter(Boolean)

    return (
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Home</span>
            {parts.map((part, i) => (
                <span key={i} className="flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className={i === parts.length - 1 ? 'text-slate-300 font-medium' : ''}>
                        {ROUTE_LABELS[part] || part}
                    </span>
                </span>
            ))}
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
                       px-5 py-3.5 bg-slate-950/80 backdrop-blur-md
                       border-b border-slate-800/80">
            {/* Left: Hamburger + Breadcrumbs */}
            <div className="flex items-center gap-4">
                <button
                    id="sidebar-toggle"
                    onClick={onMenuClick}
                    className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl
                     bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700
                     transition-colors"
                    aria-label="Toggle menu"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <Breadcrumbs />
            </div>

            {/* Right: Date/Time + User avatar */}
            <div className="flex items-center gap-4">
                {/* Clock */}
                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-semibold text-white">{timeStr}</span>
                    <span className="text-[10px] text-slate-500">{dateStr}</span>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-slate-800 hidden sm:block" />

                {/* User avatar pill */}
                <div className="flex items-center gap-2.5 bg-slate-800/60 border border-slate-700/60
                        rounded-full pl-1 pr-3 py-1 cursor-default">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600
                          flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                            {user?.name?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-xs font-semibold text-white leading-none">
                            {user?.name?.split(' ')[0]}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 capitalize">{user?.role}</p>
                    </div>
                </div>
            </div>
        </header>
    )
}
