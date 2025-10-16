import React, { useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';

const DEFAULT_COLORS = ['#0c4a6e', '#1d4ed8', '#0369a1', '#166534', '#b91c1c', '#9333ea', '#f59e0b', '#111827'];

export default function DrawCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isEraser, setIsEraser] = useState(false);
  const [color, setColor] = useState('#0c4a6e');
  const [brush, setBrush] = useState(4);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d');
    if (!ctx) return; ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.lineWidth = brush; ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    let drawing = false; let lastX = 0; let lastY = 0;
    const getXY = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const down = (e: MouseEvent) => { drawing = true; const p = getXY(e); lastX = p.x; lastY = p.y; };
    const move = (e: MouseEvent) => {
      if (!drawing) return; const p = getXY(e);
      if (isEraser) { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 14; }
      else { ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = brush; ctx.strokeStyle = color; }
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke(); lastX = p.x; lastY = p.y;
    };
    const up = () => { drawing = false; };
    canvas.addEventListener('mousedown', down);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { canvas.removeEventListener('mousedown', down); canvas.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [isEraser, color, brush]);

  const clear = () => { const c = canvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return; ctx.fillStyle = 'white'; ctx.fillRect(0, 0, c.width, c.height); };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <button className={`px-3 py-2 rounded-lg text-white ${!isEraser ? 'bg-sky-700 hover:bg-sky-800' : 'bg-slate-400'}`} onClick={() => setIsEraser(false)}>Pen</button>
        <button className={`px-3 py-2 rounded-lg text-white ${isEraser ? 'bg-sky-700 hover:bg-sky-800' : 'bg-slate-400'}`} onClick={() => setIsEraser(true)}>Eraser</button>
        <button className="px-3 py-2 rounded-lg bg-slate-500 hover:bg-slate-600 text-white" onClick={clear}>Clear</button>
        <div className="flex items-center gap-1">
          {DEFAULT_COLORS.map((c) => (
            <button key={c} className={`w-6 h-6 rounded-full border ${color === c ? 'ring-2 ring-sky-400' : ''}`} style={{ background: c }} onClick={() => { setColor(c); setIsEraser(false); }} aria-label={`color ${c}`} />
          ))}
          <button className="w-6 h-6 rounded-full border bg-white text-slate-700" onClick={() => setShowPicker((v) => !v)} aria-label="custom color">+</button>
          {showPicker && (
            <div className="absolute z-10 mt-2 p-2 bg-white rounded-xl border border-slate-200 shadow">
              <HexColorPicker color={color} onChange={(val) => { setColor(val); setIsEraser(false); }} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <label className="text-slate-600 text-sm">Brush</label>
          <input type="range" min={1} max={20} value={brush} onChange={(e) => setBrush(parseInt(e.target.value, 10))} />
        </div>
      </div>
      <canvas ref={canvasRef} width={900} height={420} className="border-2 border-slate-300 rounded-xl bg-white w-full" />
    </div>
  );
}
