import React from 'react';
import { Accessibility } from 'lucide-react';

export interface A11yState {
  largeText: boolean;
  highContrast: boolean;
  boldText: boolean;
  textToSpeech: boolean;
  ttsVoice: 'Fenrir' | 'Zephyr';
}

interface Props {
  value: A11yState;
  onChange: (next: A11yState) => void;
}

export default function A11yMenu({ value, onChange }: Props) {
  const [open, setOpen] = React.useState<boolean>(false);
  const toggle = (key: keyof A11yState) => onChange({ ...value, [key]: !value[key] });
  return (
    <div className="relative">
      <button
        aria-label="Accessibility settings"
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 transition-transform duration-300 shadow"
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
        className={`absolute left-12 top-1/2 -translate-y-1/2 flex items-center gap-2 flex-nowrap whitespace-nowrap overflow-hidden transition-all duration-300 ${open ? 'opacity-100 translate-x-0 max-w-[520px]' : 'opacity-0 -translate-x-2 max-w-0'}`}
      >
        <button
          className={`w-36 px-3 py-1 rounded-full border text-sm font-medium whitespace-nowrap ${value.largeText ? 'bg-sky-500 text-white border-sky-500' : 'bg-white/80 text-slate-700 border-slate-300 hover:border-sky-400'}`}
          onClick={() => toggle('largeText')}
        >
          Large text
        </button>
        <button
          className={`w-36 px-3 py-1 rounded-full border text-sm font-medium whitespace-nowrap ${value.highContrast ? 'bg-sky-500 text-white border-sky-500' : 'bg-white/80 text-slate-700 border-slate-300 hover:border-sky-400'}`}
          onClick={() => toggle('highContrast')}
        >
          High contrast
        </button>
        <button
          className={`px-3 py-1 rounded-full border text-sm ${value.boldText ? 'bg-sky-500 text-white border-sky-500' : 'bg-white/80 text-slate-700 border-slate-300 hover:border-sky-400'}`}
          onClick={() => toggle('boldText')}
        >
          Bold
        </button>
        <div className="flex items-center gap-1">
          <button
            className={`px-3 py-1 rounded-full border text-sm ${value.textToSpeech ? 'bg-sky-500 text-white border-sky-500' : 'bg-white/80 text-slate-700 border-slate-300 hover:border-sky-400'}`}
            onClick={() => toggle('textToSpeech')}
          >
            🔊 TTS
          </button>
          {value.textToSpeech && (
            <select
              className="px-2 py-1 rounded border text-xs bg-white/80 text-slate-700 border-slate-300 hover:border-sky-400 focus:border-sky-500 focus:outline-none"
              value={value.ttsVoice}
              onChange={(e) => onChange({ ...value, ttsVoice: e.target.value as 'Fenrir' | 'Zephyr' })}
            >
              <option value="Fenrir">Fenrir (Male)</option>
              <option value="Zephyr">Zephyr (Female)</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
