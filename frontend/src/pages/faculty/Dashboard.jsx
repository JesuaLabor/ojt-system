import { Routes, Route } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import Overview from './Overview'
import FacultyStudents from './Students'
import FacultyEvaluations from './Evaluations'
import FacultyReports from './Reports'

export default function FacultyDashboard() {
  return (
    <Layout>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="students" element={<FacultyStudents />} />
        <Route path="evaluations" element={<FacultyEvaluations />} />
        <Route path="reports" element={<FacultyReports />} />
      </Routes>
    </Layout>
  )
}
