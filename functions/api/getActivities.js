export async function onRequestPost({ request, env }) {
  try {
    const rs = await env.db.prepare(
      'SELECT id, name, area, location, date, time_slot, end_time, type, contact, total_people, joined_people, description, creator_name, participants, status, created_at, updated_at FROM activities ORDER BY created_at DESC LIMIT 100'
    ).all();
    const list = (rs.results || []).map(r => ({
      ...r,
      participants: safeParseJson(r.participants)
    }));
    return json({ code: 0, data: list });
  } catch (e) {
    return json({ code: 500, message: '服务器错误', error: String(e) });
  }
}
function safeParseJson(s){ try{ return s? JSON.parse(s): []; } catch{ return []; } }
function json(obj, init){ return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
