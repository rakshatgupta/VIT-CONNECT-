import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import TaskRequests from './components/TaskRequests';
import CampusProps from './components/CampusProps';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import Feedback from './pages/Feedback';
import Tasks from './pages/Tasks';
import useAuthStore from './store/authStore';
import { coreApi } from './api';

const LiveTracking = lazy(() => import('./pages/LiveTracking'));

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function ResetScroll() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  useEffect(() => {
    if (useAuthStore.getState().token) {
      coreApi.get('/auth/session').catch(() => {});
    }
  }, []);

  return (
    <Router>
      <ResetScroll />
      <div className="app-container">
        <Navbar />
        <TaskRequests />
        <CampusProps>
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />

              {/* Feedback uses student aliases and requires sign-in to read or post. */}
              <Route path="/feedback" element={<Feedback />} />

              <Route path="/tasks" element={<Tasks />} />
              {/* Tracking is available to signed-in task participants. */}
              <Route path="/tracking/:taskId" element={
                <PrivateRoute><Suspense fallback={<p role="status">Loading live tracking…</p>}><LiveTracking /></Suspense></PrivateRoute>
              } />
            </Routes>
          </main>
        </CampusProps>
      </div>
    </Router>
  );
}

export default App;
