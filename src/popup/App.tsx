import React, { useEffect, useState } from 'react';

const App: React.FC = () => {
  const [isLovable, setIsLovable] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);

  useEffect(() => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs?.[0]?.url || '';
        const ok = /https?:\/\/(?:[^.]+\.)?lovable\.(dev|so|site)\//i.test(url);
        setIsLovable(ok);
        setChecked(true);
      });
    } catch {
      setChecked(true);
    }
  }, []);

  const openOverlayOnPage = () => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        const tabId = tab?.id;
        const url = tab?.url || '';
        const isHttp = /^https?:\/\//.test(url) || /^file:\/\//.test(url);
        const allowed = /https?:\/\/(?:[^.]+\.)?lovable\.(dev|so|site)\//i.test(url);
        if (!isHttp || !allowed) {
          chrome.tabs.create({ url: 'https://lovable.dev' }, () => window.close());
          return;
        }
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { action: 'toggleOverlay' }, () => {
            if (chrome.runtime.lastError) {
              try {
                chrome.scripting.executeScript(
                  { target: { tabId }, files: ['content.js'] },
                  () => chrome.tabs.sendMessage(tabId, { action: 'toggleOverlay' }, () => window.close())
                );
              } catch {}
            } else {
              window.close();
            }
          });
        }
      });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-white text-slate-700" style={{ fontFamily: 'Fredoka, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
      <header className="bg-slate-50 p-4 text-center border-b border-slate-200 rounded-t-2xl">
        <h1 className="text-3xl font-bold mb-1 text-sky-600">LovaBuddy</h1>
        <p className="text-base text-slate-600">Launcher</p>
      </header>
      <main className="p-4">
        <div className="flex justify-center">
          <button
            className={`${checked && !isLovable ? 'bg-yellow-400 hover:bg-yellow-500 text-slate-900' : 'bg-sky-500 hover:bg-sky-600 text-white'} px-4 py-2 rounded-xl`}
            onClick={openOverlayOnPage}
          >
            {checked && !isLovable ? 'Must be on Lovable.dev. Press to open.' : 'Open overlay on page'}
                  </button>
        </div>
      </main>
    </div>
  );
};

export default App;


