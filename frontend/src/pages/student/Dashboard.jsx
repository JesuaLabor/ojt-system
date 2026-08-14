import { Routes, Route } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Overview from './Overview'
import TimeLogs from './TimeLogs'
import StudentEvaluations from './Evaluations'
import StudentDocuments from './Documents'
import StudentJournals from './Journals'
import Profile from '../common/Profile'
import Announcements from '../common/Announcements'
import Messages from '../common/Messages'



export default function StudentDashboard() {
  return (
    <Layout>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="overview" element={<Overview />} />
        <Route path="timelogs" element={<TimeLogs />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="messages" element={<Messages />} />
        <Route path="journals" element={<StudentJournals />} />
        <Route path="evaluations" element={<StudentEvaluations />} />
        <Route path="documents" element={<StudentDocuments />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Overview />} />
      </Routes>
    </Layout>
  )
}
