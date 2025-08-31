export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const { id, userId } = body;
  if (!id) return json({ code: 400, message: '缺少活动ID' });
  if (!userId) return json({ code: 401, message: '未登录或用户ID缺失' });

  const allow = ['name','area','location','date','begin_time','endtime','type','contact','totalPeople','description'];
  const payload = {};
  for (const k of allow) if (k in body) payload[k] = body[k];
  if (Object.keys(payload).length === 0) return json({ code: 400, message: '没有可更新的字段' });

  if (typeof payload.name==='string') payload.name = payload.name.trim();
  if (typeof payload.area==='string') payload.area = payload.area.trim();
  if (typeof payload.location==='string') payload.location = payload.location.trim();
  if (typeof payload.contact==='string') payload.contact = payload.contact.trim();
  if (typeof payload.type==='string') payload.type = payload.type.trim();
  if (payload.totalPeople!=null) payload.totalPeople = Number(payload.totalPeople);

  if (!payload.name) return json({ code: 422, message: '活动名称不能为空' });
  if (!payload.area) return json({ code: 422, message: '活动所在区不能为空' });
  if (!payload.location) return json({ code: 422, message: '详细地址不能为空' });
  if (!payload.date) return json({ code: 422, message: '活动日期不能为空' });
  if (!payload.begin_time) return json({ code: 422, message: '开始时间不能为空' });
  if (!payload.endtime) return json({ code: 422, message: '结束时间不能为空' });
  if (!payload.type) return json({ code: 422, message: '活动类型不能为空' });
  if (!/^\d{11}$/.test(String(payload.contact||''))) return json({ code: 422, message: '联系方式需为11位手机号' });
  if (!payload.totalPeople || payload.totalPeople <= 0) return json({ code: 422, message: '活动人数非法' });

  // 违禁词后端校验（仅对传入字段检查）
  async function hasSensitive(text){
    if (!text) return false;
    try {
      const raw = env && env.SENSITIVE_LEXICON && await env.SENSITIVE_LEXICON.get('all.json');
      const list = raw ? JSON.parse(raw) : [];
      const s = String(text).toLowerCase();
      for (const w of Array.isArray(list)?list:[]) {
        const ww = String(w||'').toLowerCase();
        if (ww && s.includes(ww)) return true;
      }
    } catch(_){}
    return false;
  }
  const pairs = [
    ['活动名称', payload.name],
    ['详细地址', payload.location],
    ['活动类型', payload.type],
    ['联系方式', payload.contact],
    ['详细说明', payload.description]
  ];
  for (const [label, val] of pairs) {
    if (typeof val !== 'undefined' && await hasSensitive(val)) {
      return json({ code: 422, message: `${label}包含违禁词，请修改后再提交` });
    }
  }

  const row = await env.db.prepare('SELECT id, creator_id FROM activities WHERE id = ?').bind(id).first();
  if (!row) return json({ code: 404, message: '活动不存在' });
  const isOwner = String(row.creator_id||'') === String(userId);
  if (!isOwner) return json({ code: 403, message: '无权限编辑该活动（仅创建者可编辑）' });

  const sets = [];
  const vals = [];
  const map = {
    name: 'name', area: 'area', location: 'location', date: 'date', begin_time: 'start_time', endtime: 'end_time',
    type: 'type', contact: 'contact', totalPeople: 'total_people', description: 'description'
  };
  for (const [k,v] of Object.entries(payload)) { sets.push(`${map[k]} = ?`); vals.push(v); }
  sets.push('updated_at = ?'); vals.push(Date.now());
  vals.push(id);

  await env.db.prepare(`UPDATE activities SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  return json({ code: 0, message: '更新成功', data: { id, ...payload } });
}
function json(obj, init){ return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, ...(init||{}) }); }
