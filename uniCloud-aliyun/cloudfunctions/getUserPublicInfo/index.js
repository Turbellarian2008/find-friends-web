'use strict';

const db = uniCloud.database();

exports.main = async (event, context) => {
  const { username } = event || {};
  if (!username) {
    return { code: 400, message: '缺少用户名' };
  }
  try {
    const col = db.collection('users');
    const res = await col.where({ username: String(username) }).field({ username: 1, nickname: 1, gender: 1, bio: 1 }).limit(1).get();
    const doc = res && res.data && res.data[0];
    if (!doc) return { code: 404, message: '用户不存在' };
    return { code: 0, data: { username: doc.username, nickname: doc.nickname || doc.username, gender: doc.gender || 0, bio: doc.bio || '' } };
  } catch (err) {
    console.error('获取用户公开信息失败:', { message: err.message, stack: err.stack, username });
    return { code: -1, message: '获取用户信息失败: ' + (err.message || '未知错误') };
  }
};
