import { Routes, Route } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Overview from './Overview'
import Assignments from './Assignments'
import Companies from './Companies'
import Reports from './Reports'
import CoordinatorTimeLogs from './TimeLogs'
import CoordinatorStudents from './Students'
import CoordinatorEvaluations from './Evaluations'
import UserApprovals from './UserApprovals'
import CoordinatorDocuments from './Documents'

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
        <Route path="students" element={<CoordinatorStudents />} />
        <Route path="approvals" element={<UserApprovals />} />
        <Route path="companies" element={<Companies />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="documents" element={<CoordinatorDocuments />} />
        <Route path="timelogs" element={<CoordinatorTimeLogs />} />
        <Route path="evaluations" element={<CoordinatorEvaluations />} />
        <Route path="reports" element={<Reports />} />
      </Routes>
    </Layout>
  )
}
