export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const required = ['name','province','city','area','location','date','begin_time','endtime','type'];
  for (const k of required) if (!body[k]) return json({ code: 400, message: `缺少必填字段：${k}` });
  const toMin = t => { const [h,m] = String(t).split(':'); return (parseInt(h)||0)*60+(parseInt(m)||0); };
  const begin = body.begin_time || body.timeSlot; // fallback 兼容
  if (toMin(body.endtime) <= toMin(begin)) return json({ code: 400, message: '结束时间需晚于开始时间' });

  const now = Date.now();
  const creatorId = String(body.creatorId || '').trim();
  if (!creatorId) return json({ code: 401, message: '缺少创建者ID（creatorId）' });
  // resolve creator_name by user_uid
  try { await env.db.prepare('ALTER TABLE activities ADD COLUMN creator_id TEXT').run(); } catch {}
  const urow = await env.db.prepare('SELECT username FROM users WHERE user_uid = ?').bind(creatorId).first();
  const creatorName = (urow && urow.username) || '未知用户';
  const participants = [{ userId: creatorId, username: creatorName, avatar: '', joinTime: now }];
  async function doInsert() {
    return await env.db.prepare(`
      INSERT INTO activities (name, province, city, area, location, date, start_time, end_time, type, contact, description, total_people, joined_people, creator_name, creator_id, participants, status, expire, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      String(body.name).trim(), String(body.province).trim(), String(body.city).trim(), String(body.area).trim(), String(body.location).trim(), String(body.date), String(begin), String(body.endtime), String(body.type),
      body.contact ? String(body.contact).trim() : '未提供联系方式',
      body.description ? String(body.description).trim() : '暂无详细说明',
      Number(body.totalPeople)||10, 1,
      creatorName, creatorId,
      JSON.stringify(participants), 1, 0,
      now, now
    ).run();
  }
  let res;
  try {
    res = await doInsert();
  } catch (e) {
    const msg = String(e||'');
    if (/(no such column|has no column named)\s*(province|city|start_time|expire|creator_id)/i.test(msg)) {
      if (/creator_id/i.test(msg)) {
        try { await env.db.prepare('ALTER TABLE activities ADD COLUMN creator_id TEXT').run(); } catch {}
      }
      // 逐步迁移缺失列
      try { await env.db.prepare('ALTER TABLE activities ADD COLUMN province TEXT').run(); } catch {}
      try { await env.db.prepare('ALTER TABLE activities ADD COLUMN city TEXT').run(); } catch {}
      try { await env.db.prepare('ALTER TABLE activities ADD COLUMN start_time TEXT').run(); } catch {}
      try { await env.db.prepare('ALTER TABLE activities ADD COLUMN expire INTEGER DEFAULT 0').run(); } catch {}
      res = await doInsert();
    } else {
      throw e;
    }
  }

  return json({ code: 0, message: '活动创建成功', data: { id: res.lastRowId } });
}
function json(obj, init){ return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
