export async function onRequestPost({ request, env }) {
  const { username, newPassword } = await request.json().catch(() => ({}));
  if (!username || !newPassword) return json({ code: 400, message: '参数不完整' });
  if (String(newPassword).length < 6 || String(newPassword).length > 20) return json({ code: 400, message: '新密码长度需在6-20个字符之间' });

  const user = await env.DB.prepare('SELECT id, password_hash FROM users WHERE username = ?').bind(String(username).trim()).first();
  if (!user) return json({ code: 404, message: '用户不存在' });

  const newHash = String(newPassword); // TODO: hash later
  if (newHash === user.password_hash) return json({ code: 400, message: '新密码不能与原密码相同' });

  await env.DB.prepare('UPDATE users SET password_hash = ?, update_time = ? WHERE id = ?').bind(newHash, Date.now(), user.id).run();
  return json({ code: 0, message: '密码修改成功' });
}
function json(obj, init) { return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
