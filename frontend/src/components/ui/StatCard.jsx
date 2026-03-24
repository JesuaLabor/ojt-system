import React from 'react'

export default function StatCard({ title, value, subtitle, icon, highlightColor = 'orange' }) {
    // Basic dynamic bg gradient and border mappings depending on string
    const colorClasses = {
        orange: 'from-orange-500/10 to-transparent border-orange-500/20 text-orange-400',
        emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-400',
        rose: 'from-rose-500/10 to-transparent border-rose-500/20 text-rose-400',
        blue: 'from-blue-500/10 to-transparent border-blue-500/20 text-blue-400',
        slate: 'from-slate-500/10 to-transparent border-slate-500/20 text-slate-400',
    }

    const theme = colorClasses[highlightColor] || colorClasses.slate

    return (
        <div className={`relative p-5 md:p-6 rounded-2xl border bg-slate-900 overflow-hidden group ${theme.split('text-')[0]}bg-gradient-to-br`}>
            {/* Subtle glow effect behind card based on color */}
            <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40 bg-${highlightColor}-500`} />
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-3">
                <div className="flex justify-between items-start gap-4">
                    <h3 className="text-slate-400 font-semibold text-sm tracking-wide uppercase">{title}</h3>
                    {icon && (
                        <div className={`p-2 rounded-lg bg-slate-800/50 backdrop-blur-sm shadow-sm ${theme.split(' ')[2]}`}>
                            {icon}
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-3xl md:text-4xl font-black text-white">{value}</p>
                    {subtitle && <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wider">{subtitle}</p>}
                </div>
            </div>
        </div>
    )
}
