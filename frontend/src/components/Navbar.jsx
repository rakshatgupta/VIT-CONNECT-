import { Link, NavLink, useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header className="site-header">
      <nav className="navbar" aria-label="Main navigation">
        <Link className="brand" to="/"><span><GraduationCap size={23} aria-hidden="true" /></span> VIT Connect</Link>
        <div className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/feedback">Feedback</NavLink>
          <NavLink to="/tasks">Task allotment</NavLink>
        </div>
        <div className="nav-account">
          {isAuthenticated ? (
            <>
              <span className="account-id">{user?.regNo}</span>
              <button className="btn btn-secondary" onClick={() => { logout(); navigate('/'); }}>Sign out</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Sign in</NavLink>
              <Link className="btn" to="/register">Register</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
