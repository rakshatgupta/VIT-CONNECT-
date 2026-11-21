import { Link } from 'react-router-dom';
import './Home.css';
import { BookOpen, Check, ClipboardList, GraduationCap, MessageSquare } from 'lucide-react';

export default function Home() {
  return (
    <div className="campus-home">
      <section className="campus-hero" aria-labelledby="campus-title">
        <div className="hero-copy">
          <p className="eyebrow">VIT Vellore student portal</p>
          <h1 id="campus-title">Campus life,<br /><span>connected.</span></h1>
          <p>Share feedback about college life, find a hand with campus tasks, or lend one to another student.</p>
          <div className="button-row">
            <Link className="btn" to="/feedback">Campus feedback</Link>
            <Link className="btn btn-secondary" to="/tasks">Browse tasks</Link>
          </div>
        </div>
        <div className="campus-art" aria-hidden="true">
          <div className="art-halo" />
          <div className="art-bubble"><i /><i /><i /></div>
          <div className="art-board">
            <div className="art-clip" />
            <div className="art-paper">{[0, 1, 2].map(row => <div className="art-row" key={row}><span>{row < 2 && <Check />}</span><i /></div>)}</div>
          </div>
          <div className="art-books"><div /><div /><div /></div>
          <div className="art-cap"><GraduationCap strokeWidth={1.6} /></div>
          <div className="art-pencil" />
        </div>
      </section>
      <section className="campus-tools" aria-labelledby="campus-tools-title">
        <div className="section-heading"><h2 id="campus-tools-title">Campus services</h2></div>
        <div className="campus-grid">
          <Link className="campus-tile" to="/feedback">
            <span className="service-icon"><MessageSquare aria-hidden="true" /></span>
            <div><h3>Campus feedback</h3><p>Post under your student alias, and discuss classes, facilities, and campus life.</p></div>
          </Link>
          <Link className="campus-tile" to="/tasks">
            <span className="service-icon service-icon-dark"><ClipboardList aria-hidden="true" /></span>
            <div><h3>Task allotment</h3><p>Post a campus request, accept a task from another student, or track an assignment.</p></div>
          </Link>
        </div>
        <p className="campus-note"><BookOpen size={18} aria-hidden="true" /> Use your VIT student account to participate.</p>
      </section>
    </div>
  );
}
