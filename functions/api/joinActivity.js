export async function onRequestPost({ request, env }) {
  const { id, username, avatar } = await request.json().catch(() => ({}));
  if (!id) return json({ code: 400, message: '缺少活动ID' });
  if (!username) return json({ code: 401, message: '未登录或用户名缺失' });

  const row = await env.DB.prepare('SELECT id, total_people, joined_people, participants FROM activities WHERE id = ?').bind(id).first();
  if (!row) return json({ code: 404, message: '活动不存在' });
  const participants = safeParseJson(row.participants);
  if ((row.joined_people||0) >= (row.total_people||0)) return json({ code: 409, message: '该活动名额已满' });
  if (participants.some(p => String(p.username) === String(username))) return json({ code: 410, message: '你已报名该活动，请勿重复报名' });

  participants.push({ userId: null, username: String(username), avatar: avatar||'', joinTime: Date.now() });
  const jp = (row.joined_people||0) + 1;
  await env.DB.prepare('UPDATE activities SET joined_people = ?, participants = ?, updated_at = ? WHERE id = ?')
    .bind(jp, JSON.stringify(participants), Date.now(), id).run();
  return json({ code: 0, message: '报名成功', data: { id, username } });
}
function safeParseJson(s){ try{ return s? JSON.parse(s): []; } catch{ return []; } }
function json(obj, init) { return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
