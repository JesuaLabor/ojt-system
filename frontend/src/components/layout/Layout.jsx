import { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [collapsed, setCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true'
    })

    const toggleCollapse = () => {
        setCollapsed(prev => {
            const next = !prev
            localStorage.setItem('sidebar_collapsed', String(next))
            return next
        })
    }

    return (
        <div className="flex min-h-screen bg-gray-950">
            {/* Sidebar — fixed on desktop, slide-in on mobile */}
            <Sidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                collapsed={collapsed}
                onToggleCollapse={toggleCollapse}
            />

            {/* Main area (offset by sidebar width on md+) */}
            <div className={`flex-1 flex flex-col min-w-0 transition-[margin-left] duration-300 ${
                collapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
            }`}>
                <Navbar
                    onMenuClick={() => setSidebarOpen(true)}
                    collapsed={collapsed}
                    onToggleCollapse={toggleCollapse}
                />
                <main className="flex-1 p-3 sm:p-5 md:p-7 fade-in">
                    {children}
                </main>
            </div>
        </div>
    )
}
