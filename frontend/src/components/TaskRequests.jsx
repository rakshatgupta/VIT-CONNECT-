import { useEffect, useRef, useState } from 'react';
import { coreApi } from '../api';
import useAuthStore from '../store/authStore';

export default function TaskRequests() {
  const userId = useAuthStore(state => state.user?.id);
  const [requests, setRequests] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const refresh = async () => {
      try {
        const { data } = await coreApi.get('/tasks/requests');
        if (active) setRequests(data);
      } catch {
        // A transient failure can be retried on the next poll.
      }
    };
    refresh();
    const timer = setInterval(refresh, 8000);
    return () => { active = false; clearInterval(timer); };
  }, [userId]);

  const request = userId && requests.find(item => item.owner === userId && !dismissed.includes(item.id));
  useEffect(() => {
    const element = dialog.current;
    if (request && element && !element.open) element.showModal();
  }, [request]);

  async function decide(approve) {
    setBusy(true);
    setError('');
    try {
      await coreApi.put(`/tasks/${request.task}/offers/${request.id}`, { approve });
      setRequests(items => items.filter(item => approve ? item.task !== request.task : item.id !== request.id));
      window.dispatchEvent(new Event('campus-tasks-changed'));
    } catch (err) {
      setError(err.response?.data?.msg || 'Could not save your decision.');
    } finally {
      setBusy(false);
    }
  }

  if (!request) return null;
  return (
    <dialog ref={dialog} className="glass-card task-dialog" aria-labelledby="request-title"
      onCancel={event => { event.preventDefault(); setDismissed(items => [...items, request.id]); setError(''); }}>
      <h2 id="request-title">New task request</h2>
      <p><strong>{request.applicant}</strong> wants to take <strong>{request.title}</strong>.</p>
      <p>Final amount <strong>₹{request.total}</strong> {request.extra > 0 && `(includes ₹${request.extra} extra)`}</p>
      <p><a href="/tasks#worker-reviews" onClick={() => setDismissed(items => [...items, request.id])}>See worker reviews</a></p>
      {error && <p role="alert">{error}</p>}
      <div className="button-row">
        <button className="btn" disabled={busy} onClick={() => decide(true)}>Approve</button>
        <button className="btn btn-secondary" disabled={busy} onClick={() => decide(false)}>Decline</button>
        <button className="btn btn-secondary" disabled={busy} onClick={() => { setDismissed(items => [...items, request.id]); setError(''); }}>Later</button>
      </div>
    </dialog>
  );
}
