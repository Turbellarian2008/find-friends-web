export function setupUniCloudHttpAdapter(baseUrl = '') {
  try {
    if (typeof window !== 'undefined' && !window.uniCloud) {
      window.uniCloud = {};
    }
  } catch (e) {
    // ignore
  }
  const uniCloudObj = (typeof window !== 'undefined' ? window.uniCloud : global.uniCloud) || {};
  uniCloudObj.callFunction = async ({ name, data, timeout = 10000 }) => {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort('timeout'), timeout);
    try {
      const resp = await fetch(`${baseUrl}/api/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
        signal: ctrl.signal
      });
      const json = await resp.json().catch(() => ({}));
      return { result: json };
    } catch (e) {
      return Promise.reject(e);
    } finally {
      clearTimeout(tm);
    }
  };
  if (typeof window !== 'undefined') {
    window.uniCloud = uniCloudObj;
  } else {
    global.uniCloud = uniCloudObj;
  }
}
