import { mountOverlay } from '../overlay';

console.log('LovaBridge content script loaded');

const injectOverlayStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    .lovabridge-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .lovabridge-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    
    .lovabridge-container {
      position: fixed;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      pointer-events: auto;
    }
  `;
  document.head.appendChild(style);
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
    el.style.left = `${originLeft + dx}px`;
    el.style.top = `${originTop + dy}px`;
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    document.body.style.userSelect = '';
  });
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
        const root = mountOverlay(shadow, onClose, (el: HTMLElement | null) => {
          if (el) enableDrag(container, el);
        });
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
