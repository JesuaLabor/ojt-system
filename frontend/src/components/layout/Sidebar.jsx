import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

// ── Role-based navigation config ────────────────────────────────────────────
const NAV = {
    student: [
        { to: '/student', label: 'Dashboard', icon: IconGrid },
        { to: '/student/timelogs', label: 'Time Logs', icon: IconClock },
        { to: '/student/evaluations', label: 'Evaluations', icon: IconStar },
        { to: '/student/documents', label: 'Documents', icon: IconDoc },
        { to: '/student/profile', label: 'My Profile', icon: IconUser },
    ],
    supervisor: [
        { to: '/supervisor', label: 'Dashboard', icon: IconGrid },
        { to: '/supervisor/students', label: 'Students', icon: IconUsers },
        { to: '/supervisor/timelogs', label: 'Time Logs', icon: IconClock },
        { to: '/supervisor/evaluations', label: 'Evaluations', icon: IconStar },
        { to: '/supervisor/reports', label: 'Reports', icon: IconChart },
    ],
    coordinator: [
        { to: '/coordinator', label: 'Dashboard', icon: IconGrid },
        { to: '/coordinator/students', label: 'Students', icon: IconUsers },
        { to: '/coordinator/assignments', label: 'Assignments', icon: IconBriefcase },
        { to: '/coordinator/timelogs', label: 'Time Logs', icon: IconClock },
        { to: '/coordinator/evaluations', label: 'Evaluations', icon: IconStar },
        { to: '/coordinator/reports', label: 'Reports', icon: IconChart },
    ],
    faculty: [
        { to: '/faculty', label: 'Dashboard', icon: IconGrid },
        { to: '/faculty/students', label: 'Students', icon: IconUsers },
        { to: '/faculty/evaluations', label: 'Evaluations', icon: IconStar },
        { to: '/faculty/reports', label: 'Reports', icon: IconChart },
    ],
}

// ── Role display config ───────────────────────────────────────────────────────
const ROLE_META = {
    student: { label: 'Student', color: 'text-cyan-400', dot: 'bg-cyan-400' },
    supervisor: { label: 'Supervisor', color: 'text-purple-400', dot: 'bg-purple-400' },
    coordinator: { label: 'Coordinator', color: 'text-orange-400', dot: 'bg-orange-400' },
    faculty: { label: 'Faculty Adviser', color: 'text-emerald-400', dot: 'bg-emerald-400' },
}

export default function Sidebar({ open, onClose }) {
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()
    const links = NAV[user?.role] || []
    const meta = ROLE_META[user?.role] || {}

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <>
            {/* Mobile overlay */}
            {open && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar panel */}
            <aside
                className={`sidebar ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            >
                {/* Logo / Brand */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600
                          flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-900/50">
                        <span className="text-white font-bold text-base">O</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-none">OJT Tracker</p>
                        <p className="text-xs text-slate-500 mt-0.5">Performance Monitor</p>
                    </div>
                    {/* Close on mobile */}
                    <button
                        onClick={onClose}
                        className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg
                       text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <IconX className="w-4 h-4" />
                    </button>
                </div>

                {/* User info strip */}
                <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600
                            flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                                {user?.name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                <p className={`text-[10px] font-medium ${meta.color}`}>{meta.label}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Nav links */}
                <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
                    <p className="section-label">Navigation</p>
                    {links.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === `/${user?.role}`} /* exact match for dashboard root */
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            <Icon className="icon" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Logout */}
                <div className="px-3 py-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                        <IconLogout className="icon" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    )
}

// ── SVG Icons (inline, zero-dep) ─────────────────────────────────────────────
function IconGrid({ className }) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> }
function IconClock({ className }) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
function IconStar({ className }) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg> }
function IconDoc({ className }) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> }
function IconUser({ className }) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> }
function IconUsers({ className }) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
function IconChart({ className }) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> }
function IconBriefcase({ className }) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> }
function IconLogout({ className }) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> }
function IconX({ className }) { return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> }
