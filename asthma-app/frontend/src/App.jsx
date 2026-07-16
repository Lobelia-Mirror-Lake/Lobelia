import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { useEffect } from 'react';
import AuthSlide from './components/landing/AuthSlide';
import DashboardLayout from './components/DashboardLayout';
import LandingPage from './components/pages/LandingPage';
import CalendarPage from './components/pages/CalendarPage';
import HomePage from './components/pages/HomePage';
import ProfilePage from './components/pages/ProfilePage';
import StatisticsPage from './components/pages/StatisticsPage';
import { preloadAudio } from "./helper-functions/playAudio";
import DashboardRoute from './components/routes/DashboardRoute';
import { SetupRoute } from './components/routes/SetupRoute';
import PublicRoute from './components/routes/PublicRoute';
import NotFoundPage from './components/pages/NotFoundPage';
import SetupPage from './components/pages/SetupPage';
import { urls } from './constants';

function App() {
  // preload sounds
  useEffect(() => {
    const preload = () => preloadAudio();

    window.addEventListener("pointerdown", preload, { once: true });
    window.addEventListener("keydown", preload, { once: true });

    return () => {
      window.removeEventListener("pointerdown", preload);
      window.removeEventListener("keydown", preload);
    };
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
          <Route path={urls.landing} element={<LandingPage />} />
        </Route>

        <Route element={<SetupRoute />}>
          <Route path={urls.setup} element={<SetupPage />} />
        </Route>

        <Route element={<DashboardRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path={urls.home} element={<HomePage />} />
            <Route path={urls.statistics} element={<StatisticsPage />} />
            <Route path={urls.calendar} element={<CalendarPage />} />
            <Route path={urls.profile} element={<ProfilePage />} />
          </Route>
        </Route>
        
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </HashRouter>
  )
}

export default App