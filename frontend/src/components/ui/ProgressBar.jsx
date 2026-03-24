import React from 'react'

export default function ProgressBar({ value = 0, max = 100, label, colorClass = 'bg-orange-500', showPercentage = true }) {
    // Ensure value is bounded between 0 and max
    const safeValue = Math.max(0, parseFloat(value) || 0)
    const safeMax = Math.max(1, parseFloat(max) || 100)
    const percentage = Math.min(100, (safeValue / safeMax) * 100)

    return (
        <div className="flex flex-col gap-1.5 w-full">
            {(label || showPercentage) && (
                <div className="flex justify-between items-end">
                    {label && <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">{label}</span>}
                    {showPercentage && (
                        <span className="text-[10px] font-mono font-bold text-slate-500">{percentage.toFixed(1)}%</span>
                    )}
                </div>
            )}
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}
