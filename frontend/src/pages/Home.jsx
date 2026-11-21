import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, MessageSquare, Moon, Sun } from 'lucide-react';
import './Home.css';

export default function Home() {
  const scene = useRef(null);
  const [daylight, setDaylight] = useState(false);

  useEffect(() => {
    const hero = scene.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const paint = () => {
      frame = 0;
      const progress = reducedMotion.matches ? 0 : Math.max(0, Math.min(1, -hero.getBoundingClientRect().top / hero.offsetHeight));
      hero.style.setProperty('--scroll', progress);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    reducedMotion.addEventListener('change', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      reducedMotion.removeEventListener('change', schedule);
    };
  }, []);

  return (
    <div className="campus-home">
      <section ref={scene} className={`campus-hero${daylight ? ' campus-day' : ''}`} aria-labelledby="campus-title">
        <div className="campus-stars" aria-hidden="true" />
        <div className="campus-orb orb-large" aria-hidden="true" />
        <div className="campus-clouds clouds-far" aria-hidden="true" />
        <div className="hero-heading">
          <p className="campus-kicker">VIT Vellore student portal</p>
          <h1 id="campus-title">VIT <span>CONNECT</span></h1>
          <p className="campus-intro">Share feedback. Find help. Stay connected to campus.</p>
        </div>
        <div className="campus-orb orb-small" aria-hidden="true" />
        <div className="campus-clouds clouds-near" aria-hidden="true" />
        <div className="hero-footer">
          <a href="#campus-tools">Explore the portal</a>
          <button type="button" aria-pressed={daylight} onClick={() => setDaylight(!daylight)}>
            {daylight ? <Sun size={17} /> : <Moon size={17} />} Day mode
          </button>
        </div>
      </section>
      <section className="campus-tools" id="campus-tools" aria-labelledby="campus-tools-title">
        <h2 id="campus-tools-title">Your campus, connected</h2>
        <div className="campus-grid">
          <Link className="campus-tile" to="/feedback">
            <MessageSquare size={26} aria-hidden="true" />
            <h3>Campus feedback</h3>
            <p>Share feedback about classes, facilities, and campus life under your chosen alias.</p>
          </Link>
          <Link className="campus-tile" to="/tasks">
            <BookOpen size={26} aria-hidden="true" />
            <h3>Student tasks</h3>
            <p>Ask for help with a campus errand, lend a hand, or track an accepted task.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
