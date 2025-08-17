export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return new Response(JSON.stringify({ code: 400, message: '缺少用户名或密码' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 查询用户（与当前种子保持明文兼容）
    const row = await env.DB
      .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
      .bind(String(username))
      .first();

    if (!row || String(row.password_hash) !== String(password)) {
      return new Response(JSON.stringify({ code: 401, message: '用户名或密码错误' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 简单 token（请在后续替换为安全实现）
    const token = `t_${row.id}_${Date.now()}`;
    return new Response(
      JSON.stringify({ code: 0, data: { token, userId: row.id, username: row.username } }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ code: 500, message: '服务器错误', error: String(e) }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
