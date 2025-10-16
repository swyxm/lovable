import { mountOverlay } from '../overlay';

console.log('LovaBridge content script loaded');

const LBA_PENDING_KEY = 'lb_pending_prompt';
const SEND_BUTTON_ID = 'chatinput-send-message-button';

const isLovableHost = (): boolean => {
  const host = location.hostname || '';
  return /(^|\.)lovable\.(dev|so|site)$/i.test(host);
};

const isElementVisible = (el: Element): boolean => {
  const node = el as HTMLElement;
  if (!node) return false;
  const rect = node.getBoundingClientRect();
  const style = window.getComputedStyle(node);
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
};

const findLovableHomePromptInput = (): HTMLElement | null => {
  const selectors = [
    'form#chat-input textarea#chatinput',
    'textarea#chatinput',
    'form#chat-input textarea',
    'form[id="chat-input"] textarea',
    'textarea[placeholder*="Ask Lovable" i]',
    'textarea[aria-label*="Lovable" i]',
  ];
  for (const sel of selectors) {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(isElementVisible);
    if (candidates.length) return candidates[0];
  }
  return null;
};

const sanitizePrompt = (raw: string): string => {
  let t = (raw || '').trim();
  t = t.replace(/^```[a-zA-Z0-9_-]*\s*\n?/, '');
  t = t.replace(/\n?```\s*$/, '');
  return t.trim();
};

const setFormElementValue = (el: HTMLInputElement | HTMLTextAreaElement, text: string) => {
  const prototype = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(prototype, 'value');
  if (desc && typeof desc.set === 'function') {
    desc.set.call(el, text);
  } else {
    (el as any).value = text;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

const setContentEditableText = (el: HTMLElement, text: string) => {
  el.focus();
  el.textContent = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Unidentified' }));
};

const pressEnterOn = (el: HTMLElement) => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', which: 13, keyCode: 13, bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', which: 13, keyCode: 13, bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', which: 13, keyCode: 13, bubbles: true }));
};

const scheduleEnter = (el: HTMLElement) => {
  try {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        pressEnterOn(el);
      });
    });
  } catch {
    setTimeout(() => pressEnterOn(el), 30);
  }
};

const scheduleClickSend = (el: HTMLElement, withinMs: number = 2000) => {
  const start = Date.now();
  const tryClick = () => {
    const btn = document.getElementById(SEND_BUTTON_ID) as HTMLButtonElement | null;
    if (btn && !btn.disabled) {
      btn.click();
      return;
    }
    if (Date.now() - start < withinMs) {
      requestAnimationFrame(tryClick);
    } else {
      scheduleEnter(el);
    }
  };
  tryClick();
};

const findLovableHomeForm = (): HTMLFormElement | null => {
  const form = document.querySelector('form#chat-input') as HTMLFormElement | null;
  if (form) return form;
  return null;
};

const scheduleRequestSubmit = (targetEl: HTMLElement) => {
  const submitNow = () => {
    const form = (targetEl.closest('form') as HTMLFormElement | null) || findLovableHomeForm();
    if (form) {
      try {
        if (typeof (form as any).requestSubmit === 'function') {
          (form as any).requestSubmit();
          return;
        }
      } catch {}
      try {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        return;
      } catch {}
    }
    scheduleClickSend(targetEl);
  };
  try {
    requestAnimationFrame(() => {
      requestAnimationFrame(submitNow);
    });
  } catch {
    setTimeout(submitNow, 30);
  }
};


const pastePromptToLovableHome = (prompt: string, autoSend: boolean = true): boolean => {
  if (!isLovableHost()) return false;
  const target = findLovableHomePromptInput();
  if (!target) return false;
  target.scrollIntoView({ block: 'center' });
  try { (target as HTMLElement).focus(); } catch {}
  const clean = sanitizePrompt(prompt);
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    setFormElementValue(target, clean);
    if (autoSend) {
      scheduleRequestSubmit(target);
    }
    return true;
  }
  if ((target as HTMLElement).getAttribute('contenteditable') === 'true') {
    setContentEditableText(target as HTMLElement, clean);
    if (autoSend) {
      scheduleRequestSubmit(target as HTMLElement);
    }
    return true;
  }
  return false;
};

const tryConsumePendingPrompt = () => {
  if (!isLovableHost()) return;
  try {
    chrome.storage.local.get([LBA_PENDING_KEY], (result) => {
      const pending = result?.[LBA_PENDING_KEY];
      if (typeof pending === 'string' && pending.trim()) {
        const ok = pastePromptToLovableHome(pending);
        if (ok) {
          chrome.storage.local.remove([LBA_PENDING_KEY], () => {});
        }
      }
    });
  } catch {}
};

window.addEventListener('lb:pastePrompt' as any, (e: Event) => {
  try {
    const ce = e as CustomEvent & { detail?: any };
    const prompt = ce?.detail?.prompt as string | undefined;
    if (typeof prompt === 'string' && prompt.trim()) {
      const ok = pastePromptToLovableHome(prompt);
      if (!ok) {
        try { chrome.storage.local.set({ [LBA_PENDING_KEY]: prompt }, () => {}); } catch {}
      }
    }
  } catch {}
});

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (Object.prototype.hasOwnProperty.call(changes, LBA_PENDING_KEY)) {
      const next = changes[LBA_PENDING_KEY]?.newValue as string | undefined;
      if (typeof next === 'string' && next.trim()) {
        const ok = pastePromptToLovableHome(next);
        if (ok) {
          try { chrome.storage.local.remove([LBA_PENDING_KEY], () => {}); } catch {}
        }
      }
    }
  });
} catch {}

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
    
    .lovabridge-overlay.active {
      opacity: 1;
      background: rgba(2, 6, 23, 0.35); /* dim background */
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      pointer-events: auto;
    }
    
    .lovabridge-container {
      position: fixed;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      min-width: 480px;
      min-height: 360px;
      pointer-events: auto;
      contain: layout paint;
    }
    .lovabridge-container:focus { outline: none; }
    .lovabridge-container::-webkit-scrollbar { width: 10px; }
    .lovabridge-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; border: 2px solid transparent; background-clip: content-box; }

    .lb-resize-handle { position: absolute; z-index: 2147483647; background: transparent; pointer-events: auto; opacity: 0; }
    .lb-rh-n, .lb-rh-s { left: 0; right: 0; height: 6px; }
    .lb-rh-e, .lb-rh-w { top: 0; bottom: 0; width: 6px; }
    .lb-rh-n { top: -3px; cursor: ns-resize; }
    .lb-rh-s { bottom: -3px; cursor: ns-resize; }
    .lb-rh-e { right: -3px; cursor: ew-resize; }
    .lb-rh-w { left: -3px; cursor: ew-resize; }
    .lb-rh-ne, .lb-rh-nw, .lb-rh-se, .lb-rh-sw { width: 10px; height: 10px; }
    .lb-rh-ne { top: -3px; right: -3px; cursor: nesw-resize; position: absolute; }
    .lb-rh-nw { top: -3px; left: -3px; cursor: nwse-resize; position: absolute; }
    .lb-rh-se { bottom: -3px; right: -3px; cursor: nwse-resize; position: absolute; }
    .lb-rh-sw { bottom: -3px; left: -3px; cursor: nesw-resize; position: absolute; }

    .lovabridge-container::-webkit-scrollbar-corner { background: transparent; }
    .lovabridge-container::-webkit-resizer { background: transparent; }
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

const enableResize = (container: HTMLElement) => {
  const docRect = () => document.documentElement.getBoundingClientRect();
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
  const start = (dir: string, e: MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX; const startY = e.clientY;
    const rect = container.getBoundingClientRect();
    const startW = rect.width; const startH = rect.height; const startL = rect.left; const startT = rect.top;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX; const dy = ev.clientY - startY; const d = docRect();
      let w = startW, h = startH, l = startL, t = startT;
      const minW = 480, minH = 360;
      if (dir.includes('e')) w = clamp(startW + dx, minW, d.width - startL);
      if (dir.includes('s')) h = clamp(startH + dy, minH, d.height - startT);
      if (dir.includes('w')) { const nextW = clamp(startW - dx, minW, startW + startL); l = clamp(startL + (startW - nextW), 0, startL + startW - minW); w = nextW; }
      if (dir.includes('n')) { const nextH = clamp(startH - dy, minH, startH + startT); t = clamp(startT + (startH - nextH), 0, startT + startH - minH); h = nextH; }
      container.style.width = `${w}px`; container.style.height = `${h}px`; container.style.left = `${l}px`; container.style.top = `${t}px`;
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };
  const mk = (cls: string, dir: string) => { const h = document.createElement('div'); h.className = `lb-resize-handle ${cls}`; h.addEventListener('mousedown', (e) => start(dir, e)); container.appendChild(h); };
  mk('lb-rh-n', 'n'); mk('lb-rh-s', 's'); mk('lb-rh-e', 'e'); mk('lb-rh-w', 'w');
  mk('lb-rh-ne', 'ne'); mk('lb-rh-nw', 'nw'); mk('lb-rh-se', 'se'); mk('lb-rh-sw', 'sw');
};

let __lbKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
let __lbWheelHandler: ((e: Event) => void) | null = null;
let __lbPointerHandler: ((e: Event) => void) | null = null;
let __lbFocusHandler: ((e: FocusEvent) => void) | null = null;
let __lbContainerKeydown: ((e: KeyboardEvent) => void) | null = null;
let __lbContainerKeypress: ((e: KeyboardEvent) => void) | null = null;
let __lbContainerKeyup: ((e: KeyboardEvent) => void) | null = null;

const isEventInsideOverlay = (overlay: HTMLElement, e: Event) => {
  const path = (e as any).composedPath ? (e as any).composedPath() : [];
  return Array.isArray(path) ? path.includes(overlay) : overlay.contains(e.target as Node);
};

const activateInteractionBlockers = (overlay: HTMLElement, container: HTMLElement) => {
  const prevOverflow = document.body.style.overflow;
  (overlay as any).__lbPrevOverflow = prevOverflow;
  document.body.style.overflow = 'hidden';

  if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
  try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch {}

  if (!__lbKeydownHandler) {
    __lbKeydownHandler = (e: KeyboardEvent) => {
      if (!overlay.classList.contains('active')) return;
      const inside = isEventInsideOverlay(overlay, e);
      if (!inside) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', __lbKeydownHandler, true);
  }

  if (!__lbWheelHandler) {
    __lbWheelHandler = (e: Event) => {
      if (!overlay.classList.contains('active')) return;
      const inside = isEventInsideOverlay(overlay, e);
      if (!inside) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', __lbWheelHandler, { passive: false, capture: true } as any);
  }

  if (!__lbPointerHandler) {
    __lbPointerHandler = (e: Event) => {
      if (!overlay.classList.contains('active')) return;
      const inside = isEventInsideOverlay(overlay, e);
      if (!inside) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    window.addEventListener('pointerdown', __lbPointerHandler, true);
    window.addEventListener('pointerup', __lbPointerHandler, true);
    window.addEventListener('click', __lbPointerHandler, true);
  }

  if (!__lbFocusHandler) {
    __lbFocusHandler = (e: FocusEvent) => {
      if (!overlay.classList.contains('active')) return;
      if (!isEventInsideOverlay(overlay, e)) {
        e.stopPropagation();
        e.preventDefault();
        const sr = container.shadowRoot as ShadowRoot | null;
        if (sr) {
          const primary = sr.querySelector<HTMLElement>('[data-lb-primary-focus]');
          if (primary) { try { primary.focus(); return; } catch {} }
          const candidates = Array.from(sr.querySelectorAll<HTMLElement>('input, textarea, select, [contenteditable="true"], button, [tabindex]:not([tabindex="-1"])'));
          const notInHeader = candidates.find(el => !el.closest('#lb-header'));
          if (notInHeader) { try { notInHeader.focus(); return; } catch {} }
        }
        try { container.focus(); } catch {}
      }
    };
    window.addEventListener('focusin', __lbFocusHandler as any, true);
  }
  if (!__lbContainerKeydown) {
    __lbContainerKeydown = (e: KeyboardEvent) => { e.stopPropagation(); };
    container.addEventListener('keydown', __lbContainerKeydown, false);
  }
  if (!__lbContainerKeypress) {
    __lbContainerKeypress = (e: KeyboardEvent) => { e.stopPropagation(); };
    container.addEventListener('keypress', __lbContainerKeypress, false);
  }
  if (!__lbContainerKeyup) {
    __lbContainerKeyup = (e: KeyboardEvent) => { e.stopPropagation(); };
    container.addEventListener('keyup', __lbContainerKeyup, false);
  }
};

const deactivateInteractionBlockers = (overlay?: HTMLElement) => {
  if (__lbKeydownHandler) { window.removeEventListener('keydown', __lbKeydownHandler, true); __lbKeydownHandler = null; }
  if (__lbWheelHandler) { window.removeEventListener('wheel', __lbWheelHandler as any, true as any); __lbWheelHandler = null; }
  if (__lbPointerHandler) {
    window.removeEventListener('pointerdown', __lbPointerHandler, true);
    window.removeEventListener('pointerup', __lbPointerHandler, true);
    window.removeEventListener('click', __lbPointerHandler, true);
    __lbPointerHandler = null;
  }
  if (__lbFocusHandler) { window.removeEventListener('focusin', __lbFocusHandler as any, true); __lbFocusHandler = null; }
  try {
    const container = overlay?.querySelector('.lovabridge-container') as HTMLElement | null;
    if (container) {
      if (__lbContainerKeydown) { container.removeEventListener('keydown', __lbContainerKeydown, false); __lbContainerKeydown = null; }
      if (__lbContainerKeypress) { container.removeEventListener('keypress', __lbContainerKeypress, false); __lbContainerKeypress = null; }
      if (__lbContainerKeyup) { container.removeEventListener('keyup', __lbContainerKeyup, false); __lbContainerKeyup = null; }
    }
  } catch {}
  try {
    const prev = (overlay as any)?.__lbPrevOverflow as string | undefined;
    document.body.style.overflow = prev ?? '';
  } catch {}
};


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleOverlay') {
    const host = location.hostname || '';
    const isLovable = /(^|\.)lovable\.dev$/i.test(host);
    if (!isLovable) {
      sendResponse?.({ success: false, error: 'not_lovable' });
      return true;
    }
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
        const onClose = () => { deactivateInteractionBlockers(overlay); overlay.remove(); };
        const root = mountOverlay(shadow, onClose, (el: HTMLElement | null) => { if (el) enableDrag(container, el); });
        enableResize(container);
        (overlay as any).__lbRoot = root;
      } catch (e) {
        console.error('Failed to mount React overlay', e);
      }
      overlay.appendChild(container);
      document.body.appendChild(overlay);
      activateInteractionBlockers(overlay, container);
      sendResponse?.({ success: true });
    } else {
      overlay.classList.toggle('active');
      const container = overlay.querySelector('.lovabridge-container') as HTMLElement | null;
      if (overlay.classList.contains('active') && container) {
        activateInteractionBlockers(overlay, container);
      } else {
        deactivateInteractionBlockers(overlay);
      }
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryConsumePendingPrompt);
} else {
  tryConsumePendingPrompt();
}

export {};
