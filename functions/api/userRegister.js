export async function onRequestPost({ request, env }) {
  try {
    const { username, password, agreePrivacy, policyVersion } = await request.json();
    if (!username || !password) return json({ code: 400, message: '用户名和密码不能为空' });
    if (!agreePrivacy) return json({ code: 400, message: '请勾选并同意隐私政策' });
    if (String(username).trim().length < 3 || String(username).trim().length > 20)
      return json({ code: 400, message: '用户名长度需在3-20个字符之间' });
    if (String(password).length < 6 || String(password).length > 20)
      return json({ code: 400, message: '密码长度需在6-20个字符之间' });

    const dup = await env.db.prepare('SELECT id FROM users WHERE username = ?').bind(String(username).trim()).first();
    if (dup) return json({ code: 409, message: '用户名重复' });

    // 暂与测试数据保持明文兼容，后续改为哈希
    const password_hash = String(password);
    const now = Date.now();
    const ins = await env.db.prepare(
      'INSERT INTO users (username, password_hash, nickname, avatar, gender, bio, create_time, update_time, last_login_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(String(username).trim(), password_hash, String(username).trim(), '', 0, '', now, now, 0).run();

    return json({ code: 0, message: '注册成功', data: { userId: ins.lastRowId } });
  } catch (e) {
    return json({ code: 500, message: '注册失败，请稍后重试', error: String(e) });
  }
}

function json(obj, init) {
  return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) });
}
