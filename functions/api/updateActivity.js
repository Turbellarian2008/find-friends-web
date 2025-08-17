export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const { id, username } = body;
  if (!id) return json({ code: 400, message: '缺少活动ID' });
  if (!username) return json({ code: 401, message: '未登录或用户名缺失' });

  const allow = ['name','area','location','date','timeSlot','endtime','type','contact','totalPeople','description'];
  const payload = {};
  for (const k of allow) if (k in body) payload[k] = body[k];
  if (Object.keys(payload).length === 0) return json({ code: 400, message: '没有可更新的字段' });

  if (typeof payload.name==='string') payload.name = payload.name.trim();
  if (typeof payload.area==='string') payload.area = payload.area.trim();
  if (typeof payload.location==='string') payload.location = payload.location.trim();
  if (typeof payload.contact==='string') payload.contact = payload.contact.trim();
  if (typeof payload.type==='string') payload.type = payload.type.trim();
  if (payload.totalPeople!=null) payload.totalPeople = Number(payload.totalPeople);

  if (!payload.name) return json({ code: 422, message: '活动名称不能为空' });
  if (!payload.area) return json({ code: 422, message: '活动所在区不能为空' });
  if (!payload.location) return json({ code: 422, message: '详细地址不能为空' });
  if (!payload.date) return json({ code: 422, message: '活动日期不能为空' });
  if (!payload.timeSlot) return json({ code: 422, message: '时间段不能为空' });
  if (!payload.endtime) return json({ code: 422, message: '结束时间不能为空' });
  if (!payload.type) return json({ code: 422, message: '活动类型不能为空' });
  if (!/^\d{11}$/.test(String(payload.contact||''))) return json({ code: 422, message: '联系方式需为11位手机号' });
  if (!payload.totalPeople || payload.totalPeople <= 0) return json({ code: 422, message: '活动人数非法' });

  const row = await env.db.prepare('SELECT id, creator_name FROM activities WHERE id = ?').bind(id).first();
  if (!row) return json({ code: 404, message: '活动不存在' });
  if (String(row.creator_name) !== String(username)) return json({ code: 403, message: '无权限编辑该活动（仅创建者可编辑）' });

  const sets = [];
  const vals = [];
  const map = {
    name: 'name', area: 'area', location: 'location', date: 'date', timeSlot: 'time_slot', endtime: 'end_time',
    type: 'type', contact: 'contact', totalPeople: 'total_people', description: 'description'
  };
  for (const [k,v] of Object.entries(payload)) { sets.push(`${map[k]} = ?`); vals.push(v); }
  sets.push('updated_at = ?'); vals.push(Date.now());
  vals.push(id);

  await env.db.prepare(`UPDATE activities SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  return json({ code: 0, message: '更新成功', data: { id, ...payload } });
}
function json(obj, init){ return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
