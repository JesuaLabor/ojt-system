import React, { useState } from 'react'

import StatusBadge from '../components/ui/StatusBadge'
import ProgressBar from '../components/ui/ProgressBar'
import StatCard from '../components/ui/StatCard'
import DataTable from '../components/ui/DataTable'
import ConfirmModal from '../components/ui/ConfirmModal'
import LoadingSkeleton, { CardSkeleton, TableRowSkeleton } from '../components/ui/LoadingSkeleton'

const IconSample = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>

export default function UIKit() {
    const [showModal, setShowModal] = useState(false)

    // Sample Table Data
    const tableCols = [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'name', label: 'Candidate Name', sortable: true },
        { key: 'score', label: 'Score', sortable: true, align: 'right' },
        { 
            key: 'action', 
            label: 'Controls', 
            render: (row) => <button className="text-orange-400 hover:text-orange-300">View</button>
        }
    ]
    const tableData = [
        { id: 1, name: 'Alice Cooper', score: 95 },
        { id: 2, name: 'Bob Singer', score: 82 },
        { id: 3, name: 'Charlie Day', score: 88 },
    ]

    return (
        <div className="min-h-screen bg-slate-950 p-10 text-slate-300 font-sans space-y-16">
            <div>
                <h1 className="text-4xl font-black text-white mb-2">UI Component Kit</h1>
                <p className="text-slate-500">A gallery to preview the customized React + Tailwind reusable components.</p>
            </div>

            {/* StatCard Section */}
            <section>
                <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-800 pb-2">1. StatCard</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard title="Total Students" value="142" highlightColor="orange" icon={<IconSample />} />
                    <StatCard title="Completed" value="89" highlightColor="emerald" />
                    <StatCard title="Behind Schedule" value="12" highlightColor="rose" />
                    <StatCard title="Pending Review" value="5" highlightColor="blue" subtitle="Action needed" />
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                {/* StatusBadge Section */}
                <section>
                    <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-800 pb-2">2. StatusBadge</h2>
                    <div className="flex flex-wrap gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        <StatusBadge status="pending" />
                        <StatusBadge status="approved" />
                        <StatusBadge status="rejected" />
                        <StatusBadge status="completed" />
                        <StatusBadge status="behind" />
                        <StatusBadge status="on-track" />
                        <StatusBadge status="unknown-state" />
                    </div>
                </section>

                {/* ProgressBar Section */}
                <section>
                    <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-800 pb-2">3. ProgressBar</h2>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
                        <ProgressBar value={400} max={600} label="Standard Progress" colorClass="bg-orange-500" />
                        <ProgressBar value={20} max={100} label="Critical Condition" colorClass="bg-rose-500" />
                        <ProgressBar value={100} max={100} label="Completed" colorClass="bg-emerald-500" />
                    </div>
                </section>
            </div>

            {/* DataTable Section */}
            <section>
                <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-800 pb-2">4. DataTable</h2>
                <DataTable columns={tableCols} data={tableData} />
            </section>

            {/* LoadingSkeleton Section */}
            <section>
                <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-800 pb-2">5. LoadingSkeletons</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CardSkeleton />
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6">
                        <table className="w-full">
                            <tbody>
                                <TableRowSkeleton columns={3} />
                                <TableRowSkeleton columns={3} />
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* ConfirmModal Section */}
            <section>
                <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-800 pb-2">6. ConfirmModal</h2>
                <button 
                    onClick={() => setShowModal(true)}
                    className="btn bg-slate-800 hover:bg-slate-700 text-white"
                >
                    Trigger Demo Confirmation Modal
                </button>
            </section>

            {showModal && (
                <ConfirmModal 
                    title="Delete Account?" 
                    message="Are you sure you want to permanently delete this user? This action is irreversible."
                    confirmText="Yes, delete it"
                    confirmStyle="bg-red-600 hover:bg-red-500"
                    onConfirm={() => setShowModal(false)}
                    onCancel={() => setShowModal(false)}
                />
            )}
        </div>
    )
}
