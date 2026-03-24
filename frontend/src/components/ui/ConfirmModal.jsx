import React from 'react'

const IconWarning = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>

export default function ConfirmModal({ title = 'Confirm Action', message, onConfirm, onCancel, confirmText = 'Confirm', confirmStyle = 'bg-red-600 hover:bg-red-500' }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop click to cancel */}
            <div className="absolute inset-0" onClick={onCancel} />
            
            <div className="relative bg-slate-900 border border-slate-700/80 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${confirmStyle.includes('red') ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        <IconWarning />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                        {message}
                    </p>
                </div>
                
                <div className="flex gap-3 w-full">
                    <button 
                        onClick={onCancel} 
                        className="btn btn-ghost flex-1 justify-center relative z-10"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className={`btn text-white flex-1 justify-center shadow-lg relative z-10 ${confirmStyle}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
