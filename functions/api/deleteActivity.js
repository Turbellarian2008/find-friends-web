export async function onRequestPost({ request, env }) {
  const { id, userId } = await request.json().catch(() => ({}));
  if (!id) return json({ code: 400, message: '缺少活动ID' });
  if (!userId) return json({ code: 401, message: '未登录或用户ID缺失' });

  const row = await env.db.prepare('SELECT id, creator_id FROM activities WHERE id = ?').bind(id).first();
  if (!row) return json({ code: 404, message: '活动不存在' });
  const isOwner = String(row.creator_id||'') === String(userId);
  if (!isOwner) return json({ code: 403, message: '无权限删除该活动（仅创建者可删除）' });

  await env.db.prepare('DELETE FROM activities WHERE id = ?').bind(id).run();
  return json({ code: 0, message: '删除成功', data: { id } });
}
function json(obj, init){ return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }

