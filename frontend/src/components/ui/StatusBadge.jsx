import React from 'react'

export default function StatusBadge({ status }) {
    const s = String(status).toLowerCase()

    let styles = ''
    switch (s) {
        case 'approved':
        case 'completed':
        case 'on-track':
            styles = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            break
        case 'rejected':
        case 'behind':
            styles = 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            break
        case 'pending':
        case 'active':
            styles = 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            break
        default:
            styles = 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
            break
    }

    const label = s.replace('-', ' ')

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles}`}>
            {label}
        </span>
    )
}
