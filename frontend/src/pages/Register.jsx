import { GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { authApi } from '../api';
function Register() {
  const [formData, setFormData] = useState({ 
    name: '', anonymousAlias: '', email: '', regNo: '', phone: '', hostelBlock: '', roomNumber: '', password: '' 
  });
  const [challengeId, setChallengeId] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const decodeJwt = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  };
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await authApi.post('/send-otp', formData);
      setSuccess(res.data.msg);
      setChallengeId(res.data.challengeId);
    } catch (err) {
      setError(err.response?.data || 'Failed to generate OTP');
    } finally {
      setLoading(false);
    }
  };
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authApi.post('/verify-register', { email: formData.email, challengeId, otp: otpInput });
      const token = res.data.token;
      const decodedUser = decodeJwt(token)?.user;
      login(token, decodedUser);
      navigate('/tasks');
    } catch (err) {
      setError(err.response?.data || 'Invalid OTP');
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
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}
        {success && <div style={{ color: 'var(--success)', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{success}</div>}
        {!challengeId ? (
          <form onSubmit={handleSendOtp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Full Name *</label>
              <input id="name" type="text" name="name" className="input-field" value={formData.name} onChange={handleChange} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="anonymousAlias" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Unique Anonymous Alias (For Forums) *</label>
              <input id="anonymousAlias" type="text" name="anonymousAlias" className="input-field" value={formData.anonymousAlias} onChange={handleChange} placeholder="e.g. ShadowStudent_99" style={{ border: '1px solid var(--secondary)' }} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>VIT Email Address *</label>
              <input id="email" type="email" name="email" className="input-field" value={formData.email} onChange={handleChange} placeholder="name.surname202x@vitstudent.ac.in" required />
            </div>
            <div>
              <label htmlFor="regNo" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Reg. Number *</label>
              <input id="regNo" type="text" name="regNo" className="input-field" value={formData.regNo} onChange={handleChange} placeholder="e.g. 21BCE0000" required />
            </div>
            <div>
              <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Phone Number *</label>
              <input id="phone" type="tel" name="phone" className="input-field" value={formData.phone} onChange={handleChange} placeholder="10-digit number" required />
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
                {loading ? 'Validating...' : 'Send verification code'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p className="text-center text-sm mb-4">Enter the six-digit code for <strong>{formData.email}</strong>.</p>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>Six-digit verification code</label>
              <input aria-label="Six-digit verification code" type="text" className="input-field" style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value)} required />
            </div>
            <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Finalize Registration'}
            </button>
            <button type="button" onClick={() => setChallengeId(null)} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Go Back
            </button>
          </form>
        )}
        <p className="text-center mt-4 text-sm">
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Login</Link>
        </p>
      </section>
    </div>
  );
}
export default Register;
