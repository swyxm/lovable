import React, { useEffect, useRef, useState } from 'react';
import { PenLine, Eraser, PaintBucket, Trash2, Save, RotateCcw, RotateCw, Droplet, Shapes } from 'lucide-react';
import ColorWheel from './ColorWheel';

type SavedDrawing = { id: string; dataUrl: string; createdAt: number };

const DEFAULTS = ['#ef4444', '#22c55e', '#3b82f6', '#000000'];

type DrawCanvasProps = {
  exposeGetImage?: (getter: () => string | null) => void;
};

export default function DrawCanvas({ exposeGetImage }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isEraser, setIsEraser] = useState(false);
  const [isBucket, setIsBucket] = useState(false);
  const [shapeMode, setShapeMode] = useState<'none' | 'circle' | 'square' | 'star' | 'diamond'>('none');
  const [showShapes, setShowShapes] = useState(false);
  const [color, setColor] = useState('#0c4a6e');
  const [brush, setBrush] = useState(4);
  const [showWheel, setShowWheel] = useState(false);
  const colorBtnRef = useRef<HTMLButtonElement | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [showGallery, setShowGallery] = useState(true);
  const [saved, setSaved] = useState<SavedDrawing[]>([]);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [highlight, setHighlight] = useState<'pen' | 'eraser' | 'bucket' | 'save' | 'undo' | 'redo' | 'history' | null>(null);
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  useEffect(() => {
    chrome.storage?.local.get(['lb_drawings'], (res) => {
      const list = (res?.lb_drawings as SavedDrawing[]) || [];
      setSaved(list);
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d');
    if (!ctx) return; ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.lineWidth = brush; ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    canvas.style.cursor = 'crosshair';
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height); historyRef.current = [img]; historyIndexRef.current = 0;
  }, []);

  useEffect(() => {
    if (!exposeGetImage) return;
    const getter = () => {
      const c = canvasRef.current; if (!c) return null;
      try { 
        const dataUrl = c.toDataURL('image/png');
        console.log('DrawCanvas: Generated image data URL length:', dataUrl.length);
        console.log('DrawCanvas: Image preview:', dataUrl.substring(0, 100) + '...');
        return dataUrl;
      } catch (e) { 
        console.error('DrawCanvas: Failed to generate image:', e);
        return null; 
      }
    };
    exposeGetImage(getter);
  }, [exposeGetImage]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    let drawing = false; let lastX = 0; let lastY = 0; let shapeDragging = false; let shapeStartX = 0; let shapeStartY = 0;
    const getXY = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); const sx = canvas.width / r.width; const sy = canvas.height / r.height; return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy, r }; };
    const hexToRgba = (hex: string) => {
      const h = hex.replace('#', '');
      const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
      const r = (bigint >> 16) & 255; const g = (bigint >> 8) & 255; const b = bigint & 255; return { r, g, b, a: 255 };
    };
    const colorsEqual = (data: Uint8ClampedArray, idx: number, r: number, g: number, b: number, a: number) => {
      return data[idx] === r && data[idx + 1] === g && data[idx + 2] === b && data[idx + 3] === a;
    };
    const floodFill = (cx: number, cy: number) => {
      const x0 = Math.floor(cx); const y0 = Math.floor(cy);
      const { width, height } = canvas; const img = ctx.getImageData(0, 0, width, height); const data = img.data;
      const i = (y0 * width + x0) * 4; const target = { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
      const fill = hexToRgba(color); if (target.r === fill.r && target.g === fill.g && target.b === fill.b && target.a === fill.a) return;
      const stack: Array<[number, number]> = [[x0, y0]];
      while (stack.length) {
        const [x, y] = stack.pop() as [number, number]; if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const idx = (y * width + x) * 4;
        if (!colorsEqual(data, idx, target.r, target.g, target.b, target.a)) continue;
        data[idx] = fill.r; data[idx + 1] = fill.g; data[idx + 2] = fill.b; data[idx + 3] = fill.a;
        stack.push([x + 1, y]); stack.push([x - 1, y]); stack.push([x, y + 1]); stack.push([x, y - 1]);
      }
      ctx.putImageData(img, 0, 0);
    };
    const pushSnapshot = () => {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const arr = historyRef.current.slice(0, historyIndexRef.current + 1);
      arr.push(img); if (arr.length > 50) arr.shift();
      historyRef.current = arr; historyIndexRef.current = arr.length - 1;
    };
    const drawShape = (cx: number, cy: number, size: number) => {
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = brush * 2;
      if (shapeMode === 'circle') { ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI * 2); ctx.stroke(); }
      else if (shapeMode === 'square') { ctx.strokeRect(cx - size, cy - size, size * 2, size * 2); }
      else if (shapeMode === 'diamond') { ctx.beginPath(); ctx.moveTo(cx, cy - size); ctx.lineTo(cx + size, cy); ctx.lineTo(cx, cy + size); ctx.lineTo(cx - size, cy); ctx.closePath(); ctx.stroke(); }
      else if (shapeMode === 'star') {
        const spikes = 5; const outer = size; const inner = size / 2.2; ctx.beginPath(); ctx.moveTo(cx, cy - outer);
        for (let i = 0; i < spikes; i++) {
          const a = (Math.PI * 2 * i) / spikes - Math.PI / 2; ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
          const b = a + Math.PI / spikes; ctx.lineTo(cx + Math.cos(b) * inner, cy + Math.sin(b) * inner);
        }
        ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
    };
    const down = (e: MouseEvent) => { const p = getXY(e); if (isBucket) { pushSnapshot(); floodFill(p.x, p.y); pushSnapshot(); return; }
      if (shapeMode !== 'none') { pushSnapshot(); shapeDragging = true; shapeStartX = p.x; shapeStartY = p.y; canvas.style.cursor = 'none'; return; }
      pushSnapshot(); drawing = true; canvas.style.cursor = 'none'; lastX = p.x; lastY = p.y; };
    const move = (e: MouseEvent) => {
      const p = getXY(e); setCursorPos({ x: e.clientX - p.r.left, y: e.clientY - p.r.top });
      if (shapeDragging) { const snap = historyRef.current[historyIndexRef.current]; if (snap) ctx.putImageData(snap, 0, 0); const dx = p.x - shapeStartX; const dy = p.y - shapeStartY; const size = Math.max(10, Math.sqrt(dx * dx + dy * dy)); drawShape(shapeStartX, shapeStartY, size); return; }
      if (!drawing) return;
      if (isEraser) { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 14; }
      else { ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = brush; ctx.strokeStyle = color; }
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke(); lastX = p.x; lastY = p.y;
    };
    const up = () => { if (drawing || shapeDragging) { pushSnapshot(); } drawing = false; shapeDragging = false; canvas.style.cursor = 'crosshair'; };
    const leave = () => { setCursorPos(null); canvas.style.cursor = 'crosshair'; };
    canvas.addEventListener('mousedown', down);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseleave', leave);
    window.addEventListener('mouseup', up);
    return () => { canvas.removeEventListener('mousedown', down); canvas.removeEventListener('mousemove', move); canvas.removeEventListener('mouseleave', leave); window.removeEventListener('mouseup', up); };
  }, [isEraser, isBucket, shapeMode, color, brush]);

  // Listen for tutorial highlight events to spotlight toolbar buttons
  useEffect(() => {
    const onHi = (e: any) => { setHighlight(e?.detail?.tool || null); };
    const onClear = () => setHighlight(null);
    window.addEventListener('lb:tutorialHighlight', onHi as EventListener);
    window.addEventListener('lb:tutorialHighlightClear', onClear as EventListener);
    return () => { window.removeEventListener('lb:tutorialHighlight', onHi as EventListener); window.removeEventListener('lb:tutorialHighlightClear', onClear as EventListener); };
  }, []);

  const clear = () => { const c = canvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return; ctx.fillStyle = 'white'; ctx.fillRect(0, 0, c.width, c.height); };
  const save = () => { const c = canvasRef.current; if (!c) return; const url = c.toDataURL('image/png'); const entry: SavedDrawing = { id: `${Date.now()}`, dataUrl: url, createdAt: Date.now() }; const next = [entry, ...saved].slice(0, 100); setSaved(next); chrome.storage?.local.set({ lb_drawings: next }); setShowSavedMsg(true); window.setTimeout(() => setShowSavedMsg(false), 1200); try { window.dispatchEvent(new CustomEvent('lb:tutorialSaved')); } catch {} };
  const undo = () => { const c = canvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return; if (historyIndexRef.current > 0) { historyIndexRef.current -= 1; const img = historyRef.current[historyIndexRef.current]; ctx.putImageData(img, 0, 0); } };
  const redo = () => { const c = canvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return; if (historyIndexRef.current < historyRef.current.length - 1) { historyIndexRef.current += 1; const img = historyRef.current[historyIndexRef.current]; ctx.putImageData(img, 0, 0); } };

  const openSaved = (dataUrl: string) => {
    const c = canvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      // draw background then image
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      // reset history to this state
      const snap = ctx.getImageData(0, 0, c.width, c.height);
      historyRef.current = [snap];
      historyIndexRef.current = 0;
    };
    img.src = dataUrl;
  };

  // keyboard shortcuts intentionally removed; tutorial highlights toolbar buttons instead

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 flex-wrap bg-slate-100/80 rounded-xl p-2">
        <button className={`h-10 px-3 py-2 rounded-lg text-white ${!isEraser && !isBucket && shapeMode === 'none' ? 'bg-sky-700 hover:bg-sky-800' : 'bg-slate-400'} ${highlight === 'pen' ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-100 animate-pulse' : ''}`} title="Pen" onClick={() => { setIsEraser(false); setIsBucket(false); setShapeMode('none'); }}> <PenLine size={18} /> </button>
        <button className={`h-10 px-3 py-2 rounded-lg text-white ${isEraser ? 'bg-sky-700 hover:bg-sky-800' : 'bg-slate-400'} ${highlight === 'eraser' ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-100 animate-pulse' : ''}`} title="Eraser" onClick={() => { setIsEraser(true); setIsBucket(false); setShapeMode('none'); }}> <Eraser size={18} /> </button>
        <button className={`h-10 px-3 py-2 rounded-lg text-white ${isBucket ? 'bg-sky-700 hover:bg-sky-800' : 'bg-slate-400'} ${highlight === 'bucket' ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-100 animate-pulse' : ''}`} title="Bucket" onClick={() => { setIsBucket(true); setIsEraser(false); setShapeMode('none'); }}> <PaintBucket size={18} /> </button>
        <div className="relative">
          <button className={`h-10 px-3 py-2 rounded-lg ${shapeMode !== 'none' ? 'bg-sky-700 text-white hover:bg-sky-800' : 'bg-slate-400 text-white'}`} title="Shapes" onClick={() => { setShowShapes((v) => !v); setIsEraser(false); setIsBucket(false); }}>
            <Shapes size={18} />
          </button>
          {showShapes && (
            <div className="absolute left-0 top-12 z-50 bg-white border border-slate-300 rounded-lg shadow p-2 min-w-[180px]">
              <div className="grid grid-cols-4 gap-2">
                <button className={`w-9 h-9 flex items-center justify-center rounded border ${shapeMode === 'circle' ? 'bg-slate-100 border-sky-400' : 'border-slate-300'}`} onClick={() => { setShapeMode('circle'); setShowShapes(false); }} title="Circle">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                </button>
                <button className={`w-9 h-9 flex items-center justify-center rounded border ${shapeMode === 'square' ? 'bg-slate-100 border-sky-400' : 'border-slate-300'}`} onClick={() => { setShapeMode('square'); setShowShapes(false); }} title="Square">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="6" width="12" height="12" rx="0" />
                  </svg>
                </button>
                <button className={`w-9 h-9 flex items-center justify-center rounded border ${shapeMode === 'diamond' ? 'bg-slate-100 border-sky-400' : 'border-slate-300'}`} onClick={() => { setShapeMode('diamond'); setShowShapes(false); }} title="Diamond">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 9-7 9-7-9 7-9z"/></svg>
                </button>
                <button className={`w-9 h-9 flex items-center justify-center rounded border ${shapeMode === 'star' ? 'bg-slate-100 border-sky-400' : 'border-slate-300'}`} onClick={() => { setShapeMode('star'); setShowShapes(false); }} title="Star">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l3.09 6.26L22 10.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 15.14l-5-4.87 6.91-1.01L12 3z"/></svg>
                </button>
              </div>
            </div>
          )}
        </div>
        <button className="h-10 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white" title="Clear" onClick={() => { if (confirm('Clear the canvas?')) { clear(); } }}> <Trash2 size={18} /> </button>
        <button id="lb-save-btn" className={`h-10 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-2 ${highlight === 'save' ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-100 animate-pulse' : ''}`} title="Save" onClick={save}>
          <Save size={18} />
          <span>Save</span>
        </button>
        <button className={`h-10 px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 ${highlight === 'undo' || highlight === 'history' ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-100 animate-pulse' : ''}`} title="Undo" onClick={undo}> <RotateCcw size={18} /> </button>
        <button className={`h-10 px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 ${highlight === 'redo' || highlight === 'history' ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-100 animate-pulse' : ''}`} title="Redo" onClick={redo}> <RotateCw size={18} /> </button>
        <div className="relative z-10 flex items-center gap-1">
          {DEFAULTS.map((c) => (
            <button
              key={c}
              className={`rounded-full transition-transform ${color === c ? 'w-7 h-7 -translate-y-0.5 border-2 border-sky-500' : 'w-6 h-6 border border-slate-300'}`}
              style={{ background: c }}
              onClick={() => { setColor(c); setIsEraser(false); }}
              aria-label={`color ${c}`}
            />
          ))}
          <div className="relative">
            <button
              ref={colorBtnRef}
              className="ml-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
              onClick={() => setShowWheel((v) => !v)}
              aria-label="pick color"
            >
              <span className="h-4 w-4 rounded-full border border-slate-300" style={{ background: color }} />
              <Droplet size={16} className="text-slate-700" />
            </button>
            {showWheel && (
              <ColorWheel
                color={color}
                onChange={(val) => { setColor(val); setIsEraser(false); }}
                onClose={() => setShowWheel(false)}
                anchorRef={colorBtnRef}
                dropdown
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className="text-slate-600 text-sm">Brush</span>
          <input className="accent-sky-600" type="range" min={1} max={20} value={brush} onChange={(e) => setBrush(parseInt(e.target.value, 10))} />
        </div>
      </div>
      <div className="relative">
        <canvas id="lb-canvas" ref={canvasRef} width={900} height={420} className="border-2 border-slate-300 rounded-xl bg-white w-full" />
        {cursorPos && (
          (() => {
            const canvas = canvasRef.current; if (!canvas) return null; const r = canvas.getBoundingClientRect(); const px = r.width / canvas.width; const size = (isEraser ? 14 : brush) * px; const left = cursorPos.x - size / 2; const top = cursorPos.y - size / 2;
            return <div style={{ position: 'absolute', left, top, width: size, height: size, border: '2px solid #0ea5e9', borderRadius: '9999px', pointerEvents: 'none' }} />;
          })()
        )}
      </div>
      {showSavedMsg && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm shadow-xl">Saved!</div>
        </div>
      )}
      {showGallery && (
        <div className="mt-3 grid grid-cols-4 gap-2 max-h-48 overflow-y-scroll">
          {saved.map((s) => (
            <div key={s.id} className="group relative border border-slate-200 rounded overflow-hidden cursor-pointer" onClick={() => openSaved(s.dataUrl)}>
              <img src={s.dataUrl} alt="Saved drawing" className="w-full h-24 object-cover" />
              <button className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center bg-white/95 border border-slate-300 text-slate-700 hover:bg-red-600 hover:text-white text-[11px] px-2 h-6 rounded" onClick={(e) => { e.stopPropagation(); const next = saved.filter((x) => x.id !== s.id); setSaved(next); chrome.storage?.local.set({ lb_drawings: next }); }} title="Delete">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}