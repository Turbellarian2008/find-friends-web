export async function onRequestPost({ request, env }) {
  const { username, content } = await request.json().catch(() => ({}));
  if (!username) return json({ code: 401, message: '未登录或用户名缺失' });
  if (!content || String(content).trim().length < 10) return json({ code: 400, message: '反馈内容至少10个字' });

  const now = Date.now();
  const res = await env.DB.prepare('INSERT INTO feedback (username, content, status, created_at) VALUES (?, ?, ?, ?)')
    .bind(String(username), String(content).trim(), 'new', now).run();
  return json({ code: 0, message: '提交成功', data: { id: res.lastRowId } });
}
function json(obj, init) { return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
