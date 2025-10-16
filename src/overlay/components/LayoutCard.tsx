import React from 'react';

interface Props {
  label: string;
  value: string;
  selected?: boolean;
  onSelect: (value: string) => void;
}

export default function LayoutCard({ label, value, selected, onSelect }: Props) {
  const schematic = getSchematic(value);
  return (
    <button className={`relative rounded-xl border p-3 text-left transition ${selected ? 'bg-sky-100 ring-2 ring-sky-300 border-sky-300' : 'bg-white border-slate-200'}`} onClick={() => onSelect(value)}>
      {selected && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-400 text-white">✓</span>
      )}
      <div className="flex items-center gap-3">
        <div className="w-14 h-10 border rounded bg-white grid gap-0.5 p-0.5">
          {schematic}
        </div>
        <p className="text-slate-800 font-semibold">{label}</p>
      </div>
    </button>
  );
}

function Cell({ className = '' }: { className?: string }){
  return <div className={`bg-slate-200 rounded-sm ${className}`} />;
}

function getSchematic(value: string){
  const v = value.toLowerCase();
  if (v.includes('grid') || v.includes('card')){
    return (
      <div className="grid grid-cols-3 grid-rows-2 gap-0.5">
        <Cell /><Cell /><Cell />
        <Cell /><Cell /><Cell />
      </div>
    );
  }
  if (v.includes('long') || v.includes('scroll')){
    return (
      <div className="flex flex-col gap-0.5">
        <Cell className="h-1.5" />
        <Cell className="h-1.5" />
        <Cell className="h-1.5" />
        <Cell className="h-1.5 animate-pulse" />
      </div>
    );
  }
  if (v.includes('gallery')){
    return (
      <div className="grid grid-cols-4 grid-rows-2 gap-0.5">
        {Array.from({ length: 8 }).map((_, i) => <Cell key={i} />)}
      </div>
    );
  }
  if (v.includes('list')){
    return (
      <div className="flex flex-col gap-0.5">
        <Cell className="h-2" />
        <Cell className="h-2" />
        <Cell className="h-2" />
      </div>
    );
  }
  if (v.includes('hero')){
    return (
      <div className="grid grid-cols-3 grid-rows-3 gap-0.5">
        <Cell className="col-span-3 row-span-2" />
        <Cell className="col-span-1" />
        <Cell className="col-span-2" />
      </div>
    );
  }
  if (v.includes('sidebar')){
    return (
      <div className="grid grid-cols-4 gap-0.5">
        <Cell className="col-span-1" />
        <Cell className="col-span-3" />
      </div>
    );
  }
  if (v.includes('split')){
    return (
      <div className="grid grid-cols-2 gap-0.5">
        <Cell />
        <Cell />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-0.5">
      <Cell />
      <Cell />
      <Cell className="col-span-2" />
    </div>
  );
}
