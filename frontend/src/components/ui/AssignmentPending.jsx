import { Link } from 'react-router-dom'

export default function AssignmentPending({ role, name }) {
    const messages = {
        student: {
            title: "Ready for your OJT?",
            body: "Your account is active, but you haven't been assigned to a company yet. Your school coordinator is currently matching you with a suitable partner.",
            icon: "💼",
            action: "While you wait, make sure your profile is complete and you've uploaded all necessary pre-OJT documents."
        },
        supervisor: {
            title: "No Students Assigned",
            body: "Your supervisor account is ready! We're just waiting for the coordinator to assign students from your partner school to your company.",
            icon: "👥",
            action: "Once students are assigned, they will appear here and you can start reviewing their daily time logs."
        },
        faculty: {
            title: "Department Assignment Needed",
            body: "You're successfully approved! However, you haven't been assigned to an academic department yet.",
            icon: "🏫",
            action: "Please contact your system coordinator to link your account to your specific department so you can monitor your students."
        }
    }

    const m = messages[role] || messages.student

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
            <div className="w-24 h-24 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-5xl mb-8 shadow-2xl shadow-indigo-500/10">
                {m.icon}
            </div>

            <div className="max-w-md space-y-4">
                <h1 className="text-3xl font-black text-white tracking-tight">
                    {m.title}
                </h1>
                <p className="text-slate-400 leading-relaxed text-sm">
                    Hey <span className="text-indigo-400 font-bold">{name?.split(' ')[0]}</span>, {m.body}
                </p>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mt-6 backdrop-blur-sm">
                    <p className="text-xs text-slate-500 italic">
                        <span className="text-indigo-400 font-bold not-italic">Pro-tip:</span> {m.action}
                    </p>
                </div>

                <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="btn btn-primary px-8 py-3 rounded-xl shadow-lg shadow-indigo-600/20 w-full sm:w-auto"
                    >
                        Refresh Status
                    </button>
                    <Link
                        to={`/${role}/profile`}
                        className="btn btn-ghost px-8 py-3 rounded-xl w-full sm:w-auto"
                    >
                        Go to Profile
                    </Link>
                </div>
            </div>
        </div>
    )
}
