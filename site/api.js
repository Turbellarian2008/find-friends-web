async function post(name, data = {}, options = {}) {
  const { timeout = 10000 } = options;
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort('timeout'), timeout);
  try {
    const resp = await fetch(`/api/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
      signal: ctrl.signal
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error((json && (json.message || json.error)) || `HTTP ${resp.status}`);
    }
    return json; // { code, data, message }
  } finally {
    clearTimeout(tm);
  }
}

function toast(msg, opts = 1400) {
  // Backward compatible: if second arg is number, treat as duration
  const options = (typeof opts === 'number') ? { duration: opts } : (opts || {});
  const { center = false, size = 'md', duration = 1400 } = options;
  const el = document.createElement('div');
  el.className = 'toast' + (center ? ' center' : '') + (size === 'lg' ? ' lg' : '');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

function saveUser(info) {
  localStorage.setItem('userInfo', JSON.stringify(info || {}));
  if (info && info.username) localStorage.setItem('username', String(info.username));
  if (info && info.userId) localStorage.setItem('userId', String(info.userId));
}
function getUser() {
  try { return JSON.parse(localStorage.getItem('userInfo') || '{}'); } catch { return {}; }
}
function clearUser() {
  localStorage.removeItem('userInfo');
  localStorage.removeItem('username');
  localStorage.removeItem('userId');
}

function getUserId() {
  const u = getUser();
  return (u && u.userId) || localStorage.getItem('userId') || '';
}

window.Api = { post, toast, saveUser, getUser, clearUser, getUserId };
