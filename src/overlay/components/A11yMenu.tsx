import React from 'react';
import { Accessibility as LucideAccessibility } from 'lucide-react';

export interface A11yState {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  boldText: boolean;
}

interface Props {
  value: A11yState;
  onChange: (next: A11yState) => void;
}

export default function A11yMenu({ value, onChange }: Props) {
  const [open, setOpen] = React.useState<boolean>(false);
  const [msReady, setMsReady] = React.useState<boolean>(false);

  React.useEffect(() => {
    const id = 'material-symbols-outlined-link';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=accessibility';
      document.head.appendChild(link);
    }
    try {
      (document as any).fonts?.load?.('24px "Material Symbols Outlined"').then(() => setMsReady(true)).catch(() => setMsReady(false));
    } catch {
      setMsReady(false);
    }
  }, []);

  const toggle = (key: keyof A11yState) => onChange({ ...value, [key]: !value[key] });
  return (
    <div className="relative">
      <button
        aria-label="Accessibility settings"
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 transition-transform duration-300 shadow"
        onClick={() => {
          setOpen((v: boolean) => !v);
        }}
      >
        {msReady ? (
          <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`, lineHeight: 0 }}>accessibility</span>
        ) : (
          <LucideAccessibility size={18} />
        )}
      </button>
      <div
        className={`absolute left-12 top-1/2 -translate-y-1/2 flex items-center gap-1 flex-nowrap whitespace-nowrap overflow-hidden transition-all duration-300 ${open ? 'opacity-100 translate-x-0 max-w-[520px]' : 'opacity-0 -translate-x-2 max-w-0'}`}
      >
        <button
          className={`w-36 px-2 py-1 rounded-full border text-sm font-medium whitespace-nowrap ${value.largeText ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'}`}
          onClick={() => toggle('largeText')}
        >
          Large text
        </button>
        <button
          className={`w-36 px-2 py-1 rounded-full border text-sm font-medium whitespace-nowrap ${value.highContrast ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'}`}
          onClick={() => toggle('highContrast')}
        >
          High contrast
        </button>
        <button
          className={`w-36 px-2 py-1 rounded-full border text-sm font-medium whitespace-nowrap ${value.reduceMotion ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'}`}
          onClick={() => toggle('reduceMotion')}
        >
          Reduce motion
        </button>
        <button
          className={`px-2 py-1 rounded-full border text-sm ${value.boldText ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'}`}
          onClick={() => toggle('boldText')}
        >
          Bold
        </button>
      </div>
    </div>
  );
}
