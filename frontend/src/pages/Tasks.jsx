import TaskWhatsApp from '../components/TaskWhatsApp';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { coreApi } from '../api';
import { MapPin, Clock, IndianRupee, ClipboardList } from 'lucide-react';

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '', description: '', location: '', price: '', time: ''
  });

  const fetchTasks = async () => {
    try {
      const res = await coreApi.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = () => coreApi.get('/tasks/reviews').then(({ data }) => setReviews(data)).catch(console.error);
  useEffect(() => { fetchReviews(); }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchTasks();
    const timer = setInterval(fetchTasks, 8000);
    window.addEventListener('campus-tasks-changed', fetchTasks);
    return () => {
      clearInterval(timer);
      window.removeEventListener('campus-tasks-changed', fetchTasks);
    };
  }, [isAuthenticated]);

  function openForm(task) {
    setEditId(task?._id || null);
    setFormData(task ? {
      title: task.title, description: task.description, location: task.location, price: String(task.price), time: task.time
    } : { title: '', description: '', location: '', price: '', time: '' });
    setShowForm(true);
    window.scrollTo(0, 0);
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice('');
    try {
      if (editId) {
        await coreApi.put(`/tasks/${editId}`, formData);
      } else {
        await coreApi.post('/tasks', formData);
      }
      setNotice(editId ? 'Task updated.' : 'Task published.');
      setShowForm(false);
      await fetchTasks();
    } catch (err) {
      setNotice(err.response?.data?.msg || 'Unable to save the task.');
    } finally {
      setSaving(false);
    }
  };

  async function taskAction(action, success) {
    setNotice('');
    try {
      await action();
      setNotice(success);
      await fetchTasks();
    } catch (err) {
      setNotice(err.response?.data?.msg || 'Could not save your changes.');
    }
  }

  const visibleTasks = tasks.filter(task => completed === (task.status === 'Completed'));

  return (
    <div>
      <header className="portal-heading">
        <div>
          <h1>Task allotment</h1>
          <p>Post a task, review applicants, or request to take an open task.</p>
        </div>
        {isAuthenticated ? <button onClick={() => showForm ? setShowForm(false) : openForm()} className="btn" aria-expanded={showForm}>
          {showForm ? 'Cancel' : 'Post a task'}
        </button> : <span className="heading-mark"><ClipboardList aria-hidden="true" /></span>}
      </header>

      {!isAuthenticated && (
        <div className="empty-state">
          <p>Sign in to browse, post, or accept campus tasks.</p>
          <Link className="btn" to="/login">Sign in</Link>
        </div>
      )}

      {isAuthenticated && showForm && (
        <div className="glass-card mb-4">
          <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>{editId ? 'Edit task' : 'New campus task'}</h3>
          {editId && <p className="text-sm mb-2">Saving changes clears existing requests so applicants can review the updated task.</p>}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <input type="text" placeholder="Task Title (e.g., Collect Parcel from Main Gate)" className="input-field" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <textarea placeholder="Specific directions or instructions for the worker..." className="input-field" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required rows={3} style={{ resize: 'vertical' }} />
            </div>
            <div>
              <input type="text" placeholder="Route / Location (e.g. Main Gate -> Q Block)" className="input-field" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required />
            </div>
            <div>
              <input type="number" min="0" max="9999999" step="0.01" placeholder="Offered Compensation (₹)" className="input-field" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
            </div>
            <div>
              <input type="text" placeholder="Expected Time (e.g. Before 5:00 PM today)" className="input-field" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} required />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button type="submit" className="btn" disabled={saving} style={{ width: '100%' }}>{editId ? 'Save changes' : 'Publish task'}</button>
            </div>
          </form>
        </div>
      )}

      {isAuthenticated && (
        <div className="button-row mb-2">
          <button className="btn btn-secondary" aria-pressed={!completed} onClick={() => setCompleted(false)}>Active tasks</button>
          <button className="btn btn-secondary" aria-pressed={completed} onClick={() => setCompleted(true)}>Completed tasks</button>
          <a href="#worker-reviews">Worker reviews</a>
        </div>
      )}
      {notice && <p role="status" className="mb-2">{notice}</p>}

      {isAuthenticated && (loading ? <p className="text-center mt-4">Loading active tasks...</p> : (
        <div className="task-grid">
          {visibleTasks.length === 0 && <p className="empty-state">{completed ? 'No completed tasks yet.' : 'No active tasks yet.'}</p>}
          {visibleTasks.map(task => {
            const isMyTask = task.requester?._id === user?.id;
            const isWorker = task.worker?._id === user?.id;
            const pending = task.offers?.filter(offer => offer.status === 'Pending') || [];
            const assigned = task.status === 'Accepted' || task.status === 'In Progress';
            const contact = assigned && (isMyTask ? task.worker : isWorker ? task.requester : null);
            
            return (
              <div key={task._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="flex-between mb-2">
                  <span style={{ 
                    padding: '0.3rem 0.8rem', 
                    borderRadius: '20px', 
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: task.status === 'Open' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: task.status === 'Open' ? 'var(--success)' : '#f59e0b',
                    border: `1px solid ${task.status === 'Open' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)'}`
                  }}>
                    {task.status.toUpperCase()}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', fontSize: '1.2rem' }}>
                    <IndianRupee size={18} />{task.price}
                  </span>
                </div>
                
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', marginTop: '0.5rem' }}>{task.title}</h3>
                <p className="text-sm mb-2">Posted by <strong>{task.requester?.name || 'Former user'}</strong></p>
                <p className="text-sm" style={{ marginBottom: '1.5rem', flex: 1, lineHeight: 1.5 }}>{task.description}</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} /> {task.location}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} /> {task.time}</div>
                </div>

                {contact && (
                  <div className="task-chat">
                    <div>
                      <p className="text-sm">{isMyTask ? 'Assigned worker' : 'Requester'}</p>
                      <strong>{contact.name}</strong>
                    </div>
                    <TaskWhatsApp contact={contact} />
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                  {task.status === 'Open' && !isMyTask && (pending.length ? (
                    <p role="status">Request pending owner approval.</p>
                  ) : (
                    <form className="task-controls" onSubmit={event => {
                      event.preventDefault();
                      const extra = new FormData(event.currentTarget).get('extra') || '0';
                      taskAction(() => coreApi.put(`/tasks/${task._id}/accept`, { extra }), 'Request sent to the task owner.');
                    }}>
                      {task.offers?.some(offer => offer.status === 'Declined') && <p>Your earlier request was declined.</p>}
                      <label>Additional pay requested (₹)
                        <input className="input-field" name="extra" type="number" min="0" max="9999999" step="0.01" defaultValue="0" />
                      </label>
                      <button className="btn">Request to take task</button>
                    </form>
                  ))}
                  {task.status === 'Open' && isMyTask && (
                    <div className="button-row mb-2">
                      <button className="btn btn-secondary" onClick={() => openForm(task)}>Edit task</button>
                      <button className="btn btn-danger" onClick={() => {
                        if (window.confirm('Permanently delete this task?')) {
                          taskAction(() => coreApi.delete(`/tasks/${task._id}`), 'Task deleted.');
                        }
                      }}>Delete task</button>
                    </div>
                  )}
                  {task.status === 'Open' && isMyTask && pending.map(offer => (
                    <div key={offer._id} className="task-controls">
                      <p><strong>{offer.applicant.name}</strong> requests a final amount of ₹{((task.price + offer.extra).toFixed(2))}.</p>
                      <div className="button-row">
                        <button className="btn" onClick={() => taskAction(() => coreApi.put(`/tasks/${task._id}/offers/${offer._id}`, { approve: true }), 'Task assigned.')}>Approve</button>
                        <button className="btn btn-secondary" onClick={() => taskAction(() => coreApi.put(`/tasks/${task._id}/offers/${offer._id}`, { approve: false }), 'Request declined.')}>Decline</button>
                      </div>
                    </div>
                  ))}
                  {completed && task.worker && <p className="text-sm">Completed by {task.worker.name}</p>}
                  {completed && task.review?.stars && <p>Review: {task.review.stars}/5 stars {task.review.comment && `· ${task.review.comment}`}</p>}
                  {completed && isMyTask && task.worker && !task.review?.stars && (
                    <form className="task-controls" onSubmit={event => {
                      event.preventDefault();
                      const values = new FormData(event.currentTarget);
                      taskAction(async () => {
                        await coreApi.post(`/tasks/${task._id}/review`, { stars: Number(values.get('stars')), comment: values.get('comment') });
                        await fetchReviews();
                      }, 'Review published.');
                    }}>
                      <label>Rating
                        <select className="select-field" name="stars" required defaultValue="">
                          <option value="" disabled>Choose a rating</option>
                          {[5, 4, 3, 2, 1].map(stars => <option key={stars} value={stars}>{stars} / 5 stars</option>)}
                        </select>
                      </label>
                      <label>Short public comment
                        <textarea name="comment" maxLength={280} rows={2} placeholder="Optional" />
                      </label>
                      <button className="btn">Publish review</button>
                    </form>
                  )}
                  {assigned && isMyTask && <button className="btn mb-2" onClick={async () => {
                    if (!window.confirm('Mark this task completed?')) return;
                    await taskAction(async () => {
                      await coreApi.put(`/tasks/${task._id}/status`, { status: 'Completed' });
                      setCompleted(true);
                    }, 'Task moved to Completed tasks.');
                  }}>Mark completed</button>}
                  {assigned && (isMyTask || isWorker) && (
                    <button onClick={() => navigate(`/tracking/${task._id}`)} className="btn btn-secondary" style={{ width: '100%', padding: '1rem', background: 'var(--primary)', color: 'white' }}>
                      <MapPin size={18} style={{ marginRight: '0.5rem' }} /> Access Live Tracking Control
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <section id="worker-reviews" className="task-reviews" aria-labelledby="worker-reviews-title">
        <h2 id="worker-reviews-title">Worker reviews</h2>
        {reviews.length === 0 && <p className="text-sm">No worker reviews yet.</p>}
        <div className="task-grid">
          {reviews.map(review => <article className="glass-card" key={review.id}>
            <h3>{review.worker}</h3>
            <p aria-label={`${review.stars} out of 5 stars`} className="task-stars">{'★'.repeat(review.stars)}{'☆'.repeat(5 - review.stars)} <span>{review.stars}/5</span></p>
            {review.comment && <p>{review.comment}</p>}
          </article>)}
        </div>
      </section>
    </div>
  );
}

export default Tasks;
