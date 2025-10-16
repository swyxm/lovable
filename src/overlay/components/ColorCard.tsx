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
    <button className={`rounded-xl border p-3 text-left transition bg-white ${selected ? 'ring-2 ring-sky-400 border-sky-300' : 'border-slate-200'}`} onClick={() => onSelect(hex)}>
      <div className="flex items-center gap-4">
        <span className="inline-block w-14 h-14 md:w-16 md:h-16 rounded-full border" style={style} />
        <div className="min-w-0">
          <p className="text-slate-800 font-semibold truncate">{label}</p>
        </div>
      </div>
    </button>
  );
}
