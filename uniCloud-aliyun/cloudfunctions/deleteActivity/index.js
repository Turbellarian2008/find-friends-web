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

  try {
    const col = db.collection('activities');

    // 读取活动
    const getRes = await col.doc(id).get();
    if (!getRes.data || !getRes.data[0]) {
      return { code: 404, message: '活动不存在' };
    }
    const doc = getRes.data[0];
    const creatorName = doc.creatorName || doc.creator || '';

    if (String(creatorName) !== String(username)) {
      return { code: 403, message: '无权限删除该活动（仅创建者可删除）' };
    }

    // 删除
    await col.doc(id).remove();

    return { code: 0, message: '删除成功', data: { id } };
  } catch (err) {
    console.error('删除活动失败:', err);
    return { code: -1, message: '删除失败: ' + (err.message || '未知错误') };
  }
};
