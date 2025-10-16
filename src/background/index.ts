// Background script for LovaBridge Chrome extension

console.log('LovaBridge background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('LovaBridge extension installed');
    
    // Set default settings
    chrome.storage.local.set({
      isEnabled: true,
      conversationHistory: []
    });
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.local.get(['isEnabled', 'conversationHistory'], (result) => {
      sendResponse(result);
    });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'saveConversation') {
    chrome.storage.local.get(['conversationHistory'], (result) => {
      const history = result.conversationHistory || [];
      history.push(request.conversation);
      
      // Keep only last 10 conversations
      if (history.length > 10) {
        history.shift();
      }
      
      chrome.storage.local.set({ conversationHistory: history }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});

export {};
