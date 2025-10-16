import { mountOverlay } from '../overlay';

console.log('LovaBridge content script loaded');

const injectOverlayStyles = () => {
  let style = document.getElementById('lb-overlay-style') as HTMLStyleElement | null;
  if (!style) { style = document.createElement('style'); style.id = 'lb-overlay-style'; }
  style.textContent = `
    .lovabridge-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: transparent;
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    .lovabridge-overlay.active { opacity: 1; pointer-events: auto; }
    .lovabridge-container {
      position: fixed;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: visible;
      min-width: 480px;
      min-height: 360px;
      pointer-events: auto;
      contain: layout paint;
      resize: none !important;
    }
    .lovabridge-container::-webkit-scrollbar { width: 10px; }
    .lovabridge-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; border: 2px solid transparent; background-clip: content-box; }
    .lovabridge-container::-webkit-scrollbar-corner { background: transparent !important; }
    .lovabridge-container::-webkit-resizer { background: transparent !important; }
  `;
  if (!style.parentElement) document.head.appendChild(style);
};

const enableDrag = (el: HTMLElement, handle?: HTMLElement) => {
  let startX = 0; let startY = 0; let originLeft = 0; let originTop = 0; let dragging = false;
  const dragHandle = handle || el;
  dragHandle.style.cursor = 'move';
  dragHandle.addEventListener('mousedown', (e) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = el.getBoundingClientRect();
    originLeft = rect.left; originTop = rect.top;
    document.body.style.userSelect = 'none';
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const overlayRect = document.documentElement.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const newLeft = Math.min(Math.max(0, originLeft + dx), overlayRect.width - elRect.width);
    const newTop = Math.min(Math.max(0, originTop + dy), overlayRect.height - elRect.height);
    el.style.left = `${newLeft}px`;
    el.style.top = `${newTop}px`;
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    document.body.style.userSelect = '';
  });
};

const enableResize = (container: HTMLElement, root: ShadowRoot) => {
  const style = document.createElement('style');
  style.textContent = `
    .lb-resize-handle { position: absolute; z-index: 2147483647; background: transparent; pointer-events: auto; opacity: 0; }
    .lb-rh-n, .lb-rh-s { left: 0; right: 0; height: 10px; }
    .lb-rh-e, .lb-rh-w { top: 0; bottom: 0; width: 10px; }
    .lb-rh-n { top: 0; cursor: ns-resize; }
    .lb-rh-s { bottom: 0; cursor: ns-resize; }
    .lb-rh-e { right: 0; cursor: ew-resize; }
    .lb-rh-w { left: 0; cursor: ew-resize; }
    .lb-rh-ne, .lb-rh-nw, .lb-rh-se, .lb-rh-sw { width: 14px; height: 14px; position: absolute; }
    .lb-rh-ne { top: 0; right: 0; cursor: nesw-resize; }
    .lb-rh-nw { top: 0; left: 0; cursor: nwse-resize; }
    .lb-rh-se { bottom: 0; right: 0; cursor: nwse-resize; }
    .lb-rh-sw { bottom: 0; left: 0; cursor: nesw-resize; }
  `;
  root.appendChild(style);
  const docRect = () => document.documentElement.getBoundingClientRect();
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
  const start = (dir: string, e: MouseEvent) => {
    e.preventDefault();
    document.body.style.userSelect = 'none';
    const startX = e.clientX; const startY = e.clientY;
    const rect = container.getBoundingClientRect();
    const startW = rect.width; const startH = rect.height; const startL = rect.left; const startT = rect.top;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX; const dy = ev.clientY - startY; const d = docRect();
      let w = startW, h = startH, l = startL, t = startT;
      const minW = Math.max(480, parseFloat(getComputedStyle(container).minWidth) || 0);
      const minH = Math.max(360, parseFloat(getComputedStyle(container).minHeight) || 0);
      if (dir.includes('e')) w = clamp(startW + dx, minW, d.width - startL);
      if (dir.includes('s')) h = clamp(startH + dy, minH, d.height - startT);
      if (dir.includes('w')) { const nextW = clamp(startW - dx, minW, startW + startL); l = clamp(startL + (startW - nextW), 0, d.width - nextW); w = nextW; }
      if (dir.includes('n')) { const nextH = clamp(startH - dy, minH, startH + startT); t = clamp(startT + (startH - nextH), 0, d.height - nextH); h = nextH; }
      l = clamp(l, 0, d.width - w);
      t = clamp(t, 0, d.height - h);
      container.style.width = `${w}px`; container.style.height = `${h}px`; container.style.left = `${l}px`; container.style.top = `${t}px`;
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };
  const mk = (cls: string, dir: string) => { const h = document.createElement('div'); h.className = `lb-resize-handle ${cls}`; h.addEventListener('mousedown', (e) => start(dir, e)); root.appendChild(h); };
  mk('lb-rh-n', 'n'); mk('lb-rh-s', 's'); mk('lb-rh-e', 'e'); mk('lb-rh-w', 'w');
  mk('lb-rh-ne', 'ne'); mk('lb-rh-nw', 'nw'); mk('lb-rh-se', 'se'); mk('lb-rh-sw', 'sw');
  const clampIntoViewport = () => {
    const d = docRect();
    const r = container.getBoundingClientRect();
    let l = clamp(r.left, 0, Math.max(0, d.width - r.width));
    let t = clamp(r.top, 0, Math.max(0, d.height - r.height));
    let w = clamp(r.width, 480, d.width);
    let h = clamp(r.height, 360, d.height);
    if (l + w > d.width) l = d.width - w;
    if (t + h > d.height) t = d.height - h;
    container.style.left = `${Math.max(0, l)}px`;
    container.style.top = `${Math.max(0, t)}px`;
    container.style.width = `${w}px`;
    container.style.height = `${h}px`;
  };
  window.addEventListener('resize', clampIntoViewport);
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleOverlay') {
    let overlay = document.querySelector('.lovabridge-overlay') as HTMLElement;
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'lovabridge-overlay active';
      const container = document.createElement('div');
      container.className = 'lovabridge-container';
      container.style.width = '820px';
      container.style.height = '520px';
      container.style.top = '64px';
      container.style.left = '64px';
      container.style.position = 'fixed';
      container.style.transform = 'none';
      container.style.border = '2px solid #94a3b8';
      container.style.borderRadius = '12px';
      container.style.background = 'white';
      container.style.boxShadow = '0 20px 60px rgba(0,0,0,0.2)';
      container.style.overflow = 'hidden';

      const shadow = container.attachShadow({ mode: 'open' });
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('styles.css');
      shadow.appendChild(link);

      try {
        const onClose = () => overlay.remove();
        const root = mountOverlay(shadow, onClose, (el: HTMLElement | null) => { if (el) enableDrag(container, el); });
        enableResize(container, shadow);
        (overlay as any).__lbRoot = root;
      } catch (e) {
        console.error('Failed to mount React overlay', e);
      }
      overlay.appendChild(container);
      document.body.appendChild(overlay);
      sendResponse?.({ success: true });
    } else {
      overlay.classList.toggle('active');
      sendResponse?.({ success: true });
    }
    return true;
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectOverlayStyles);
} else {
  injectOverlayStyles();
}

export {};