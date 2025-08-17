export async function onRequestPost({ request, env }) {
  try {
    const { creator, page = 1, pageSize = 10 } = await request.json();
    if (!creator) return json({ code: 400, message: '缺少创建人信息' });
    const offset = (page - 1) * pageSize;

    const list = await env.DB.prepare(
      'SELECT * FROM activities WHERE creator_name = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(String(creator), pageSize, offset).all();

    const countRow = await env.DB.prepare('SELECT COUNT(1) as c FROM activities WHERE creator_name = ?').bind(String(creator)).first();
    const results = (list.results||[]).map(r => ({ ...r, participants: safeParseJson(r.participants) }));

    return json({ code: 0, data: { list: results, total: countRow?.c || 0, page, pageSize, hasMore: offset + results.length < (countRow?.c||0) } });
  } catch (e) {
    return json({ code: 500, message: '获取活动列表失败，请稍后重试', error: String(e) });
  }
}
function safeParseJson(s){ try{ return s? JSON.parse(s): []; } catch{ return []; } }
function json(obj, init) { return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
