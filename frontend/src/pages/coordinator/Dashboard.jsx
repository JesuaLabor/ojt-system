import { Routes, Route } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Overview from './Overview'
import Assignments from './Assignments'
import Reports from './Reports'

// Placeholder shells (to be built in later phases)
const Placeholder = ({ title }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-600">
    <p className="text-4xl mb-3">🚧</p>
    <p className="text-lg font-semibold text-slate-400">{title}</p>
    <p className="text-sm mt-1">Coming soon…</p>
  </div>
)

export default function CoordinatorDashboard() {
  return (
    <Layout>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="students" element={<Placeholder title="Manage Students" />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="timelogs" element={<Placeholder title="Time Logs Review" />} />
        <Route path="evaluations" element={<Placeholder title="Evaluations Review" />} />
        <Route path="reports" element={<Reports />} />
      </Routes>
    </Layout>
  )
}
