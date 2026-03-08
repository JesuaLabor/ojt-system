import { Routes, Route } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Overview from './Overview'
import TimeLogs from './TimeLogs'
import StudentEvaluations from './Evaluations'
import StudentDocuments from './Documents'

// Placeholder shells (to be built in later phases)
const Placeholder = ({ title }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-600">
    <p className="text-4xl mb-3">🚧</p>
    <p className="text-lg font-semibold text-slate-400">{title}</p>
    <p className="text-sm mt-1">Coming soon…</p>
  </div>
)

export default function StudentDashboard() {
  return (
    <Layout>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="timelogs" element={<TimeLogs />} />
        <Route path="evaluations" element={<StudentEvaluations />} />
        <Route path="documents" element={<StudentDocuments />} />
        <Route path="profile" element={<Placeholder title="My Profile" />} />
      </Routes>
    </Layout>
  )
}
