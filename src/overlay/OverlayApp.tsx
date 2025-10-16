import React, { useEffect, useRef, useState } from 'react';
import A11yMenu, { A11yState } from './components/A11yMenu';
import DrawCanvas from './components/DrawCanvas';

type OverlayAppProps = {
  onClose: () => void;
  onHeaderReady?: (el: HTMLElement | null) => void;
};

const OverlayApp: React.FC<OverlayAppProps> = ({ onClose, onHeaderReady }) => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<'draw' | 'text'>('draw');
  const [textIdea, setTextIdea] = useState('');
  const [a11y, setA11y] = useState<A11yState>({ largeText: false, highContrast: false, reduceMotion: false, boldText: false });

  useEffect(() => { onHeaderReady?.(headerRef.current); }, [onHeaderReady]);

  return (
    <div className={`relative min-h-full h-full w-full bg-white text-slate-700 ${a11y.largeText ? 'lb-large-text' : ''} ${a11y.highContrast ? 'lb-high-contrast' : ''} ${a11y.reduceMotion ? 'lb-reduce-motion' : ''} ${a11y.boldText ? 'font-bold' : ''}`} style={{ position: 'absolute', inset: 0 }}>
      <div ref={headerRef} id="lb-header" className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 select-none">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-sky-600">LovaBridge Buddy</span>
          <span className="text-slate-500 hidden sm:inline">– Create something wonderful</span>
        </div>
        <button title="Close" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-200 text-2xl leading-none" onClick={onClose}>×</button>
      </div>

      <div className="lb-scroll h-[calc(100%-48px)] overflow-auto p-4 pb-8 bg-white">
        <div className="mb-3 flex items-center gap-2 justify-center bg-slate-100/80 rounded-xl py-1.5">
          <button
            className={`px-3 py-1 rounded-full border text-sm ${mode === 'draw' ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'}`}
            onClick={() => setMode('draw')}
          >
            Draw
          </button>
          <button
            className={`px-3 py-1 rounded-full border text-sm ${mode === 'text' ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'}`}
            onClick={() => setMode('text')}
          >
            Describe
          </button>
        </div>

        {mode === 'draw' ? (
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <DrawCanvas />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
            <div className="flex gap-2">
              <input className="flex-1 bg-white text-slate-700 border-2 border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400" placeholder="Describe your idea..." value={textIdea} onChange={(e) => setTextIdea(e.target.value)} />
              <button className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl">Send</button>
            </div>
          </div>
        )}
      </div>
      <div className="fixed left-4 bottom-4 z-50 pointer-events-auto">
        <A11yMenu value={a11y} onChange={setA11y} />
      </div>
    </div>
  );
};

export default OverlayApp;