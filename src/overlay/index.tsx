import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import OverlayApp from './OverlayApp';

export function mountOverlay(shadowRoot: ShadowRoot, onClose: () => void, onHeaderReady?: (el: HTMLElement | null) => void): Root {
  const mount = document.createElement('div');
  shadowRoot.appendChild(mount);
  const root = createRoot(mount);
  root.render(
    <React.StrictMode>
      <OverlayApp onClose={onClose} onHeaderReady={onHeaderReady} />
    </React.StrictMode>
  );
  return root;
}


