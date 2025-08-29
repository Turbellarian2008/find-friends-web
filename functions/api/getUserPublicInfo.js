export async function onRequestPost({ request, env }) {
  const { userId, username } = await request.json().catch(() => ({}));
  if (!userId && !username) return json({ code: 400, message: '缺少用户标识（userId 或 username）' });
  let row;
  if (userId) {
    try {
      row = await env.db.prepare('SELECT username, nickname, gender, bio, iphone_num FROM users WHERE user_uid = ?').bind(String(userId)).first();
    } catch (e) {}
  }
  if (!row && username) {
    row = await env.db.prepare('SELECT username, nickname, gender, bio, iphone_num FROM users WHERE username = ?').bind(String(username)).first();
  }
  if (!row) return json({ code: 404, message: '用户不存在' });
  // 兼容没有 iphone_num 列的旧表结构
  if (typeof row.iphone_num === 'undefined') {
    row.iphone_num = '';
  }
  return json({ code: 0, data: { username: row.username, nickname: row.nickname || row.username, gender: row.gender || 0, bio: row.bio || '', iphone_num: row.iphone_num || '' } });
}
function json(obj, init) { return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
