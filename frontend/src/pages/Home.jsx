import { Link } from 'react-router-dom';
import './Home.css';
import { AlarmClock, Backpack, Bell, BookOpen, ClipboardList, GraduationCap, MessageSquare, Pencil, NotebookPen } from 'lucide-react';
import { CampusProp } from '../components/CampusProps';

const heroProps = [
  { Icon: NotebookPen, x: 15, y: 16, size: 44, tilt: -14, speed: .14, gold: true },
  { Icon: GraduationCap, x: 65, y: 22, size: 181, tilt: 15, speed: -.15 },
  { Icon: Backpack, x: 25, y: 47, size: 154, tilt: -16, speed: .12 },
  { Icon: Pencil, x: 91, y: 48, size: 76, tilt: -15, speed: .20, gold: true },
  { Icon: BookOpen, x: 63, y: 60, size: 187, tilt: -10, speed: -.10, gold: true },
  { Icon: AlarmClock, x: 19, y: 83, size: 72, tilt: 12, speed: -.16 },
  { Icon: Bell, x: 83, y: 82, size: 85, tilt: 20, speed: .16 },
  { Icon: NotebookPen, x: 44, y: 87, size: 32, tilt: 4, speed: -.19, gold: true },
];

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
        <div className="hero-props" aria-hidden="true">
          {heroProps.map((prop, index) => (
            <CampusProp key={prop.x} {...prop} phase={-index * .7} />
          ))}
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
