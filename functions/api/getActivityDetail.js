export async function onRequestPost({ request, env }) {
  try {
    const { id } = await request.json();
    if (!id) return json({ code: -1, message: '缺少活动标识参数（需要 id）' });
    const row = await env.db.prepare('SELECT * FROM activities WHERE id = ?').bind(id).first();
    if (!row) return json({ code: -1, message: '活动不存在或已被删除', requestedId: id });
    row.participants = safeParseJson(row.participants);
    return json({ code: 0, data: row });
  } catch (e) {
    return json({ code: -1, message: '获取详情失败: ' + String(e) });
  }
}
function safeParseJson(s){ try{ return s? JSON.parse(s): []; } catch{ return []; } }
function json(obj, init){ return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
