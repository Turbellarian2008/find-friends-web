export async function onRequestPost({ request, env }) {
  try {
    const { id, requesterId } = await request.json();
    if (!id) return json({ code: -1, message: '缺少活动标识参数（需要 id）' });
    // 自动标记过期：结束时间+24小时 < 当前时间 的活动标为 expire=1
    const nowMs = Date.now();
    try {
      await env.db.prepare(
        "UPDATE activities SET expire = 1 WHERE IFNULL(expire,0) = 0 AND ((strftime('%s', date || ' ' || COALESCE(end_time, start_time) || ':00') + 86400) * 1000) < ?"
      ).bind(nowMs).run();
    } catch (e) {
      const msg = String(e||'');
      if (/(no such column|has no column named)\s*expire/i.test(msg)) {
        try { await env.db.prepare('ALTER TABLE activities ADD COLUMN expire INTEGER DEFAULT 0').run(); } catch {}
        await env.db.prepare(
          "UPDATE activities SET expire = 1 WHERE IFNULL(expire,0) = 0 AND ((strftime('%s', date || ' ' || COALESCE(end_time, start_time) || ':00') + 86400) * 1000) < ?"
        ).bind(nowMs).run();
      }
    }
    let row;
    try {
      row = await env.db.prepare('SELECT id, name, province, city, area, location, date, start_time AS begin_time, end_time, type, contact, total_people, joined_people, description, creator_name, creator_id, participants, status, expire, created_at, updated_at FROM activities WHERE id = ?').bind(id).first();
    } catch (e) {
      // Fallback if start_time not present yet
      const msg = String(e||'');
      if (/no such column: start_time/i.test(msg)) {
        row = await env.db.prepare('SELECT id, name, province, city, area, location, date, time_slot AS begin_time, end_time, type, contact, total_people, joined_people, description, creator_name, creator_id, participants, status, expire, created_at, updated_at FROM activities WHERE id = ?').bind(id).first();
      } else if (/(no such column|has no column named)\s*expire/i.test(msg)) {
        // migrate expire and retry once
        try { await env.db.prepare('ALTER TABLE activities ADD COLUMN expire INTEGER DEFAULT 0').run(); } catch {}
        row = await env.db.prepare('SELECT id, name, province, city, area, location, date, start_time AS begin_time, end_time, type, contact, total_people, joined_people, description, creator_name, creator_id, participants, status, expire, created_at, updated_at FROM activities WHERE id = ?').bind(id).first();
      } else {
        throw e;
      }
    }
    if (!row) return json({ code: -1, message: '活动不存在或已被删除', requestedId: id });
    row.participants = safeParseJson(row.participants);
    return json({ code: 0, data: row });
  } catch (e) {
    return json({ code: -1, message: '获取详情失败: ' + String(e) });
  }
}
function safeParseJson(s){ try{ return s? JSON.parse(s): []; } catch{ return []; } }
function json(obj, init){ return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
