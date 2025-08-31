export async function onRequestPost({ request, env }) {
  const { userId, username, nickname, bio, gender, iphone_num } = await request.json().catch(() => ({}));
  const hasNickname = typeof nickname !== 'undefined';
  const hasBio = typeof bio !== 'undefined';
  const hasGender = typeof gender !== 'undefined';
  const hasPhone = typeof iphone_num !== 'undefined';
  if ((!userId && !username) || (!hasNickname && !hasBio && !hasGender && !hasPhone)) return json({ code: 400, message: '缺少必要参数：userId/username 或需要更新的字段（nickname/bio/gender/iphone_num）' });

  if (hasPhone) {
    const p = String(iphone_num || '').trim();
    if (p && !/^\d{11}$/.test(p)) return json({ code: 400, message: '手机号需为11位数字' });
  }

  let user;
  if (userId) {
    try { await env.db.prepare('ALTER TABLE users ADD COLUMN user_uid TEXT').run(); } catch {}
    user = await env.db.prepare('SELECT id FROM users WHERE user_uid = ?').bind(String(userId)).first();
  }
  if (!user && username) {
    user = await env.db.prepare('SELECT id FROM users WHERE username = ?').bind(String(username)).first();
  }
  if (!user) return json({ code: 404, message: '用户不存在' });

  // 违禁词后端校验
  async function hasSensitive(text){
    if (!text) return false;
    try {
      const raw = env && env.SENSITIVE_LEXICON && await env.SENSITIVE_LEXICON.get('all.json');
      const list = raw ? JSON.parse(raw) : [];
      const s = String(text).toLowerCase();
      for (const w of Array.isArray(list)?list:[]) {
        const ww = String(w||'').toLowerCase();
        if (ww && s.includes(ww)) return true;
      }
    } catch(_){}
    return false;
  }
  if (hasNickname && await hasSensitive(nickname)) return json({ code: 422, message: '昵称包含违禁词，请修改后再提交' });
  if (hasBio && await hasSensitive(bio)) return json({ code: 422, message: '个人简介包含违禁词，请修改后再提交' });

  // 确保 iphone_num 列存在
  if (hasPhone) {
    try { await env.db.prepare('ALTER TABLE users ADD COLUMN iphone_num TEXT').run(); } catch(_) {}
  }

  const sets = ['update_time = ?'];
  const vals = [Date.now()];
  if (hasNickname) { sets.push('nickname = ?'); vals.push(String(nickname).trim()); }
  if (hasBio) { sets.push('bio = ?'); vals.push(String(bio)); }
  if (hasGender) { let g = parseInt(gender,10); if (![0,1,2].includes(g)||isNaN(g)) g=0; sets.push('gender = ?'); vals.push(g); }
  if (hasPhone) { sets.push('iphone_num = ?'); vals.push(String(iphone_num || '').trim()); }
  vals.push(user.id);

  await env.db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();

  const updated = await env.db.prepare('SELECT id, username, nickname, bio, gender, avatar, iphone_num FROM users WHERE id = ?').bind(user.id).first();
  return json({ code: 0, message: '更新成功', data: updated });
}
function json(obj, init) { return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
