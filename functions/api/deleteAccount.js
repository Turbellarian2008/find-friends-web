export async function onRequestPost({ request, env }) {
  try {
    if (!env || !env.db) return json({ code: 500, message: '数据库未绑定：检查 wrangler.toml 的 d1_databases 绑定名是否为 db' });
    const body = await request.json().catch(() => ({}));
    const userId = String(body.userId || '').trim(); // user_uid
    const confirmUsername = String(body.confirmUsername || '').trim();
    if (!userId) return json({ code: 400, message: '缺少用户ID' });
    if (!confirmUsername) return json({ code: 400, message: '请填写确认的用户名' });

    // 查用户
    const user = await env.db.prepare('SELECT id, username, user_uid FROM users WHERE user_uid = ?').bind(userId).first();
    if (!user) return json({ code: 404, message: '用户不存在' });
    if (String(user.username) !== confirmUsername) return json({ code: 400, message: '用户名不匹配，无法删除' });

    // 1) 删除与用户相关的反馈
    try {
      await env.db.prepare('DELETE FROM feedback WHERE user_uid = ? OR username = ?').bind(userId, user.username).run();
    } catch (_) {}

    // 2) 删除该用户创建的活动
    try {
      await env.db.prepare('DELETE FROM activities WHERE creator_id = ?').bind(userId).run();
    } catch (_) {}

    // 3) 处理参与的活动：从 participants 中移除并回写 joined_people
    try {
      const rows = await env.db.prepare('SELECT id, participants FROM activities WHERE participants IS NOT NULL AND participants != ""').all();
      const list = rows && rows.results ? rows.results : [];
      for (const row of list) {
        let changed = false;
        let parts = [];
        try { parts = JSON.parse(row.participants || '[]'); } catch { parts = []; }
        if (!Array.isArray(parts)) parts = [];
        const filtered = parts.filter(p => String(p && p.userId) !== String(userId));
        if (filtered.length !== parts.length) {
          changed = true;
          await env.db.prepare('UPDATE activities SET participants = ?, joined_people = ? WHERE id = ?')
            .bind(JSON.stringify(filtered), filtered.length, row.id).run();
        }
      }
    } catch (_) {}

    // 4) 删除用户本身
    await env.db.prepare('DELETE FROM users WHERE user_uid = ?').bind(userId).run();

    return json({ code: 0, message: '账户已删除' });
  } catch (e) {
    return json({ code: 500, message: e.message || '删除失败' });
  }
}

function json(obj, init) {
  return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json; charset=utf-8' }, ...(init||{}) });
}
