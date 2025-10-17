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
    <button className={`relative rounded-xl border p-3 text-left transition ${selected ? 'bg-sky-100 ring-2 ring-sky-300 border-sky-300' : 'bg-white border-slate-200'}`} onClick={() => onSelect(value)}>
      {selected && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-400 text-white">
          ✓
        </span>
      )}
      <div className="p-3">
        <p className="text-slate-800 text-3xl leading-7" style={previewStyle}>{label}</p>
      </div>
    </button>
  );
}


