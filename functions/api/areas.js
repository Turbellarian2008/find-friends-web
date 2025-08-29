export async function onRequestGet(context) {
  const { env } = context;
  try {
    const kv = env && env.AREAS_MAP;
    if (!kv || !kv.get) {
      return new Response(JSON.stringify({ code: 0, data: {} }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
    }
    const raw = await kv.get('regions.json');
    if (!raw) {
      return new Response(JSON.stringify({ code: 0, data: {} }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
    }
    let data = {};
    try { data = JSON.parse(raw); } catch { data = {}; }
    if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
    return new Response(JSON.stringify({ code: 0, data }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  } catch (e) {
    return new Response(JSON.stringify({ code: 1, message: e.message || 'error' }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
}
