import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { Home as HomeIcon, MessageSquare, Briefcase, LogOut, LogIn, UserPlus, GraduationCap } from 'lucide-react';

function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar flex-between">
      <Link to="/" style={{ textDecoration: 'none' }}>
        <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GraduationCap size={26} aria-hidden="true" /> VIT Connect
        </h2>
      </Link>
      
      <div className="nav-links">
        <Link to="/" style={{ color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', gap: '4px', alignItems: 'center' }}>
          <HomeIcon size={18} /> Home
        </Link>
        <Link to="/feedback" style={{ color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', gap: '4px', alignItems: 'center' }}>
          <MessageSquare size={18} /> Feedback
        </Link>
        
        {isAuthenticated ? (
          <>
            <Link to="/tasks" style={{ color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', gap: '4px', alignItems: 'center' }}>
              <Briefcase size={18} /> Tasks
            </Link>
            <span style={{ color: 'var(--secondary)' }}>{user?.regNo || 'User'}</span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '14px' }}>
              <LogOut size={16} /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '14px' }}>
              <LogIn size={16} /> Login
            </Link>
            <Link to="/register" className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '14px' }}>
              <UserPlus size={16} /> Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
