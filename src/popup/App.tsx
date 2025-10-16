import React from 'react';

const App: React.FC = () => {
  const openOverlayOnPage = () => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        const tabId = tab?.id;
        const url = tab?.url || '';
        const isLovable = /^https?:\/\/(?:[^\/]*\.)?lovable\.dev\//i.test(url);
        if (!isLovable) {
          if (confirm('Please open lovable.dev to use LovaBridge Buddy. Go there now?')) {
            chrome.tabs.update(tabId!, { url: 'https://lovable.dev' });
          }
          return;
        }
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { action: 'toggleOverlay' }, () => {
            if (chrome.runtime.lastError) {
              try {
                chrome.scripting.executeScript(
                  { target: { tabId }, files: ['content.js'] },
                  () => chrome.tabs.sendMessage(tabId, { action: 'toggleOverlay' })
                );
              } catch {}
            }
          });
        }
      });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-white text-slate-700">
      <header className="bg-slate-50 p-4 text-center border-b border-slate-200">
        <h1 className="text-3xl font-bold mb-1 text-sky-600">LovaBridge Buddy</h1>
        <p className="text-base text-slate-600">Launcher</p>
      </header>
      <main className="p-4">
        <div className="flex justify-center">
          <button className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl" onClick={openOverlayOnPage}>
            Open overlay on page
                  </button>
        </div>
      </main>
    </div>
  );
};

export default App;
