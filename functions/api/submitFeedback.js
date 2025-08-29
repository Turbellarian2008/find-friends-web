export async function onRequestPost({ request, env }) {
  const { userId, username, content } = await request.json().catch(() => ({}));
  if (!userId && !username) return json({ code: 401, message: '未登录或缺少用户标识（userId/username）' });
  if (!content || String(content).trim().length < 10) return json({ code: 400, message: '反馈内容至少10个字' });

  const now = Date.now();
  // 运行时迁移：为反馈表添加 user_uid 列（如果不存在）
  try { await env.db.prepare('ALTER TABLE feedback ADD COLUMN user_uid TEXT').run(); } catch(_) {}

  let sql = 'INSERT INTO feedback (content, status, created_at';
  const vals = [String(content).trim(), 'new', now];
  let placeholders = '?, ?, ?';
  if (typeof userId !== 'undefined') { sql += ', user_uid'; placeholders += ', ?'; vals.push(String(userId)); }
  if (typeof username !== 'undefined') { sql += ', username'; placeholders += ', ?'; vals.push(String(username)); }
  sql += `) VALUES (${placeholders})`;

  const res = await env.db.prepare(sql).bind(...vals).run();
  return json({ code: 0, message: '提交成功', data: { id: res.lastRowId } });
}
function json(obj, init) { return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
