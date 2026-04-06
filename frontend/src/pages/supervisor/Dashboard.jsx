import { Routes, Route } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Overview from './Overview'
import Evaluations from './Evaluations'
import SupervisorTimeLogs from './TimeLogs'
import SupervisorStudents from './Students'
import SupervisorReports from './Reports'
import Profile from '../common/Profile'

// Placeholder shells (to be built in later phases)
const Placeholder = ({ title }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-600">
    <p className="text-4xl mb-3">🚧</p>
    <p className="text-lg font-semibold text-slate-400">{title}</p>
    <p className="text-sm mt-1">Coming soon…</p>
  </div>
)

export default function SupervisorDashboard() {
  return (
    <Layout>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="students" element={<SupervisorStudents />} />
        <Route path="timelogs" element={<SupervisorTimeLogs />} />
        <Route path="evaluations" element={<Evaluations />} />
        <Route path="reports" element={<SupervisorReports />} />
        <Route path="profile" element={<Profile />} />
      </Routes>
    </Layout>
  )
}
