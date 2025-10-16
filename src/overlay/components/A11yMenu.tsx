import React from 'react';
import { Accessibility } from 'lucide-react';

export interface A11yState {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
}

interface Props {
  value: A11yState;
  onChange: (next: A11yState) => void;
}

export default function A11yMenu({ value, onChange }: Props) {
  const [open, setOpen] = React.useState<boolean>(false);
  const toggle = (key: keyof A11yState) => onChange({ ...value, [key]: !value[key] });
  return (
    <div className="flex items-center gap-2 relative">
      <button
        aria-label="Accessibility settings"
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 transition-transform duration-300"
        onClick={(e) => {
          const el = e.currentTarget;
          el.classList.add('animate-spin');
          setTimeout(() => el.classList.remove('animate-spin'), 600);
          setOpen((v: boolean) => !v);
        }}
      >
        <Accessibility size={18} />
      </button>
      <div
        className={`flex items-center gap-2 transition-all duration-300 ${open ? 'opacity-100 translate-x-0 max-w-[420px]' : 'opacity-0 -translate-x-2 max-w-0 overflow-hidden'}`}
      >
        <button
          className={`px-3 py-1 rounded-full border text-sm ${value.largeText ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'}`}
          onClick={() => toggle('largeText')}
        >
          Large text
        </button>
        <button
          className={`px-3 py-1 rounded-full border text-sm ${value.highContrast ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'}`}
          onClick={() => toggle('highContrast')}
        >
          High contrast
        </button>
        <button
          className={`px-3 py-1 rounded-full border text-sm ${value.reduceMotion ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'}`}
          onClick={() => toggle('reduceMotion')}
        >
          Reduce motion
        </button>
      </div>
    </div>
  );
}
