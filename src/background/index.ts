chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    
    chrome.storage.local.set({
      isEnabled: true,
      conversationHistory: []
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.local.get(['isEnabled', 'conversationHistory'], (result) => {
      sendResponse(result);
    });
    return true; 
  }
  
  if (request.action === 'saveConversation') {
    chrome.storage.local.get(['conversationHistory'], (result) => {
      const history = result.conversationHistory || [];
      history.push(request.conversation);
      
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
