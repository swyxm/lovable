import React, { useEffect, useMemo, useState } from 'react';

type AnimCycleProps = {
  size?: number;
  className?: string;
};

const resolveUrl = (path: string): string => {
  try {
    // For extension build
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
      return chrome.runtime.getURL(path);
    }
  } catch {}
  // Fallback to public path
  return `/${path}`;
};

export default function AnimCycle({ size = 192, className }: AnimCycleProps) {
  const frames = useMemo(() => [
    resolveUrl('avatarimages/loading/Anim1.png'),
    resolveUrl('avatarimages/loading/Anim2.png'),
    resolveUrl('avatarimages/loading/Anim3.png'),
    resolveUrl('avatarimages/loading/Anim2.png'),
    resolveUrl('avatarimages/loading/Anim1.png'),
  ], []);

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setIdx((i) => (i + 1) % frames.length);
    }, 200); // ~0.2s between frames
    return () => window.clearInterval(iv);
  }, [frames.length]);

  return (
    <img
      src={frames[idx]}
      alt="Loading animation"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}


