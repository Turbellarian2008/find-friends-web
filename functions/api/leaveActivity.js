export async function onRequestPost({ request, env }) {
  const { id, userId } = await request.json().catch(() => ({}));
  if (!id) return json({ code: 400, message: '缺少活动ID' });
  if (!userId) return json({ code: 401, message: '未登录或用户ID缺失' });
  const row = await env.db.prepare('SELECT id, creator_id, joined_people, participants FROM activities WHERE id = ?').bind(id).first();
  if (!row) return json({ code: 404, message: '活动不存在' });
  // 禁止发起者退出自己创建的活动
  if (String(row.creator_id||'') === String(userId)) {
    return json({ code: 403, message: '发起者不能退出自己创建的活动' });
  }
  const list = safeParseJson(row.participants);
  if (!list.some(p => String(p?.userId) === String(userId))) return json({ code: 411, message: '你未报名该活动' });
  const filtered = list.filter(p => String(p?.userId) !== String(userId));
  const nextJoined = Math.max(0, (row.joined_people||0) - 1);
  await env.db.prepare('UPDATE activities SET joined_people = ?, participants = ?, updated_at = ? WHERE id = ?')
    .bind(nextJoined, JSON.stringify(filtered), Date.now(), id).run();
  return json({ code: 0, message: '退出成功', data: { id, userId } });
}
function safeParseJson(s){ try{ return s? JSON.parse(s): []; } catch{ return []; } }
function json(obj, init){ return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }

