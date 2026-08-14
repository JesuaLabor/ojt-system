import { Routes, Route } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Overview from './Overview'
import FacultyStudents from './Students'
import FacultyEvaluations from './Evaluations'
import FacultyReports from './Reports'
import StaffJournals from '../common/StaffJournals'
import Profile from '../common/Profile'
import Announcements from '../common/Announcements'
import Messages from '../common/Messages'

export default function FacultyDashboard() {
  return (
    <Layout>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="overview" element={<Overview />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="messages" element={<Messages />} />
        <Route path="students" element={<FacultyStudents />} />
        <Route path="journals" element={<StaffJournals />} />
        <Route path="evaluations" element={<FacultyEvaluations />} />
        <Route path="reports" element={<FacultyReports />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Overview />} />
      </Routes>
    </Layout>
  )
}
