import { Routes, Route } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Overview from './Overview'
import FacultyStudents from './Students'
import FacultyEvaluations from './Evaluations'
import FacultyReports from './Reports'
import Profile from '../common/Profile'

export default function FacultyDashboard() {
  return (
    <Layout>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="students" element={<FacultyStudents />} />
        <Route path="evaluations" element={<FacultyEvaluations />} />
        <Route path="reports" element={<FacultyReports />} />
        <Route path="profile" element={<Profile />} />
      </Routes>
    </Layout>
  )
}
