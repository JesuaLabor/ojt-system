import { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex min-h-screen bg-gray-950">
            {/* Sidebar — fixed on desktop, slide-in on mobile */}
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main area (offset by sidebar width on lg+) */}
            <div className="flex-1 flex flex-col lg:ml-[260px] min-w-0">
                <Navbar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 p-5 lg:p-7 fade-in">
                    {children}
                </main>
            </div>
        </div>
    )
}
