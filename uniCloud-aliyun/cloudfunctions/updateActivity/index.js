'use strict';

exports.main = async (event, context) => {
  const db = uniCloud.database();
  const { id, username } = event || {};

  if (!id) {
    return { code: 400, message: '缺少活动ID' };
  }
  if (!username) {
    return { code: 401, message: '未登录或用户名缺失' };
  }

  // 可更新字段白名单（已移除 street）
  const allow = ['name', 'area', 'location', 'date', 'timeSlot', 'endtime', 'type', 'contact', 'totalPeople', 'description'];
  const payload = {};
  allow.forEach(k => {
    if (Object.prototype.hasOwnProperty.call(event, k)) payload[k] = event[k];
  });
  if (Object.keys(payload).length === 0) {
    return { code: 400, message: '没有可更新的字段' };
  }

  // 基础格式处理
  if (typeof payload.name === 'string') payload.name = payload.name.trim();
  if (typeof payload.area === 'string') payload.area = payload.area.trim();
  if (typeof payload.location === 'string') payload.location = payload.location.trim();
  if (typeof payload.contact === 'string') payload.contact = payload.contact.trim();
  if (typeof payload.type === 'string') payload.type = payload.type.trim();
  if (payload.totalPeople != null) payload.totalPeople = Number(payload.totalPeople);

  // 简单校验
  if (!payload.name) return { code: 422, message: '活动名称不能为空' };
  // area/location 均为必填（不再要求 street）
  if (!payload.area) return { code: 422, message: '活动所在区不能为空' };
  if (!payload.location) return { code: 422, message: '详细地址不能为空' };
  if (!payload.date) return { code: 422, message: '活动日期不能为空' };
  if (!payload.timeSlot) return { code: 422, message: '时间段不能为空' };
  if (!payload.endtime) return { code: 422, message: '结束时间不能为空' };
  if (!payload.type) return { code: 422, message: '活动类型不能为空' };
  if (!/^\d{11}$/.test(String(payload.contact || ''))) return { code: 422, message: '联系方式需为11位手机号' };
  if (!payload.totalPeople || payload.totalPeople <= 0) return { code: 422, message: '活动人数非法' };

  // 结束时间需晚于开始时间（格式：HH:mm）
  const toMin = (t) => {
    const [h, m] = String(t || '00:00').split(':');
    return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
  };
  if (toMin(payload.endtime) <= toMin(payload.timeSlot)) {
    return { code: 422, message: '结束时间需晚于开始时间' };
  }

  try {
    const col = db.collection('activities');

    // 读取活动并校验归属
    const getRes = await col.doc(id).get();
    if (!getRes.data || !getRes.data[0]) {
      return { code: 404, message: '活动不存在' };
    }
    const doc = getRes.data[0];
    const creatorName = doc.creatorName || doc.creator || '';
    if (String(creatorName) !== String(username)) {
      return { code: 403, message: '无权限编辑该活动（仅创建者可编辑）' };
    }

    payload.updatedAt = Date.now();

    // 更新
    await col.doc(id).update(payload);

    return { code: 0, message: '更新成功', data: { id, ...payload } };
  } catch (err) {
    console.error('更新活动失败:', err);
    return { code: -1, message: '更新失败: ' + (err.message || '未知错误') };
  }
};
