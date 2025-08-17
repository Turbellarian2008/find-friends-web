export async function onRequestPost({ request, env }) {
  const { username, nickname, bio, gender } = await request.json().catch(() => ({}));
  const hasNickname = typeof nickname !== 'undefined';
  const hasBio = typeof bio !== 'undefined';
  const hasGender = typeof gender !== 'undefined';
  if (!username || (!hasNickname && !hasBio && !hasGender)) return json({ code: 400, message: '缺少必要参数：username 或需要更新的字段（nickname/bio/gender）' });

  const user = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(String(username)).first();
  if (!user) return json({ code: 404, message: '用户不存在' });

  const sets = ['update_time = ?'];
  const vals = [Date.now()];
  if (hasNickname) { sets.push('nickname = ?'); vals.push(String(nickname).trim()); }
  if (hasBio) { sets.push('bio = ?'); vals.push(String(bio)); }
  if (hasGender) { let g = parseInt(gender,10); if (![0,1,2].includes(g)||isNaN(g)) g=0; sets.push('gender = ?'); vals.push(g); }
  vals.push(user.id);

  await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();

  const updated = await env.DB.prepare('SELECT id, username, nickname, bio, gender, avatar FROM users WHERE id = ?').bind(user.id).first();
  return json({ code: 0, message: '更新成功', data: updated });
}
function json(obj, init) { return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
