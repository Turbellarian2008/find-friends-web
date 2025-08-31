export async function onRequestPost({ request, env }) {
  try {
    if (!env || !env.db) return json({ code: 500, message: '数据库未绑定：检查 wrangler.toml 的 d1_databases 绑定名是否为 db' });
    const body = await request.json().catch(() => ({}));
    const username = String((body.username || '')).trim();
    const password = String(body.password || '');
    const agreePrivacy = !!body.agreePrivacy;
    const policyVersion = body.policyVersion || '';
    const iphone_num = body.iphone_num ? String(body.iphone_num).trim() : '';

    if (!username || !password) return json({ code: 400, message: '用户名和密码不能为空' });
    if (!agreePrivacy) return json({ code: 400, message: '请勾选并同意隐私政策' });
    if (username.length < 3 || username.length > 20) return json({ code: 400, message: '用户名长度需在3-20个字符之间' });
    if (password.length < 6 || password.length > 20) return json({ code: 400, message: '密码长度需在6-20个字符之间' });
    if (iphone_num && !/^\d{11}$/.test(iphone_num)) return json({ code: 400, message: '手机号需为11位数字' });

    // 已移除：用户名违禁词校验

    const dup = await env.db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (dup) return json({ code: 409, message: '用户名重复' });

    const now = Date.now();
    // 确保 user_uid 列存在并创建唯一索引
    try { await env.db.prepare('ALTER TABLE users ADD COLUMN user_uid TEXT').run(); } catch(_) {}
    try { await env.db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_uid ON users(user_uid)').run(); } catch(_) {}

    // 生成唯一 7 位ID（数字），且首位不为 0
    async function genUniqueId() {
      for (let i = 0; i < 20; i++) {
        // 首位 1-9，后六位 0-9
        const first = String((crypto.getRandomValues(new Uint32Array(1))[0] % 9) + 1);
        const rest = [...crypto.getRandomValues(new Uint32Array(2))]
          .map(n => String(n % 1000000000).padStart(9,'0')).join('')
          .slice(0,6);
        const id = first + rest; // 长度7，首位非0
        const exists = await env.db.prepare('SELECT 1 FROM users WHERE user_uid = ?').bind(id).first();
        if (!exists) return id;
      }
      // 兜底：基于时间戳构造，确保首位不为 0
      const tail = String(Date.now()).slice(-6);
      const first = String(((Date.now() % 9) + 1));
      return first + tail;
    }
    const userUid = await genUniqueId();
    // 生成加盐哈希（PBKDF2-SHA256）
    const hashed = await hashPassword(password);
    // 确保 iphone_num 列存在（如果不存在则尝试添加）
    try {
      await env.db.prepare('ALTER TABLE users ADD COLUMN iphone_num TEXT').run();
    } catch (_) { /* 已存在时忽略 */ }

    // 优先插入 iphone_num 和 user_uid，如果表尚未有该列则回退
    let ins;
    try {
      ins = await env.db.prepare(
        'INSERT INTO users (username, password, nickname, avatar, gender, bio, iphone_num, user_uid, create_time, update_time, last_login_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(username, hashed, username, '', 0, '', iphone_num, userUid, now, now, 0).run();
    } catch (e) {
      // 兼容旧表结构（无 iphone_num 列）
      ins = await env.db.prepare(
        'INSERT INTO users (username, password, nickname, avatar, gender, bio, user_uid, create_time, update_time, last_login_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(username, hashed, username, '', 0, '', userUid, now, now, 0).run();
    }

    return json({ code: 0, message: '注册成功', data: { userId: userUid, username, policyVersion } });
  } catch (e) {
    console.error('userRegister error:', e);
    return json({ code: 500, message: '注册失败，请稍后重试', error: String(e) });
  }
}

function json(obj, init) {
  return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) });
}

// ===== PBKDF2-SHA256 加盐哈希实现 =====
async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, keyMaterial, 256);
  const saltB64 = toBase64Url(salt);
  const hashB64 = toBase64Url(new Uint8Array(derived));
  // 存储格式：pbkdf2_sha256$<iterations>$<salt_b64url>$<hash_b64url>
  return `pbkdf2_sha256$${iterations}$${saltB64}$${hashB64}`;
}

function toBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}
