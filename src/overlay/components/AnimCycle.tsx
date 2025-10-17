import React, { useEffect, useMemo, useState } from 'react';

type AnimCycleProps = {
  size?: number;
  className?: string; 
  messages?: string[];
  intervalMs?: number;
  textClassName?: string;
};

const resolveUrl = (path: string): string => {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
      return chrome.runtime.getURL(path);
    }
  } catch {}
  return `/${path}`;
};

export default function AnimCycle({ size = 192, className, messages, intervalMs = 4000, textClassName }: AnimCycleProps) {
  const frames = useMemo(() => [
    resolveUrl('avatarimages/loading/Anim1.png'),
    resolveUrl('avatarimages/loading/Anim2.png'),
    resolveUrl('avatarimages/loading/Anim3.png'),
    resolveUrl('avatarimages/loading/Anim2.png'),
    resolveUrl('avatarimages/loading/Anim1.png'),
  ], []);

  const [frameIdx, setFrameIdx] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const iv = window.setInterval(() => {
      setFrameIdx((i) => (i + 1) % frames.length);
    }, 200); 
    return () => window.clearInterval(iv);
  }, [frames.length]);

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    let cancelled = false;
    let t: number | null = null;
    const tick = () => {
      if (cancelled) return;
      setMsgIdx((i) => (i + 1) % messages.length);
      t = window.setTimeout(tick, intervalMs);
    };
    t = window.setTimeout(tick, intervalMs);
    return () => { cancelled = true; if (t) window.clearTimeout(t); };
  }, [messages?.length, intervalMs]);

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    setTyped('');
    let i = 0;
    const iv = window.setInterval(() => {
      i += 1;
      const m = messages[msgIdx] || '';
      setTyped(m.slice(0, i));
      if (i >= m.length) window.clearInterval(iv);
    }, 18);
    return () => window.clearInterval(iv);
  }, [msgIdx, messages]);

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-4">
      <img
        src={frames[frameIdx]}
        alt="Loading animation"
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size }}
      />
      {messages && messages.length > 0 && (
        <span className={textClassName || 'text-sky-600 text-sm font-medium'}>{typed}</span>
      )}
    </div>
  );
}


