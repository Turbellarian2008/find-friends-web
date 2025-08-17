'use strict';

exports.main = async (event, context) => {
  const db = uniCloud.database();
  const { id, username, avatar } = event || {};
  const dbCmd = db.command;

  if (!id) {
    return { code: 400, message: '缺少活动ID' };
  }
  if (!username) {
    return { code: 401, message: '未登录或用户名缺失' };
  }

  try {
    const usedId = String(id).trim();
    const col = db.collection('activities');

    // 获取活动
    const getRes = await col.doc(usedId).get();
    if (!getRes.data || !getRes.data[0]) {
      // 兼容历史 id 字段
      const alt = await col.where(dbCmd.or([{ _id: usedId }, { id: usedId }])).limit(1).get();
      if (!alt.data || !alt.data[0]) {
        return { code: 404, message: '活动不存在' };
      }
      // 用命中的真实 _id
      const realId = String(alt.data[0]._id || usedId);
      return await doUpdate(col, dbCmd, realId, username, avatar);
    }
    const realId = String(getRes.data[0]._id || usedId);
    return await doUpdate(col, dbCmd, realId, username, avatar);
  } catch (err) {
    console.error('加入活动失败:', {
      message: err.message,
      stack: err.stack,
      request: { id, username }
    });
    return { code: -1, message: '加入活动失败: ' + (err.message || '未知错误') };
  }
};

// 非事务原子更新（尽量简单稳妥）
async function doUpdate(col, dbCmd, realId, username, avatar) {
  // 读一次
  const res = await col.doc(realId).get();
  if (!res.data || !res.data[0]) return { code: 404, message: '活动不存在' };
  const doc = res.data[0];

  const totalPeople = Number(doc.totalPeople || 0);
  const joinedPeople = Number(doc.joinedPeople || 0);
  const participants = Array.isArray(doc.participants) ? doc.participants : [];

  if (joinedPeople >= totalPeople) {
    return { code: 409, message: '该活动名额已满' };
  }
  const exists = participants.some(p => String(p.username) === String(username));
  if (exists) {
    return { code: 410, message: '你已报名该活动，请勿重复报名' };
  }

  const upd = await col.doc(realId).update({
    joinedPeople: dbCmd.inc(1),
    participants: dbCmd.push({
      userId: null,
      username: String(username),
      avatar: avatar || '',
      joinTime: Date.now()
    }),
    updatedAt: Date.now()
  });
  if (!upd.updated) return { code: -1, message: '报名失败，请稍后重试' };
  return { code: 0, message: '报名成功', data: { id: realId, username } };
}
