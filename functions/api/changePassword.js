export async function onRequestPost({ request, env }) {
  try {
    const { username, newPassword } = await request.json().catch(() => ({}));
    if (!username || !newPassword) return json({ code: 400, message: '参数不完整' });
    if (String(newPassword).length < 6 || String(newPassword).length > 20) return json({ code: 400, message: '新密码长度需在6-20个字符之间' });

    const user = await env.db.prepare('SELECT id, password FROM users WHERE username = ?').bind(String(username).trim()).first();
    if (!user) return json({ code: 404, message: '用户不存在' });

    // 若新密码与旧密码相同则拒绝（使用相同的验证逻辑）
    const same = await verifyPassword(newPassword, String(user.password || ''));
    if (same) return json({ code: 400, message: '新密码不能与原密码相同' });

    const hashed = await hashPassword(newPassword);
    await env.db.prepare('UPDATE users SET password = ?, update_time = ? WHERE id = ?').bind(hashed, Date.now(), user.id).run();
    return json({ code: 0, message: '密码修改成功' });
  } catch (e) {
    console.error('changePassword error:', e);
    return json({ code: 500, message: '修改失败，请稍后重试' });
  }
}
function json(obj, init) { return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }

// ===== 与注册/登录保持一致的 PBKDF2-SHA256 实现 =====
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

async function verifyPassword(plain, stored) {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false;
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

function toBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
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
