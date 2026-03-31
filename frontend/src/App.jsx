import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Feedback from './pages/Feedback';
import Tasks from './pages/Tasks';
import LiveTracking from './pages/LiveTracking';
import useAuthStore from './store/authStore';

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Feedback is public/anonymous */}
            <Route path="/feedback" element={<Feedback />} />
            
            {/* Tasks and tracking are private */}
            <Route path="/tasks" element={
              <PrivateRoute><Tasks /></PrivateRoute>
            } />
            <Route path="/tracking/:taskId" element={
              <PrivateRoute><LiveTracking /></PrivateRoute>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
