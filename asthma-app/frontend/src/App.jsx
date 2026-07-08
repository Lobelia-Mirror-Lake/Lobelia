import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { useEffect } from 'react';
import AuthSlide from './components/landing/AuthSlide';
import DashboardLayout from './components/DashboardLayout';
import LandingPage from './components/pages/LandingPage';
import CalendarPage from './components/pages/CalendarPage';
import HomePage from './components/pages/HomePage';
import ProfilePage from './components/pages/ProfilePage';
import StatisticsPage from './components/pages/StatisticsPage';
import { preloadAudio } from './helper-functions/playAudio';
import ProtectedRoute from './components/routes/ProtectedRoute';
import PublicRoute from './components/routes/PublicRoute';
import NotFoundPage from './components/pages/NotFoundPage';
import SetupPage from './components/pages/SetupPage';

function App() {
  // preload sounds
  useEffect(() => {
    preloadAudio();
  }, []);

  // normalize non-hash URLs
  useEffect(() => {
    const base = "/Mirror-Lake";
    const { pathname, search, hash } = window.location;

    if (!hash && pathname.startsWith(base) && pathname !== base && pathname !== `${base}/`) {
      const path = pathname.slice(base.length);
      window.location.replace(`${base}/#${path}${search}`);
    }
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/setup" element={<SetupPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </HashRouter>
  )
}

export default App