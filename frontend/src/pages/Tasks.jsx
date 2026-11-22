import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { coreApi } from '../api';
import { MapPin, Clock, IndianRupee, ClipboardList, User as UserIcon, Phone } from 'lucide-react';

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  
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

  useEffect(() => {
    if (isAuthenticated) fetchTasks();
  }, [isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await coreApi.post('/tasks', formData);
      setFormData({ title: '', description: '', location: '', price: '', time: '' });
      setShowForm(false);
      fetchTasks();
    } catch (err) {
      console.error('Failed to post task', err);
    }
  };

  const handleAcceptTask = async (taskId) => {
    try {
      await coreApi.put(`/tasks/${taskId}/accept`);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to accept task');
    }
  };

  const renderWorkerDetails = (taskUser) => {
    if (!taskUser) return null;
    return (
      <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(147, 51, 234, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(147, 51, 234, 0.2)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserIcon size={14} color="var(--primary)" /> {taskUser.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={14} color="var(--primary)" /> Block: {taskUser.hostelBlock} - {taskUser.roomNumber}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: '1 / -1' }}><Phone size={14} color="var(--primary)" /> {taskUser.phone}</div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <header className="portal-heading">
        <div>
          <h1>Task allotment</h1>
          <p>Post a campus request or accept an open task from another student.</p>
        </div>
        {isAuthenticated ? <button onClick={() => setShowForm(!showForm)} className="btn" aria-expanded={showForm}>
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
          <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>New campus task</h3>
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
              <input type="number" placeholder="Offered Compensation (â‚¹)" className="input-field" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
            </div>
            <div>
              <input type="text" placeholder="Expected Time (e.g. Before 5:00 PM today)" className="input-field" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} required />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button type="submit" className="btn" style={{ width: '100%' }}>Publish task</button>
            </div>
          </form>
        </div>
      )}

      {isAuthenticated && (loading ? <p className="text-center mt-4">Loading active tasks...</p> : (
        <div className="task-grid">
          {tasks.length === 0 && <p className="empty-state">No active tasks yet. Post a task to get started.</p>}
          {tasks.map(task => {
            const isMyTask = task.requester._id === user?.id; // Note: user.id from JWT
            const isWorker = task.worker?._id === user?.id;
            
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
                <p className="text-sm" style={{ marginBottom: '1.5rem', flex: 1, lineHeight: 1.5 }}>{task.description}</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} /> {task.location}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} /> {task.time}</div>
                </div>

                {/* Identity Visibility Logic */}
                {(isMyTask || isWorker || task.status === 'Accepted' || task.status === 'In Progress') && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', marginTop: '1rem' }}>Task contacts</h4>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Requester:</strong>
                    {renderWorkerDetails(task.requester)}
                    
                    {task.worker && (
                      <div style={{ marginTop: '1rem' }}>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Assigned Worker:</strong>
                        {renderWorkerDetails(task.worker)}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                  {task.status === 'Open' && !isMyTask && (
                    <button onClick={() => handleAcceptTask(task._id)} className="btn" style={{ width: '100%', padding: '1rem' }}>Accept & Proceed</button>
                  )}
                  {(task.status === 'Accepted' || task.status === 'In Progress') && (isMyTask || isWorker) && (
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
    </div>
  );
}

export default Tasks;
