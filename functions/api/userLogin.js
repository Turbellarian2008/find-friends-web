export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) return json({ code: 400, message: '缺少用户名或密码' });

    const row = await env.db
      .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
      .bind(String(username))
      .first();

    if (!row || String(row.password_hash) !== String(password)) {
      return json({ code: 401, message: '用户名或密码错误' });
    }

    const token = `t_${row.id}_${Date.now()}`;
    return json({ code: 0, data: { token, userId: row.id, username: row.username } });
  } catch (e) {
    return json({ code: 500, message: '服务器错误', error: String(e) });
  }
}
function json(obj, init) { return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
