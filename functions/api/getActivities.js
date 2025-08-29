export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const includeExpired = !!body.includeExpired;
    const requesterId = String(body.requesterId || '').trim();

    // 首次运行兜底：确保必要表存在
    await ensureActivitiesTable(env);
    await ensureUsersTable(env);

    // 先尝试自动标记过期：结束时间+24小时 < 当前时间 的活动标为 expire=1
    const nowMs = Date.now();
    try {
      await env.db.prepare(
        "UPDATE activities SET expire = 1 WHERE IFNULL(expire,0) = 0 AND ((strftime('%s', date || ' ' || COALESCE(end_time, start_time) || ':00') + 86400) * 1000) < ?"
      ).bind(nowMs).run();
    } catch (e) {
      const msg = String(e||'');
      if (/(no such column|has no column named)\s*expire/i.test(msg)) {
        try { await env.db.prepare('ALTER TABLE activities ADD COLUMN expire INTEGER DEFAULT 0').run(); } catch {}
        // retry once
        await env.db.prepare(
          "UPDATE activities SET expire = 1 WHERE IFNULL(expire,0) = 0 AND ((strftime('%s', date || ' ' || COALESCE(end_time, start_time) || ':00') + 86400) * 1000) < ?"
        ).bind(nowMs).run();
      }
    }

    // 构造查询（包含 expire 字段；默认过滤掉过期数据，首页用）
    async function selectWithRegion(filterActiveOnly) {
      const where = filterActiveOnly ? 'WHERE IFNULL(expire,0)=0' : '';
      return await env.db.prepare(
        `SELECT id, name, province, city, area, location, date, start_time AS begin_time, end_time, type, contact, total_people, joined_people, description, creator_name, participants, status, expire, created_at, updated_at FROM activities ${where} ORDER BY created_at DESC LIMIT 100`
      ).all();
    }
    let rs;
    try {
      rs = await selectWithRegion(!includeExpired);
    } catch (e) {
      const msg = String(e||'');
      if (/no such column: (province|city)/i.test(msg)) {
        const where = !includeExpired ? 'WHERE IFNULL(expire,0)=0' : '';
        rs = await env.db.prepare(
          `SELECT id, name, area, location, date, time_slot AS begin_time, end_time, type, contact, total_people, joined_people, description, creator_name, participants, status, expire, created_at, updated_at FROM activities ${where} ORDER BY created_at DESC LIMIT 100`
        ).all();
        rs.results = (rs.results||[]).map(r => ({ province: null, city: null, ...r }));
      } else if (/no such column: start_time/i.test(msg)) {
        const where = !includeExpired ? 'WHERE IFNULL(expire,0)=0' : '';
        rs = await env.db.prepare(
          `SELECT id, name, province, city, area, location, date, time_slot AS begin_time, end_time, type, contact, total_people, joined_people, description, creator_name, participants, status, expire, created_at, updated_at FROM activities ${where} ORDER BY created_at DESC LIMIT 100`
        ).all();
      } else if (/(no such column|has no column named)\s*expire/i.test(msg)) {
        // 自动迁移 expire 列并重试
        await env.db.prepare('ALTER TABLE activities ADD COLUMN expire INTEGER DEFAULT 0').run();
        rs = await selectWithRegion(!includeExpired);
      } else {
        throw e;
      }
    }
    let list = (rs.results || []).map(r => ({ ...r, participants: safeParseJson(r.participants) }));

    return json({ code: 0, data: list });
  } catch (e) {
    return json({ code: 500, message: '服务器错误', error: String(e) });
  }
}
function safeParseJson(s){ try{ return s? JSON.parse(s): []; } catch{ return []; } }
function json(obj, init){ return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }

// ===== Ensure Tables =====
async function ensureActivitiesTable(env){
  try {
    await env.db.prepare(`
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        province TEXT,
        city TEXT,
        area TEXT,
        location TEXT,
        date TEXT,
        start_time TEXT,
        end_time TEXT,
        type TEXT,
        contact TEXT,
        total_people INTEGER,
        joined_people INTEGER,
        description TEXT,
        creator_name TEXT,
        creator_id TEXT,
        participants TEXT,
        status INTEGER,
        expire INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s','now')*1000),
        updated_at INTEGER
      )
    `).run();
  } catch {}
  try { await env.db.prepare('CREATE INDEX IF NOT EXISTS idx_activities_creator ON activities(creator_name)').run(); } catch {}
  try { await env.db.prepare('CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC)').run(); } catch {}
}

async function ensureUsersTable(env){
  try {
    await env.db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nickname TEXT,
        avatar TEXT,
        gender INTEGER DEFAULT 0,
        bio TEXT,
        iphone_num TEXT,
        user_uid TEXT,
        create_time INTEGER DEFAULT (strftime('%s','now')*1000),
        update_time INTEGER,
        last_login_time INTEGER
      )
    `).run();
  } catch {}
  try { await env.db.prepare('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)').run(); } catch {}
  try { await env.db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_uid ON users(user_uid)').run(); } catch {}
}
