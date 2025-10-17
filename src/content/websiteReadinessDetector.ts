export interface ReadinessResult {
  isReady: boolean;
  details?: string;
}

export class WebsiteReadinessDetector {
  private observer: MutationObserver | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  private detectorId: string;

  constructor() {
    this.detectorId = Math.random().toString(36).substring(7);
  }

  async detectReadiness(): Promise<ReadinessResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let checkCount = 0;
        const maxChecks = 300; 
        
        const checkInterval = setInterval(() => {
        checkCount++;
        
        const possibleSelectors = [
          '#chatinput-send-message-button',
          'button[type="submit"]',
          'form button[type="submit"]',
          'button[aria-label*="send" i]',
          'button[data-testid*="send" i]',
          'button[class*="send" i]'
        ];
        
        let sendButton: HTMLButtonElement | null = null;
        
        for (const selector of possibleSelectors) {
          try {
            const button = document.querySelector(selector) as HTMLButtonElement;
            if (button) {
              sendButton = button;
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        if (!sendButton) {
          return;
        }

        const svg = sendButton.querySelector('svg');
        const viewBox = svg?.getAttribute('viewBox');
        const isDisabled = sendButton.hasAttribute('disabled');

        const isReady = (viewBox === '0 0 24 24' && !isDisabled) || isDisabled;
        
        if (isReady) {
          clearInterval(checkInterval);
          resolve({
            isReady: true,
            details: 'Website is ready!'
          });
          return;
        }
        
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          resolve({
            isReady: false,
            details: 'Timeout after 10 minutes of checking'
          });
        }
      }, 3000); 
      
        this.timeoutId = checkInterval as any;
      }, 20000);
    });
  }

  private cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.timeoutId) {
      clearInterval(this.timeoutId);
      this.timeoutId = null;
    }
  }

  stop(): void {
    this.cleanup();
  }
}

export function quickReadinessCheck(): ReadinessResult {
  const possibleSelectors = [
    '#chatinput-send-message-button',
    'button[type="submit"]',
    'form button[type="submit"]',
    'button[aria-label*="send" i]',
    'button[data-testid*="send" i]',
    'button[class*="send" i]'
  ];
  
  let sendButton: HTMLButtonElement | null = null;
  
  for (const selector of possibleSelectors) {
    try {
      const buttons = document.querySelectorAll(selector);
      
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i] as HTMLButtonElement;
        const text = button.textContent?.trim() || '';
        const isDropdown = button.hasAttribute('aria-haspopup') || button.hasAttribute('aria-expanded');
        
        if (isDropdown || text.includes('Loading Live Preview') || text.includes('spot-the-dot')) {
          continue;
        }
        
        sendButton = button;
        break;
      }
      
      if (sendButton) break;
    } catch (e) {
    }
  }
  
  if (!sendButton) {
    return {
      isReady: false,
      details: 'Send button not found'
    };
  }

  const svg = sendButton.querySelector('svg');
  const viewBox = svg?.getAttribute('viewBox');
  const isDisabled = sendButton.hasAttribute('disabled');
  
  const isReady = (viewBox === '0 0 24 24' && !isDisabled) || isDisabled;
  
  return {
    isReady: isReady,
    details: isReady ? 'Website is ready' : 'Website is building'
  };
}
