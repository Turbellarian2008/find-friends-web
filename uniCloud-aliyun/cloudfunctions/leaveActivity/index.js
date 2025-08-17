'use strict';

exports.main = async (event, context) => {
  const db = uniCloud.database();
  const dbCmd = db.command;
  const { id, username } = event || {};

  if (!id) return { code: 400, message: '缺少活动ID' };
  if (!username) return { code: 401, message: '未登录或用户名缺失' };

  try {
    const col = db.collection('activities');
    const usedId = String(id).trim();

    // 精确读取活动
    let getRes = await col.doc(usedId).get();
    if (!getRes.data || !getRes.data[0]) {
      // 兼容历史 id 字段
      const alt = await col.where(dbCmd.or([{ _id: usedId }, { id: usedId }])).limit(1).get();
      if (!alt.data || !alt.data[0]) return { code: 404, message: '活动不存在' };
      getRes = alt;
    }

    const doc = getRes.data[0];
    const list = Array.isArray(doc.participants) ? doc.participants : [];

    const exists = list.some(p => String(p && p.username) === String(username));
    if (!exists) {
      return { code: 411, message: '你未报名该活动' };
    }

    const filtered = list.filter(p => String(p && p.username) !== String(username));
    const nextJoined = Math.max(0, Number(doc.joinedPeople || 0) - 1);

    const realId = String(doc._id || usedId);
    const upd = await col.doc(realId).update({
      joinedPeople: nextJoined,
      participants: filtered,
      updatedAt: Date.now()
    });

    if (!upd.updated) return { code: -1, message: '退出失败，请稍后重试' };
    return { code: 0, message: '退出成功', data: { id: realId, username } };
  } catch (err) {
    console.error('退出活动失败:', { message: err.message, stack: err.stack, event });
    return { code: -1, message: '退出活动失败: ' + (err.message || '未知错误') };
  }
};
