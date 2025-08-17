export async function onRequestPost({ request, env }) {
  const { username } = await request.json().catch(() => ({}));
  if (!username) return json({ code: 400, message: '缺少用户名' });
  const row = await env.DB.prepare('SELECT username, nickname, gender, bio FROM users WHERE username = ?').bind(String(username)).first();
  if (!row) return json({ code: 404, message: '用户不存在' });
  return json({ code: 0, data: { username: row.username, nickname: row.nickname || row.username, gender: row.gender || 0, bio: row.bio || '' } });
}
function json(obj, init) { return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
