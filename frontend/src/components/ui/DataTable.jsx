import React, { useState, useMemo } from 'react'

const IconSort = () => <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
const IconEmpty = () => <svg className="w-12 h-12 text-slate-700 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>

export default function DataTable({ columns, data, emptyMessage = 'No data available' }) {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

    const sortedData = useMemo(() => {
        if (!sortConfig.key) return data

        const sorted = [...data].sort((a, b) => {
            const valA = a[sortConfig.key]
            const valB = b[sortConfig.key]

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })
        return sorted
    }, [data, sortConfig])

    const requestSort = (key) => {
        let direction = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    return (
        <div className="w-full overflow-hidden border border-slate-800 rounded-2xl bg-slate-900 shadow-xl shadow-black/20">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900/80 border-b border-slate-800">
                            {columns.map((col, i) => (
                                <th 
                                    key={i} 
                                    className={`py-3.5 px-5 text-xs font-semibold text-slate-400 tracking-wider uppercase whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-white transition group' : ''} ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                                    onClick={() => col.sortable && requestSort(col.key)}
                                >
                                    <div className={`flex items-center gap-2 ${col.align === 'right' ? 'justify-end' : ''}`}>
                                        {col.label}
                                        {col.sortable && (
                                            <span className={`text-slate-600 group-hover:text-slate-400 ${sortConfig.key === col.key ? 'text-orange-400' : ''}`}>
                                                <IconSort />
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="py-16 text-center">
                                    <IconEmpty />
                                    <p className="mt-4 text-sm font-medium text-slate-400">{emptyMessage}</p>
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((row, rowIndex) => (
                                <tr key={row.id || rowIndex} className="hover:bg-slate-800/40 transition-colors">
                                    {columns.map((col, colIndex) => (
                                        <td 
                                            key={colIndex} 
                                            className={`py-4 px-5 text-sm ${col.align === 'right' ? 'text-right' : 'text-left'} text-slate-300`}
                                        >
                                            {col.render ? col.render(row, rowIndex) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
