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
