import React from 'react';

interface Props {
  label: string;
  emoji?: string;
  value: string;
  type?: 'color' | 'text' | 'icon' | 'layout';
  selected?: boolean;
  onSelect: (value: string) => void;
  context?: 'theme_color' | 'main_character' | 'purpose' | 'tone' | 'layout' | 'palette' | 'font';
}

export default function OptionCard({ label, emoji: providedEmoji, value, type = 'text', selected, onSelect, context }: Props) {
  const base = 'relative rounded-xl border p-3 cursor-pointer transition shadow-sm hover:shadow';
  const sel = selected ? 'ring-2 ring-sky-300 border-sky-300 bg-sky-100' : 'border-slate-200 bg-white';
  const allowEmoji = !(context === 'layout' || context === 'font' || context === 'tone');
  const emoji = providedEmoji && allowEmoji ? providedEmoji : (allowEmoji ? '' : '');
  return (
    <button className={`${base} ${sel} text-left`} onClick={() => onSelect(value)}>
      {selected && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-400 text-white">
          ✓
        </span>
      )}
      {type === 'color' ? (
        <div className="flex items-center gap-3">
          <span className="inline-block w-8 h-8 rounded-full border" style={{ background: value }} />
          <span className="text-slate-700 font-medium">{label}</span>
        </div>
      ) : (
        <span className="text-slate-700 font-medium">{emoji && allowEmoji ? `${emoji} ${label}` : label}</span>
      )}
    </button>
  );
}

