import React from 'react';

const App: React.FC = () => {
  const [notOnLovable, setNotOnLovable] = React.useState<boolean>(false);

  React.useEffect(() => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url || '';
        const isLovable = /^https?:\/\/(?:[^\/]*\.)?lovable\.dev\//i.test(url);
        setNotOnLovable(!isLovable);
      });
    } catch {}
  }, []);
  const openOverlayOnPage = () => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        const tabId = tab?.id;
        const url = tab?.url || '';
        const isLovable = /^https?:\/\/(?:[^\/]*\.)?lovable\.dev\//i.test(url);
        if (!isLovable) { setNotOnLovable(true); return; }
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
    <div className="min-h-screen bg-white text-slate-700 rounded-xl" style={{ width: 300, height: 160 }}>
      <header className="bg-slate-50 p-3 text-center border-b border-slate-200 rounded-t-xl">
        <h1 className="text-2xl font-bold mb-1 text-sky-600">LovaBridge Buddy</h1>
        <p className="text-sm text-slate-600">Launcher</p>
      </header>
      <main className="p-3">
        {notOnLovable ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-center">
            <p className="text-sm mb-2">Please open lovable.dev to use LovaBridge Buddy.</p>
            <button className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg text-sm" onClick={() => {
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tabId = tabs[0]?.id;
                if (tabId) chrome.tabs.update(tabId, { url: 'https://lovable.dev' });
              });
            }}>Go to lovable.dev</button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl" onClick={openOverlayOnPage}>
              Launch LovaBuddy
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
