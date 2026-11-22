import { GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { authApi } from '../api';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const { state } = useLocation();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await authApi.post('/login', formData);
      login(res.data.token, res.data.user);
      navigate(state?.from === '/feedback' ? '/feedback' : '/tasks', { replace: true });
    } catch (err) {
      setError(err.response?.data || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <aside className="auth-side">
        <GraduationCap size={62} strokeWidth={1.35} aria-hidden="true" />
        <p>Campus Connect student portal</p>
      </aside>
      <section className="glass-card auth-card" aria-labelledby="account-title">
        <h1 id="account-title">Sign in</h1>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Email address</label>
            <input id="email"
              type="email"
              autoComplete="username"
              name="email"
              className="input-field"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Password</label>
            <input id="password"
              type="password"
              name="password"
              className="input-field"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm">
          Don't have an account? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '600' }}>Register</Link>
        </p>
      </section>
    </div>
  );
}

export default Login;
