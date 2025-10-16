import React, { useEffect } from 'react';

interface Props {
  label: string;
  value: string;
  selected?: boolean;
  onSelect: (value: string) => void;
}

function useGoogleFont(family: string) {
  useEffect(() => {
    if (!family) return;
    const needsLoad = /^[A-Za-z0-9\s]+$/.test(family) && !family.includes(',');
    if (!needsLoad) return;
    const id = `lb-font-${family.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    const encoded = family.replace(/\s+/g, '+');
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;600&display=swap`;
    document.head.appendChild(link);
    return () => {
    };
  }, [family]);
}

export default function FontCard({ label, value, selected, onSelect }: Props) {
  useGoogleFont(value);
  const previewStyle: React.CSSProperties = { fontFamily: value };
  return (
    <button className={`rounded-xl border p-3 text-left transition bg-white ${selected ? 'ring-2 ring-sky-400 border-sky-300' : 'border-slate-200'}`} onClick={() => onSelect(value)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-8 border rounded bg-slate-50 flex items-center justify-center text-slate-500 text-xs">🔤</div>
        <div className="min-w-0">
          <p className="text-slate-800 font-semibold truncate">{label}</p>
          <p className="text-slate-800 text-3xl leading-7 truncate" style={previewStyle}>Big Website Title</p>
        </div>
      </div>
    </button>
  );
}


