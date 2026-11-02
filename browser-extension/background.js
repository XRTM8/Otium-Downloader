/**
 * Otium Downloader Extension - Background Service Worker
 * Intercepts downloads and routes context-menu clicks to Otium's native loopback bridge (127.0.0.1:41523)
 */

const OTIUM_BRIDGE_URL = 'http://127.0.0.1:41523';

// In-memory sniffer cache for detected video/media streams per browser tab
const tabMedia = new Map();
const MEDIA_REGEX = /\.(m3u8|mpd|mp4|webm|flv|mkv)(\?.*)?$/i;

// 1. Initialize Context Menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'otium-download-link',
    title: 'تنزيل بواسطة Otium Downloader ⚡',
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'otium-download-media',
    title: 'تنزيل الوسائط بواسطة Otium ⚡',
    contexts: ['image', 'video', 'audio']
  });

  chrome.contextMenus.create({
    id: 'otium-download-selection',
    title: 'تنزيل الرابط المحدد بـ Otium ⚡',
    contexts: ['selection']
  });
});

// 2. Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let targetUrl = '';
  if (info.menuItemId === 'otium-download-link' && info.linkUrl) {
    targetUrl = info.linkUrl;
  } else if (info.menuItemId === 'otium-download-media' && info.srcUrl) {
    targetUrl = info.srcUrl;
  } else if (info.menuItemId === 'otium-download-selection' && info.selectionText) {
    const text = info.selectionText.trim();
    if (/^https?:\/\/.+/i.test(text) || text.startsWith('magnet:?')) {
      targetUrl = text;
    }
  }

  if (targetUrl) {
    const referer = tab?.url || '';
    const success = await sendToOtium(targetUrl, undefined, referer);
    if (!success) {
      showNotification('تنبيه Otium', 'تأكد من تشغيل تطبيق Otium Downloader على حاسوبك للبدء.');
    }
  }
});

// 3. Optional: Intercept Native Browser Downloads
chrome.downloads.onCreated.addListener(async (item) => {
  const settings = await chrome.storage.local.get({ autoIntercept: true });
  if (!settings.autoIntercept) return;

  const url = item.finalUrl || item.url;
  if (!url || url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('chrome-extension:')) {
    return;
  }

  // Ping Otium Desktop bridge
  const isOnline = await checkOtiumOnline();
  if (!isOnline) {
    // Otium is not open, let the browser download proceed untouched
    return;
  }

  // Cancel native browser download
  try {
    await chrome.downloads.cancel(item.id);
    await chrome.downloads.erase({ id: item.id });
  } catch {
    // Download may have completed or already canceled
  }

  const referer = item.referrer || '';
  const filename = item.filename ? item.filename.split(/[\\/]/).pop() : undefined;

  const sent = await sendToOtium(url, filename, referer);
  if (sent) {
    showNotification('تم التقاط التنزيل ⚡', filename || url);
  }
});

// 4. Live Media/Stream Sniffer (HLS .m3u8, DASH .mpd, MP4, WebM)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId > 0 && details.url) {
      const match = details.url.match(MEDIA_REGEX);
      if (match) {
        const ext = match[1].toLowerCase();
        let list = tabMedia.get(details.tabId) || [];
        if (!list.some((m) => m.url === details.url)) {
          const rawName = details.url.split('?')[0].split('/').pop() || `stream.${ext}`;
          let cleanName = decodeURIComponent(rawName);
          list.push({
            url: details.url,
            ext,
            type: ext === 'm3u8' ? 'HLS Stream' : ext === 'mpd' ? 'DASH Stream' : ext.toUpperCase(),
            filename: cleanName,
            timestamp: Date.now()
          });
          if (list.length > 30) list = list.slice(-30);
          tabMedia.set(details.tabId, list);

          try {
            chrome.action.setBadgeText({ tabId: details.tabId, text: String(list.length) });
            chrome.action.setBadgeBackgroundColor({ tabId: details.tabId, color: '#00e599' });
          } catch {}
        }
      }
    }
  },
  { urls: ['<all_urls>'] }
);

// Tab cleanup on close or reload
chrome.tabs.onRemoved.addListener((tabId) => {
  tabMedia.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabMedia.delete(tabId);
    try {
      chrome.action.setBadgeText({ tabId, text: '' });
    } catch {}
  }
});

// Runtime message responder for popup queries
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_TAB_MEDIA') {
    const list = tabMedia.get(request.tabId) || [];
    sendResponse({ media: list });
  }
  return true;
});

/**
 * Checks if Otium Desktop local bridge is listening.
 */
async function checkOtiumOnline() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 750);
    const res = await fetch(`${OTIUM_BRIDGE_URL}/ping`, {
      method: 'GET',
      headers: {
        'X-Otium-Client': 'browser-extension'
      },
      signal: ctrl.signal
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Dispatches a download link to Otium Desktop.
 */
async function sendToOtium(url, filename, referer) {
  try {
    const headers = {};
    if (referer && !referer.startsWith('chrome') && !referer.startsWith('moz')) {
      headers['Referer'] = referer;
    }

    const payload = {
      url,
      filename: filename || null,
      headers: Object.keys(headers).length > 0 ? headers : null
    };

    const res = await fetch(`${OTIUM_BRIDGE_URL}/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Otium-Client': 'browser-extension'
      },
      body: JSON.stringify(payload)
    });

    return res.ok;
  } catch (err) {
    console.warn('Failed to communicate with Otium Desktop:', err);
    return false;
  }
}

/**
 * Emits a Chrome system notification.
 */
function showNotification(title, message) {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title,
      message,
      priority: 1
    });
  } catch {}
}
