import { Routes, Route } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Overview from './Overview'
import TimeLogs from './TimeLogs'
import StudentEvaluations from './Evaluations'
import StudentDocuments from './Documents'
import StudentJournals from './Journals'
import Profile from '../common/Profile'



export default function StudentDashboard() {
  return (
    <Layout>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="timelogs" element={<TimeLogs />} />
        <Route path="journals" element={<StudentJournals />} />
        <Route path="evaluations" element={<StudentEvaluations />} />
        <Route path="documents" element={<StudentDocuments />} />
        <Route path="profile" element={<Profile />} />
      </Routes>
    </Layout>
  )
}
