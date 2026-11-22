import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { coreApi } from '../api';

export default function Account() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function removeAccount(event) {
    event.preventDefault();
    if (!confirmed || busy) return;
    setBusy(true);
    setError('');
    try {
      await coreApi.delete('/auth/account', { data: { password } });
      logout();
      navigate('/register', { replace: true, state: { accountDeleted: true } });
    } catch (err) {
      setError(typeof err.response?.data === 'string' ? err.response.data : 'Unable to delete your account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="portal-heading">
        <div>
          <h1>Your account</h1>
          <p>{user?.email}</p>
        </div>
      </header>
      <form className="glass-card account-delete" onSubmit={removeAccount}>
        <h2>Delete your account</h2>
        <p>Deleting your account ends your active tasks and frees your email, phone number, and username for reuse. Previous feedback and completed tasks remain.</p>
        {error && <p role="alert" className="account-error">{error}</p>}
        <label htmlFor="delete-password">Current password</label>
        <input className="input-field" id="delete-password" type="password" autoComplete="current-password"
          required value={password} onChange={event => setPassword(event.target.value)} />
        <label className="account-confirm">
          <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} required />
          I understand that account deletion is permanent.
        </label>
        <button className="btn btn-danger" type="submit" disabled={!confirmed || !password || busy}>
          {busy ? 'Deleting account…' : 'Delete account'}
        </button>
      </form>
    </div>
  );
}
