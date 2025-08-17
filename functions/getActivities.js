export async function onRequestPost({ request, env }) {
  try {
    // 可读取筛选条件：暂不做过滤
    const rs = await env.DB.prepare(
      'SELECT id, name, area, location, date, time_slot, end_time, type, contact, total_people, joined_people, description, creator_name, participants, status, created_at, updated_at FROM activities ORDER BY created_at DESC LIMIT 100'
    ).all();
    const list = (rs.results || []).map(r => ({
      ...r,
      participants: safeParseJson(r.participants)
    }));
    return new Response(
      JSON.stringify({ code: 0, data: list }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ code: 500, message: '服务器错误', error: String(e) }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function safeParseJson(s) {
  try { return s ? JSON.parse(s) : []; } catch { return []; }
}
