export async function onRequestPost({ request, env }) {
  const { id, username } = await request.json().catch(() => ({}));
  if (!id) return json({ code: 400, message: '缺少活动ID' });
  if (!username) return json({ code: 401, message: '未登录或用户名缺失' });
  const row = await env.DB.prepare('SELECT id, joined_people, participants FROM activities WHERE id = ?').bind(id).first();
  if (!row) return json({ code: 404, message: '活动不存在' });
  const list = safeParseJson(row.participants);
  if (!list.some(p => String(p.username) === String(username))) return json({ code: 411, message: '你未报名该活动' });
  const filtered = list.filter(p => String(p.username) !== String(username));
  const nextJoined = Math.max(0, (row.joined_people||0)-1);
  await env.DB.prepare('UPDATE activities SET joined_people = ?, participants = ?, updated_at = ? WHERE id = ?')
    .bind(nextJoined, JSON.stringify(filtered), Date.now(), id).run();
  return json({ code: 0, message: '退出成功', data: { id, username } });
}
function safeParseJson(s){ try{ return s? JSON.parse(s): []; } catch{ return []; } }
function json(obj, init) { return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
