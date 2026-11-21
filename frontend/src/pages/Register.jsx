import { GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { authApi } from '../api';
function Register() {
  const [formData, setFormData] = useState({ 
    name: '', anonymousAlias: '', email: '', regNo: '', phone: '', hostelBlock: '', roomNumber: '', password: '' 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();
  const { state } = useLocation();

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.post('/register', formData);
      login(data.token, data.user);
      navigate('/tasks', { replace: true });
    } catch (err) {
      setError(typeof err.response?.data === 'string' ? err.response.data : 'Unable to create your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <aside className="auth-side">
        <GraduationCap size={62} strokeWidth={1.35} aria-hidden="true" />
        <p>Join your campus portal</p>
      </aside>
      <section className="glass-card auth-card" aria-labelledby="account-title">
        <h1 id="account-title">Create an account</h1>
        {error && <div role="alert" style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}
        {state?.accountDeleted && <p className="mb-2" role="status">Account deleted. You can register again with your previous details.</p>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Full Name *</label>
            <input id="name" type="text" name="name" className="input-field" value={formData.name} onChange={handleChange} required />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="anonymousAlias" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Anonymous username *</label>
            <input id="anonymousAlias" type="text" name="anonymousAlias" className="input-field" value={formData.anonymousAlias} onChange={handleChange} placeholder="e.g. shadowstudent_99" minLength={3} maxLength={30} style={{ border: '1px solid var(--secondary)' }} required />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>VIT Email Address *</label>
            <input id="email" type="email" name="email" className="input-field" value={formData.email} onChange={handleChange} placeholder="name.surname202x@vitstudent.ac.in" pattern={String.raw`[a-zA-Z0-9]+(?:[._\-][a-zA-Z0-9]+)*@[vV][iI][tT][sS][tT][uU][dD][eE][nN][tT]\.[aA][cC]\.[iI][nN]`} required />
          </div>
          <div>
            <label htmlFor="regNo" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Reg. Number *</label>
            <input id="regNo" type="text" name="regNo" className="input-field" value={formData.regNo} onChange={handleChange} placeholder="e.g. 21BCE0000" required />
          </div>
          <div>
            <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Phone Number *</label>
            <input id="phone" type="tel" name="phone" className="input-field" value={formData.phone} onChange={handleChange} placeholder="10-digit Indian mobile number" autoComplete="tel" required />
          </div>
          <div>
            <label htmlFor="hostelBlock" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Hostel Block *</label>
            <input id="hostelBlock" type="text" name="hostelBlock" className="input-field" value={formData.hostelBlock} onChange={handleChange} placeholder="e.g. Q Block" required />
          </div>
          <div>
            <label htmlFor="roomNumber" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Room Number *</label>
            <input id="roomNumber" type="text" name="roomNumber" className="input-field" value={formData.roomNumber} onChange={handleChange} placeholder="e.g. 401" required />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Password *</label>
            <input id="password" type="password" name="password" className="input-field" value={formData.password} onChange={handleChange} placeholder="At least 8 characters" minLength={8} required />
          </div>
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </div>
        </form>
        <p className="text-center mt-4 text-sm">
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Login</Link>
        </p>
      </section>
    </div>
  );
}
export default Register;
