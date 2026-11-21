import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import useAuthStore from '../store/authStore';
import { coreApi } from '../api';
import L from 'leaflet';
import { CheckCircle } from 'lucide-react';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0) {
      map.setView(center, 16);
    }
  }, [center, map]);
  return null;
}

function LiveTracking() {
  const { taskId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [task, setTask] = useState(null);
  const [workerLocation, setWorkerLocation] = useState(null);
  const [isWorker, setIsWorker] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const socketRef = useRef(null);
  const geoWatchRef = useRef(null);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await coreApi.get('/tasks');
        const currentTask = res.data.find(t => t._id === taskId);
        if (currentTask?.worker && [currentTask.requester?._id, currentTask.worker?._id].includes(user?.id)) {
          setTask(currentTask);
          const workerId = currentTask.worker?._id || currentTask.worker;
          const isUserWorker = workerId === user?.id;
          setIsWorker(isUserWorker);
          
        } else {
          navigate('/tasks');
        }
      } catch (err) {
        setTrackingError('Unable to load this task.');
      }
    };
    fetchTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, user]);

  useEffect(() => {
    if (!task) return;
    
    const socket = io({ auth: { token: localStorage.getItem('token') } });
    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('joinTaskRoom', taskId, (result) => setTrackingError(result.error || ''));
    });
    socket.on('connect_error', () => setTrackingError('Unable to connect to live tracking.'));
    if (!isWorker) {
      socket.on('receiveLocation', (loc) => setWorkerLocation([loc.lat, loc.lng]));
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (geoWatchRef.current !== null) navigator.geolocation.clearWatch(geoWatchRef.current);
      geoWatchRef.current = null;
    };
  }, [task, taskId, isWorker]);

  const stopSharing = () => {
    if (geoWatchRef.current !== null) navigator.geolocation.clearWatch(geoWatchRef.current);
    geoWatchRef.current = null;
    setIsTracking(false);
  };

  const startSharing = async () => {
    const socket = socketRef.current;
    if (!navigator.geolocation || !socket?.connected) {
      setTrackingError('Live location requires a connected browser with geolocation enabled.');
      return;
    }
    setTrackingError('');
    setIsTracking(true);
    try {
      if (task.status === 'Accepted') await coreApi.put(`/tasks/${taskId}/status`, { status: 'In Progress' });
      if (socketRef.current !== socket) return;
      geoWatchRef.current = navigator.geolocation.watchPosition(
        ({ coords }) => {
          const location = { lat: coords.latitude, lng: coords.longitude };
          setWorkerLocation([location.lat, location.lng]);
          socketRef.current?.volatile.emit('sendLocation', { taskId, location });
        },
        () => {
          stopSharing();
          setTrackingError('Location unavailable. Check your browser permissions and try again.');
        },
        { enableHighAccuracy: true }
      );
    } catch {
      stopSharing();
      setTrackingError('Unable to start live tracking.');
    }
  };

  const markCompleted = async () => {
    try {
      await coreApi.put(`/tasks/${taskId}/status`, { status: "Completed" });
      alert("Task marked as completed");
      navigate('/tasks');
    } catch (err) {
      console.error(err);
      alert("Failed to mark task completed");
    }
  };

  if (!task) return <div className="text-center mt-4" style={{ color: 'var(--text-secondary)' }}>{trackingError || "Loading live trackingÃ¢â‚¬Â¦"}</div>;

  return (
    <div style={{ padding: '1rem 0' }}>
      <header className="portal-heading">
        <div>
          <h1>Live task tracking</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Task: <strong style={{ color: 'var(--text-primary)' }}>{task.title}</strong> Ã¢â‚¬Â¢ Path: <strong style={{ color: 'var(--text-primary)' }}>{task.location}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           {!isWorker && task.status !== "Completed" && (
             <button onClick={markCompleted} className="btn" style={{ background: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <CheckCircle size={18} /> Complete task
             </button>
           )}
        </div>
      </header>
      
      <div className="glass-card mb-4" style={{ borderLeft: `4px solid var(--${isWorker ? 'primary' : 'success'})` }}>
        {isWorker ? (
          <p className="text-sm">You are the <strong>Assigned Worker</strong>. Share your current location with the requester while you work on the task.</p>
        ) : (
          <p className="text-sm">You are the <strong>Requester</strong>. Waiting for the worker to share their location.</p>
        )}
      </div>

      {isWorker && (
        <button type="button" className="btn mb-2" onClick={isTracking ? stopSharing : startSharing}>
          {isTracking ? 'Stop sharing' : 'Share live location'}
        </button>
      )}
      {trackingError && <p className="mb-2" role="alert">{trackingError}</p>}
      <div className="map-container" style={{ 
          opacity: workerLocation ? 1 : 0.8,
          transition: 'all 0.5s ease',
          height: '500px',
          width: '100%',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--glass-border)'
      }}>
        {workerLocation ? (
          <MapContainer center={workerLocation} zoom={16} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ChangeView center={workerLocation} />
            <Marker position={workerLocation}>
              <Popup>{isWorker ? 'Your Live Position' : 'Worker Live Position'}</Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-hover)' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(147, 51, 234, 0.3)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
            <p className="text-secondary">Waiting for a shared locationÃ¢â‚¬Â¦</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveTracking;
