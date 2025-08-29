export async function onRequestPost({ request, env }) {
  try {
    const { creatorId, page = 1, pageSize = 10 } = await request.json();
    if (!creatorId) return json({ code: 400, message: '缺少创建者ID' });
    const offset = (page - 1) * pageSize;

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

    let list;
    try {
      list = await env.db.prepare(
        'SELECT id, name, province, city, area, location, date, start_time AS begin_time, end_time, type, contact, total_people, joined_people, description, creator_name, creator_id, participants, status, expire, created_at, updated_at FROM activities WHERE creator_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      ).bind(String(creatorId), pageSize, offset).all();
    } catch (e) {
      const msg = String(e||'');
      if (/(no such column|has no column named)\s*creator_id/i.test(msg)) {
        try { await env.db.prepare('ALTER TABLE activities ADD COLUMN creator_id TEXT').run(); } catch {}
        list = await env.db.prepare(
          'SELECT id, name, province, city, area, location, date, start_time AS begin_time, end_time, type, contact, total_people, joined_people, description, creator_name, creator_id, participants, status, expire, created_at, updated_at FROM activities WHERE creator_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
        ).bind(String(creatorId), pageSize, offset).all();
      } else if (/no such column: start_time/i.test(msg)) {
        list = await env.db.prepare(
          'SELECT id, name, province, city, area, location, date, time_slot AS begin_time, end_time, type, contact, total_people, joined_people, description, creator_name, creator_id, participants, status, expire, created_at, updated_at FROM activities WHERE creator_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
        ).bind(String(creatorId), pageSize, offset).all();
      } else {
        throw e;
      }
    }

    let countRow;
    try {
      countRow = await env.db.prepare('SELECT COUNT(1) as c FROM activities WHERE creator_id = ?')
        .bind(String(creatorId))
        .first();
    } catch (e) {
      const msg = String(e||'');
      if (/(no such column|has no column named)\s*creator_id/i.test(msg)) {
        try { await env.db.prepare('ALTER TABLE activities ADD COLUMN creator_id TEXT').run(); } catch {}
        countRow = await env.db.prepare('SELECT COUNT(1) as c FROM activities WHERE creator_id = ?')
          .bind(String(creatorId))
          .first();
      } else {
        throw e;
      }
    }

    const results = (list.results || []).map(r => ({ ...r, participants: safeParseJson(r.participants) }));
    const total = (countRow && (countRow.c || countRow.C)) || 0;

    return json({ code: 0, data: { list: results, total, page, pageSize, hasMore: offset + results.length < total } });
  } catch (e) {
    return json({ code: 500, message: '获取活动列表失败，请稍后重试', error: String(e) });
  }
}
function safeParseJson(s){ try{ return s? JSON.parse(s): []; } catch{ return []; } }
function json(obj, init){ return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
