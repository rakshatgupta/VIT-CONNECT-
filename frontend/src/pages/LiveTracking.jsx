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
  const socketRef = useRef(null);
  const geoWatchRef = useRef(null);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await coreApi.get('/tasks');
        const currentTask = res.data.find(t => t._id === taskId);
        if (currentTask) {
          setTask(currentTask);
          const workerId = currentTask.worker?._id || currentTask.worker;
          const isUserWorker = workerId === user?.id;
          setIsWorker(isUserWorker);
          
          if (isUserWorker && !isTracking) {
             startForcedTracking(currentTask);
          }
        } else {
          navigate('/tasks');
        }
      } catch (err) {
        console.error('Error fetching task', err);
      }
    };
    fetchTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, user]);

  useEffect(() => {
    if (!task) return;
    
    socketRef.current = io('http://localhost:5000');
    socketRef.current.emit('joinTaskRoom', taskId);

    if (!isWorker) {
      socketRef.current.on('receiveLocation', (loc) => {
        setWorkerLocation([loc.lat, loc.lng]);
      });
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (geoWatchRef.current) navigator.geolocation.clearWatch(geoWatchRef.current);
    };
  }, [task, taskId, isWorker]);

  const startForcedTracking = (currentTask) => {
      if (navigator.geolocation) {
        setIsTracking(true);
        if (currentTask.status === "Open" || currentTask.status === "Accepted") {
          coreApi.put(`/tasks/${taskId}/status`, { status: "In Progress" });
        }
        geoWatchRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const newLoc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setWorkerLocation([newLoc.lat, newLoc.lng]);
            if (socketRef.current) {
              socketRef.current.emit('sendLocation', { taskId, location: newLoc });
            }
          },
          (err) => console.error(err),
          { enableHighAccuracy: true, maximumAge: 0 }
        );
      } else {
        alert("Geolocation is not supported by your browser");
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

  if (!task) return <div className="text-center mt-4" style={{ color: 'var(--text-secondary)' }}>Initializing Live Tracking Module...</div>;

  return (
    <div style={{ padding: '1rem 0' }}>
      <div className="flex-between mb-4" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>Live Tracking Feed</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Task: <strong style={{ color: 'var(--text-primary)' }}>{task.title}</strong> • Path: <strong style={{ color: 'var(--text-primary)' }}>{task.location}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           {!isWorker && task.status !== "Completed" && (
             <button onClick={markCompleted} className="btn" style={{ background: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <CheckCircle size={18} /> Finish Task (Requester Only)
             </button>
           )}
        </div>
      </div>
      
      <div className="glass-card mb-4" style={{ borderLeft: `4px solid var(--${isWorker ? 'primary' : 'success'})` }}>
        {isWorker ? (
          <p className="text-sm">You are the <strong>Assigned Worker</strong>. Location tracking is automatically streaming to the requester until completion.</p>
        ) : (
          <p className="text-sm">You are the <strong>Requester</strong>. Awaiting real-time geospatial telemetry from the worker's device.</p>
        )}
      </div>

      <div className="map-container" style={{ 
          opacity: workerLocation ? 1 : 0.8,
          transition: 'all 0.5s ease',
          height: '500px',
          width: '100%',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
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
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(5px)' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(147, 51, 234, 0.3)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
            <p className="text-secondary">Establishing connection to positioning network...</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveTracking;
