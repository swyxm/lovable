import React from 'react';

interface Props {
  label: string;
  hex: string;
  selected?: boolean;
  onSelect: (hex: string) => void;
}

export default function ColorCard({ label, hex, selected, onSelect }: Props) {
  const parts = hex.split(',').map(s => s.trim()).filter(Boolean);
  const isPalette = parts.length > 1;
  let style: React.CSSProperties = {};
  if (isPalette) {
    const step = 100 / parts.length;
    const stops: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const start = Math.round(i * step);
      const end = Math.round((i + 1) * step);
      stops.push(`${parts[i]} ${start}% ${end}%`);
    }
    style = { backgroundImage: `conic-gradient(${stops.join(', ')})` };
  } else {
    style = { background: hex };
  }
  return (
    <button className={`relative rounded-xl border p-3 text-left transition ${selected ? 'bg-sky-100 ring-2 ring-sky-300 border-sky-300' : 'bg-white border-slate-200'}`} onClick={() => onSelect(hex)}>
      {selected && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-400 text-white">✓</span>
      )}
      <div className="flex items-center gap-4">
        <span className="inline-block w-14 h-14 md:w-16 md:h-16 rounded-full border" style={style} />
        <div className="min-w-0">
          <p className="text-slate-800 font-semibold truncate">{label}</p>
        </div>
      </div>
    </button>
  );
}
