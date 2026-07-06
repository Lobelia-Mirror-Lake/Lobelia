import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import AuthSlide from './components/landing/AuthSlide'
import DashboardLayout from './components/DashboardLayout'
import LandingPage from './components/pages/LandingPage'
import CalendarPage from './components/pages/CalendarPage'
import HomePage from './components/pages/HomePage'
import ProfilePage from './components/pages/ProfilePage'
import StatisticsPage from './components/pages/StatisticsPage'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<DashboardLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App