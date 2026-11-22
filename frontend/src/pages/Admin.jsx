import { useEffect, useState } from 'react';
import axios from 'axios';

const adminApi = axios.create({ baseURL: '/api/admin' });

export default function Admin() {
  const [token, setToken] = useState('');
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    let active = true;
    adminApi.get('/content', { headers: { Authorization: `Bearer ${token}` } }).then(({ data }) => {
      if (active) setContent(data);
    }).catch(err => {
      if (!active) return;
      if (err.response?.status === 401) setToken('');
      setError(err.response?.data?.msg || 'Unable to load content.');
    });
    return () => { active = false; };
  }, [token]);

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const form = event.currentTarget;
      const { data } = await adminApi.post('/login', Object.fromEntries(new FormData(form)));
      form.reset();
      setToken(data.token);
    } catch (err) {
      setError(err.response?.data?.msg || 'Unable to sign in.');
    } finally { setBusy(false); }
  }

  async function remove(kind, id) {
    if (!window.confirm(`Permanently delete this ${kind === 'tasks' ? 'task' : 'feedback post'}?`)) return;
    setBusy(true);
    setError('');
    try {
      await adminApi.delete(`/${kind}/${id}`, { headers });
      setContent(current => ({ ...current, [kind]: current[kind].filter(item => item._id !== id) }));
    } catch (err) {
      if (err.response?.status === 401) { setContent(null); setToken(''); }
      setError(err.response?.data?.msg || 'Unable to delete this item.');
    } finally { setBusy(false); }
  }

  return (
    <div>
      <header className="portal-heading">
        <div><h1>Administration</h1><p>Manage campus tasks and feedback.</p></div>
        {token && <button className="btn btn-secondary" onClick={() => { setContent(null); setToken(''); setError(''); }}>Admin sign out</button>}
      </header>
      {error && <p className="mb-2" role="alert">{error}</p>}
      {!token ? (
        <form className="glass-card account-delete" onSubmit={signIn}>
          <label htmlFor="admin-id">Admin login ID</label>
          <input id="admin-id" className="input-field" autoComplete="username" name="loginId" required />
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" className="input-field" name="password" type="password" autoComplete="current-password" required />
          <button className="btn" disabled={busy}>Sign in as admin</button>
        </form>
      ) : content ? (
        <div className="feedback-layout">
          {['tasks', 'feedback'].map(kind => (
            <section className="glass-card" key={kind}>
              <h2 className="mb-2">{kind === 'tasks' ? 'Tasks' : 'Feedback'}</h2>
              {!content[kind].length && <p>No items to display.</p>}
              {content[kind].map(item => (
                <article className="admin-item" key={item._id}>
                  <p className="text-sm">{kind === 'tasks' ? `${item.status} · ${item.requester?.name || 'Former user'}` : `${item.category} · ${item.authorAlias}`}</p>
                  <p>{item.title || item.text}</p>
                  <button className="btn btn-danger" disabled={busy} onClick={() => remove(kind, item._id)}>Delete {kind === 'tasks' ? 'task' : 'feedback'}</button>
                </article>
              ))}
            </section>
          ))}
        </div>
      ) : !error && <p role="status">Loading content…</p>}
    </div>
  );
}
