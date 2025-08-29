export async function onRequestPost({ request, env }) {
  try {
    if (!env || !env.db) {
      return json({ code: 500, message: '数据库未绑定：请检查 wrangler.toml 的 d1_databases 绑定名是否为 db' });
    }
    const body = await request.json().catch(() => ({}));
    const username = String((body.username || '')).trim();
    const password = String(body.password || '');
    if (!username || !password) return json({ code: 400, message: '缺少用户名或密码' });

    // 确保 users 表存在（首次运行或老环境缺表时自动创建）
    await ensureUsersTable(env);

    // ensure user_uid column exists (best-effort)
    try { await env.db.prepare('ALTER TABLE users ADD COLUMN user_uid TEXT').run(); } catch {}
    const row = await env.db
      .prepare('SELECT id, username, password, COALESCE(user_uid, CAST(id AS TEXT)) AS user_uid FROM users WHERE username = ?')
      .bind(username)
      .first();

    if (!row) {
      return json({ code: 401, message: '用户名或密码错误' });
    }

    const stored = String(row.password || '');
    const ok = await verifyPassword(password, stored);

    if (!ok) {
      return json({ code: 401, message: '用户名或密码错误' });
    }

    // 更新最近登录时间（忽略错误）
    env.db.prepare('UPDATE users SET last_login_time = ? WHERE id = ?').bind(Date.now(), row.id).run().catch(()=>{});
    // 若为明文旧格式，登录成功后进行透明迁移为 PBKDF2
    if (!stored.startsWith('pbkdf2_sha256$')) {
      try {
        const hashed = await hashPassword(password);
        await env.db.prepare('UPDATE users SET password = ?, update_time = ? WHERE id = ?').bind(hashed, Date.now(), row.id).run();
      } catch (_) {}
    }

    const token = `t_${row.user_uid}_${Date.now()}`;
    return json({ code: 0, data: { token, userId: row.user_uid, username: row.username } });
  } catch (e) {
    console.error('userLogin error:', e);
    return json({ code: 500, message: '服务器错误', error: String(e) });
  }
}
function json(obj, init) { return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }

// 创建 users 表与必要索引（若不存在）
async function ensureUsersTable(env) {
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

// ===== PBKDF2-SHA256 验证/哈希 =====
async function verifyPassword(plain, stored) {
  // 预期格式：pbkdf2_sha256$<iterations>$<salt_b64url>$<hash_b64url>
  const parts = stored.split('$');
  // 向后兼容：若不是 PBKDF2 存储格式，则按明文直接比较
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') {
    return plain === stored;
  }
  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const salt = fromBase64Url(parts[2]);
  const target = fromBase64Url(parts[3]);
  if (!salt || !target) return false;

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(plain), { name: 'PBKDF2' }, false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, keyMaterial, target.length * 8);
  const derivedBytes = new Uint8Array(derived);
  return timingSafeEqual(derivedBytes, target);
}

function fromBase64Url(s) {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 2 ? '==' : b64.length % 4 === 3 ? '=' : '';
    const bin = atob(b64 + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch { return null; }
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ^ b[i]);
  return diff === 0;
}

async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, keyMaterial, 256);
  const saltB64 = toBase64Url(salt);
  const hashB64 = toBase64Url(new Uint8Array(derived));
  return `pbkdf2_sha256$${iterations}$${saltB64}$${hashB64}`;
}

