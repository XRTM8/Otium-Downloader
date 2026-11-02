const OTIUM_BRIDGE_URL = 'http://127.0.0.1:41523';

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const interceptToggle = document.getElementById('interceptToggle');
const manualUrl = document.getElementById('manualUrl');
const sendBtn = document.getElementById('sendBtn');

// 1. Load saved preferences
chrome.storage.local.get({ autoIntercept: true }, (items) => {
  interceptToggle.checked = items.autoIntercept;
});

interceptToggle.addEventListener('change', () => {
  chrome.storage.local.set({ autoIntercept: interceptToggle.checked });
});

// 2. Check Otium status
async function checkStatus() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 800);
    const res = await fetch(`${OTIUM_BRIDGE_URL}/ping`, {
      method: 'GET',
      headers: { 'X-Otium-Client': 'browser-extension' },
      signal: ctrl.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      statusDot.className = 'status-dot online';
      statusText.textContent = 'متصل بـ Otium';
      statusText.style.color = '#00e599';
      sendBtn.disabled = false;
    } else {
      throw new Error();
    }
  } catch {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'غير متصل (شغّل Otium)';
    statusText.style.color = '#ef4444';
    sendBtn.disabled = true;
  }
}

// 3. Send manual URL to Otium
sendBtn.addEventListener('click', async () => {
  const url = manualUrl.value.trim();
  if (!url) return;

  sendBtn.textContent = 'جاري الإرسال...';
  try {
    const res = await fetch(`${OTIUM_BRIDGE_URL}/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Otium-Client': 'browser-extension'
      },
      body: JSON.stringify({ url, filename: null })
    });

    if (res.ok) {
      manualUrl.value = '';
      sendBtn.textContent = 'تم الإرسال بنجاح ⚡';
      setTimeout(() => {
        sendBtn.textContent = 'إرسال للتنزيل بـ Otium ⚡';
      }, 1500);
    } else {
      sendBtn.textContent = 'فشل الإرسال';
    }
  } catch {
    sendBtn.textContent = 'تعذر الاتصال بـ Otium';
  }
});

// Initial check
checkStatus();

// 4. Load & Render Detected Media Streams
const mediaCard = document.getElementById('mediaCard');
const mediaList = document.getElementById('mediaList');
const mediaCountBadge = document.getElementById('mediaCountBadge');

async function loadTabMedia() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) return;

    const currentTab = tabs[0];
    chrome.runtime.sendMessage(
      { type: 'GET_TAB_MEDIA', tabId: currentTab.id },
      (response) => {
        if (!response || !Array.isArray(response.media) || response.media.length === 0) {
          mediaCard.style.display = 'none';
          return;
        }

        const media = response.media;
        mediaCard.style.display = 'block';
        mediaCountBadge.textContent = String(media.length);
        mediaList.innerHTML = '';

        media.forEach((item) => {
          const div = document.createElement('div');
          div.className = 'media-item';

          const info = document.createElement('div');
          info.className = 'media-info';

          const title = document.createElement('span');
          title.className = 'media-title';
          title.title = item.url;
          title.textContent = item.filename;

          const tag = document.createElement('span');
          tag.className = 'media-tag';
          tag.textContent = `[${item.type}]`;

          info.appendChild(title);
          info.appendChild(tag);

          const btn = document.createElement('button');
          btn.className = 'media-btn';
          btn.textContent = 'تنزيل ⚡';

          btn.addEventListener('click', async () => {
            btn.textContent = 'جاري الإرسال...';
            btn.disabled = true;
            try {
              const res = await fetch(`${OTIUM_BRIDGE_URL}/add`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Otium-Client': 'browser-extension'
                },
                body: JSON.stringify({
                  url: item.url,
                  filename: item.filename,
                  headers: currentTab.url ? { Referer: currentTab.url } : null
                })
              });

              if (res.ok) {
                btn.textContent = 'تم الإرسال ✓';
                btn.style.background = '#00e599';
                btn.style.color = '#08090c';
              } else {
                btn.textContent = 'خطأ';
                btn.disabled = false;
              }
            } catch {
              btn.textContent = 'فشل الاتصال';
              btn.disabled = false;
            }
          });

          div.appendChild(info);
          div.appendChild(btn);
          mediaList.appendChild(div);
        });
      }
    );
  } catch (err) {
    console.warn('Failed to load tab media:', err);
  }
}

loadTabMedia();
