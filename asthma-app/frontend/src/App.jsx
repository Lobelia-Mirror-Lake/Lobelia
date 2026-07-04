import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import AuthSlide from './components/AuthOffcanvas'
import DashboardLayout from './components/DashboardLayout'
import LandingPage from './components/pages/LandingPage'
import { MirrorLakeProvider, useMirrorLakeApp } from './context/MirrorLakeAppContext'
import CalendarPage from './components/pages/CalendarPage'
import HomePage from './components/pages/HomePage'
import ProfilePage from './components/pages/ProfilePage'
import StatisticsPage from './components/pages/StatisticsPage'

function LandingRoute() {
  const { isLoggedIn, openLogin, openSignUp } = useMirrorLakeApp()

  if (isLoggedIn) {
    return <Navigate to="/home" replace />
  }

  return (
    <>
      <LandingPage onLogin={openLogin} onSignUp={openSignUp} />
      <AuthSlide />
    </>
  )
}

function ProtectedRoute() {
  const { isLoggedIn } = useMirrorLakeApp()

  if (!isLoggedIn) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <MirrorLakeProvider>
        <div className="app-shell">
          <AppRoutes />
        </div>
      </MirrorLakeProvider>
    </BrowserRouter>
  )
}

export default App