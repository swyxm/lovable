import React, { useEffect, useState } from 'react';
import { HexColorPicker } from 'react-colorful';

type Props = {
  color: string;
  onChange: (hex: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
};

export default function ColorWheel({ color, onChange, onClose, anchorRef }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  
  useEffect(() => {
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: Math.round(r.bottom + 8), left: Math.round(r.left) });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.lb-color-wheel')) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div
      className="lb-color-wheel p-3 bg-white rounded-xl border border-slate-300 shadow-lg"
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 2147483647 }}
    >
      <div style={{ width: 200, height: 200 }}>
        <HexColorPicker color={color} onChange={onChange} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

