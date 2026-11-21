import { useEffect, useRef } from 'react';
import { AlarmClock, Backpack, Bell, Book, BookOpen, GraduationCap, Pencil, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import './CampusProps.css';

const props = [
  { Icon: Backpack, x: 4, y: 9, size: 62, tilt: -16, speed: -0.12 },
  { Icon: Sparkles, x: 94, y: 13, size: 30, tilt: 12, speed: 0.14, gold: true },
  { Icon: GraduationCap, x: 96, y: 29, size: 72, tilt: 15, speed: -0.19 },
  { Icon: Pencil, x: 3, y: 43, size: 42, tilt: -22, speed: 0.16, gold: true },
  { Icon: AlarmClock, x: 96, y: 56, size: 48, tilt: -12, speed: 0.12 },
  { Icon: BookOpen, x: 4, y: 66, size: 62, tilt: 13, speed: -0.15 },
  { Icon: Bell, x: 96, y: 83, size: 55, tilt: 19, speed: -0.11, gold: true },
  { Icon: Book, x: 4, y: 90, size: 40, tilt: -19, speed: 0.18, gold: true },
];

export function CampusProp({ Icon, x, y, size, tilt, speed, gold, phase = 0 }) {
  return (
    <span className={gold ? 'campus-prop campus-prop-gold' : 'campus-prop'}
      style={{ '--x': x + '%', '--y': y + '%', '--size': size + 'px', '--tilt': tilt + 'deg',
        '--speed': speed, '--phase': phase + 's' }}>
      <Icon strokeWidth={1.45} />
    </span>
  );
}

export default function CampusProps({ children }) {
  const frame = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const element = frame.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let pending = 0;
    const paint = () => {
      pending = 0;
      element.style.setProperty('--campus-angle', motion.matches ? '0deg' : window.scrollY * 2.5 + 'deg');
    };
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    motion.addEventListener('change', schedule);
    return () => {
      cancelAnimationFrame(pending);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      motion.removeEventListener('change', schedule);
    };
  }, [pathname]);

  return (
    <div className="campus-frame" ref={frame}>
      <div className="campus-props" aria-hidden="true">
        {props.map((prop, index) => (
          <CampusProp key={prop.x + ':' + prop.y} {...prop} phase={-index * 0.65} />
        ))}
      </div>
      {children}
    </div>
  );
}
