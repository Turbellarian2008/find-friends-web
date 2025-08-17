export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const required = ['name','area','location','date','timeSlot','endtime','type'];
  for (const k of required) if (!body[k]) return json({ code: 400, message: `缺少必填字段：${k}` });
  const toMin = t => { const [h,m] = String(t).split(':'); return (parseInt(h)||0)*60+(parseInt(m)||0); };
  if (toMin(body.endtime) <= toMin(body.timeSlot)) return json({ code: 400, message: '结束时间需晚于开始时间' });

  const now = Date.now();
  const participants = [{ userId: null, username: String(body.creator||'未知用户'), avatar: '', joinTime: now }];
  const res = await env.db.prepare(`
    INSERT INTO activities (name, area, location, date, time_slot, end_time, type, contact, description, total_people, joined_people, creator_name, creator_id, participants, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    String(body.name).trim(), String(body.area).trim(), String(body.location).trim(), String(body.date), String(body.timeSlot), String(body.endtime), String(body.type),
    body.contact ? String(body.contact).trim() : '未提供联系方式',
    body.description ? String(body.description).trim() : '暂无详细说明',
    Number(body.totalPeople)||10, 1,
    String(body.creator||'未知用户'), null,
    JSON.stringify(participants), 1,
    now, now
  ).run();

  return json({ code: 0, message: '活动创建成功', data: { id: res.lastRowId } });
}
function json(obj, init){ return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
