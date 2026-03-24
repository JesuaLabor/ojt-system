import React from 'react'

export default function LoadingSkeleton({ className = '', count = 1 }) {
    const skeletons = Array.from({ length: count })

    return (
        <>
            {skeletons.map((_, i) => (
                <div 
                    key={i} 
                    className={`animate-pulse bg-slate-800/80 rounded-xl ${className}`}
                >
                    {/* Invisible spacer if no children are passed to maintain some height/width naturally if className relies on it, though usually className has h-* w-* */}
                    &nbsp; 
                </div>
            ))}
        </>
    )
}

// Named exports for specific common skeleton shapes
export function CardSkeleton() {
    return (
        <div className="p-5 md:p-6 rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <LoadingSkeleton className="h-4 w-24" />
                <LoadingSkeleton className="h-8 w-8 rounded-lg" />
            </div>
            <LoadingSkeleton className="h-10 w-20 mb-2 mt-4" />
            <LoadingSkeleton className="h-3 w-32" />
        </div>
    )
}

export function TableRowSkeleton({ columns = 5 }) {
    return (
        <tr className="border-b border-slate-800/50">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="py-4 px-5">
                    <LoadingSkeleton className="h-4 w-full" />
                </td>
            ))}
        </tr>
    )
}
