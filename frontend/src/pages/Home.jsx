import { Link } from 'react-router-dom';

function Home() {
  return (
    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h1 className="text-gradient" style={{ fontSize: '3.5rem', marginBottom: '1rem', fontWeight: 700 }}>
        Welcome to VIT Connect
      </h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 3rem', lineHeight: '1.6' }}>
        The ultimate campus platform for VIT Vellore students. Share anonymous feedback, find help on tasks, and track them live!
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
        <div className="glass-card" style={{ maxWidth: '350px', textAlign: 'left' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Anonymous Feedback</h3>
          <p className="text-sm mb-4" style={{ lineHeight: '1.5' }}>Voice your opinions on mess food, faculties, and campus life safely and anonymously without any fear.</p>
          <Link to="/feedback" className="btn btn-secondary" style={{ width: '100%' }}>Go to Feedback</Link>
        </div>
        
        <div className="glass-card" style={{ maxWidth: '350px', textAlign: 'left' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Task Marketplace</h3>
          <p className="text-sm mb-4" style={{ lineHeight: '1.5' }}>Need a package from the main gate? Post a task and get a second person to help you out.</p>
          <Link to="/tasks" className="btn" style={{ width: '100%' }}>Explore Tasks</Link>
        </div>
      </div>
    </div>
  );
}

export default Home;
