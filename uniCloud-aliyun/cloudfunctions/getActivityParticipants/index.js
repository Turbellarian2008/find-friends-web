'use strict';

const db = uniCloud.database();

exports.main = async (event, context) => {
  const { id } = event || {};
  if (!id) {
    return { code: 400, message: '缺少活动ID' };
  }

  try {
    const col = db.collection('activities');
    const dbCmd = db.command;
    const usedId = String(id).trim();

    // 读取活动文档（兼容 id/_id 传入）
    let doc = null;
    let realId = usedId;
    const byDoc = await col.doc(usedId).get();
    if (byDoc.data && byDoc.data[0]) {
      doc = byDoc.data[0];
      realId = String(doc._id || usedId);
    } else {
      const alt = await col.where(dbCmd.or([{ _id: usedId }, { id: usedId }])).limit(1).get();
      if (alt.data && alt.data[0]) {
        doc = alt.data[0];
        realId = String(doc._id || usedId);
      }
    }

    if (!doc) {
      return { code: 404, message: '活动不存在' };
    }

    const participants = Array.isArray(doc.participants) ? doc.participants : [];
    if (!participants.length) {
      return { code: 0, data: [] };
    }

    // 取用户名列表并去重
    const usernames = Array.from(
      new Set(
        participants
          .map(p => (p && p.username ? String(p.username) : ''))
          .filter(Boolean)
      )
    );

    if (!usernames.length) {
      return { code: 0, data: [] };
    }

    // 查用户集合获取昵称
    const usersCol = db.collection('users');
    const usersRes = await usersCol.where({ username: dbCmd.in(usernames) }).field({ username: 1, nickname: 1 }).get();
    const users = (usersRes && usersRes.data) || [];
    const nickMap = new Map(users.map(u => [String(u.username), String(u.nickname || u.username)]));

    // 按活动里的顺序（可依据 joinTime）输出
    const sorted = participants
      .slice()
      .sort((a, b) => (Number(a.joinTime || 0) - Number(b.joinTime || 0)))
      .map(p => ({
        username: String(p.username),
        nickname: nickMap.get(String(p.username)) || String(p.username)
      }));

    return { code: 0, data: sorted };
  } catch (err) {
    console.error('获取参与者失败:', { message: err.message, stack: err.stack, id });
    return { code: -1, message: '获取参与者失败: ' + (err.message || '未知错误') };
  }
};
