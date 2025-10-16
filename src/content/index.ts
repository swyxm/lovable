// Content script for LovaBridge Chrome extension
// This script runs on Lovable website pages to enable overlay functionality

console.log('LovaBridge content script loaded');

// Inject styles for the overlay
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
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      pointer-events: auto;
    }
  `;
  document.head.appendChild(style);
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleOverlay') {
    const overlay = document.querySelector('.lovabridge-overlay') as HTMLElement;
    if (overlay) {
      overlay.classList.toggle('active');
    }
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectOverlayStyles);
} else {
  injectOverlayStyles();
}

export {};
