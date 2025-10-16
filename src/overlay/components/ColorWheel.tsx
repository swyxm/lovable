import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

type Props = {
  color: string;
  onChange: (hex: string) => void;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  dropdown?: boolean;
};

function clamp(v: number, min: number, max: number) { return Math.min(Math.max(v, min), max); }
function hexToRgb(hex: string) {
  let h = hex.trim().toLowerCase();
  if (!h.startsWith('#')) h = '#' + h;
  if (h.length === 4) { const r = h[1], g = h[2], b = h[3]; h = `#${r}${r}${g}${g}${b}${b}`; }
  if (!/^#[0-9a-f]{6}$/.test(h)) h = '#000000';
  const n = parseInt(h.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  const to = (x: number) => x.toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}
function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}
function hsvToRgb(h: number, s: number, v: number) {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export default function ColorWheel({ color, onChange, onClose, anchorRef = { current: null }, dropdown }: Props) {
  const popRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wheelRef = useRef<HTMLCanvasElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  const size = 220;
  const radius = size / 2 - 2;
  const initHSV = rgbToHsv(...Object.values(hexToRgb(color)) as unknown as [number, number, number]);
  const [sel, setSel] = useState<{ h: number; s: number }>({ h: initHSV.h, s: initHSV.s });

  useEffect(() => {
    const c = hexToRgb(color);
    const hsv = rgbToHsv(c.r, c.g, c.b);
    setSel({ h: hsv.h, s: hsv.s });
  }, [color]);

  const place = () => {
    if (dropdown) return; // dropdown mode uses absolute positioning from parent
    const a = (anchorRef && 'current' in anchorRef ? (anchorRef as any).current as HTMLElement | null : null); const p = popRef.current; if (!a || !p) return;
    const ar = a.getBoundingClientRect();
    const pw = p.offsetWidth || (size + 20);
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const left = clamp(Math.round(ar.left), 8, vw - pw - 8);
    const top = Math.round(ar.bottom) + 6;
    setPos({ left, top });
  };

  useLayoutEffect(() => { place(); }, [dropdown]);

  useEffect(() => {
    const wheel = document.createElement('canvas');
    wheel.width = size;
    wheel.height = size;
    const wctx = wheel.getContext('2d');
    if (!wctx) return;
    const img = wctx.createImageData(size, size);
    const cx = size / 2;
    const cy = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * size + x) * 4;
        if (dist <= radius) {
          const s = clamp(dist / radius, 0, 1);
          let ang = Math.atan2(dy, dx);
          if (ang < 0) ang += Math.PI * 2;
          const h = ang / (Math.PI * 2);
          const { r, g, b } = hsvToRgb(h, s, 1);
          img.data[idx] = r;
          img.data[idx + 1] = g;
          img.data[idx + 2] = b;
          img.data[idx + 3] = 255;
        } else {
          img.data[idx + 3] = 0;
        }
      }
    }
    wctx.putImageData(img, 0, 0);
    wheelRef.current = wheel;
  }, []);

  const draw = () => {
    const c = canvasRef.current;
    const wheel = wheelRef.current;
    if (!c || !wheel) return;
    c.width = size;
    c.height = size;
    c.style.width = `${size}px`;
    c.style.height = `${size}px`;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(wheel, 0, 0);
    // soft outer ring to reduce perceived jagged edge
    const cx = size / 2;
    const cy = size / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 0.5, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();
    const ang = sel.h * Math.PI * 2;
    const rad = sel.s * radius;
    const mx = cx + Math.cos(ang) * rad;
    const my = cy + Math.sin(ang) * rad;
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0ea5e9';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, my, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#0ea5e9';
    ctx.fill();
  };

  useEffect(() => { draw(); }, [sel, wheelRef.current]);

  useEffect(() => {
    const r = () => place();
    const onDoc = (e: PointerEvent) => {
      const p = popRef.current;
      const a = anchorRef.current;
      if (!p) return;
      const path = e.composedPath();
      if (path.includes(p) || (a && path.includes(a))) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (!dropdown) {
      window.addEventListener('resize', r);
      window.addEventListener('scroll', r, true);
    }
    window.addEventListener('pointerdown', onDoc, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      if (!dropdown) {
        window.removeEventListener('resize', r);
        window.removeEventListener('scroll', r, true);
      }
      window.removeEventListener('pointerdown', onDoc, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [dropdown]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    let moving = false;
    const handle = (e: PointerEvent) => {
      const rect = c.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = size / 2;
      const cy = size / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) return;
      let ang = Math.atan2(dy, dx);
      if (ang < 0) ang += Math.PI * 2;
      const h = ang / (Math.PI * 2);
      const s = clamp(dist / radius, 0, 1);
      setSel({ h, s });
      const rgb = hsvToRgb(h, s, 1);
      onChange(rgbToHex(rgb.r, rgb.g, rgb.b));
    };
    const pd = (e: PointerEvent) => { moving = true; c.setPointerCapture(e.pointerId); handle(e); };
    const pm = (e: PointerEvent) => { if (!moving) return; handle(e); };
    const pu = (e: PointerEvent) => { moving = false; c.releasePointerCapture(e.pointerId); };
    c.addEventListener('pointerdown', pd);
    c.addEventListener('pointermove', pm);
    c.addEventListener('pointerup', pu);
    c.addEventListener('pointercancel', pu);
    return () => {
      c.removeEventListener('pointerdown', pd);
      c.removeEventListener('pointermove', pm);
      c.removeEventListener('pointerup', pu);
      c.removeEventListener('pointercancel', pu);
    };
  }, [onChange]);

  return dropdown ? (
    <div ref={popRef} className="absolute left-0 top-12 z-50 rounded-xl border border-slate-300 bg-slate-100 shadow-xl p-3 select-none" onMouseDown={(e) => e.stopPropagation()}>
      <canvas ref={canvasRef} />
    </div>
  ) : (
    <div ref={popRef} style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 2147483647 }} className="rounded-xl border border-slate-300 bg-slate-100 shadow-xl p-3 select-none" onMouseDown={(e) => e.stopPropagation()}>
      <canvas ref={canvasRef} />
    </div>
  );
}