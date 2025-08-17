'use strict';
const db = uniCloud.database();
const activitiesCollection = db.collection('activities');

exports.main = async (event, context) => {
  try {
    // 获取前端传递的用户名（以本地存储的 username 为准，不依赖 token）
    const creator = event && event.creator;
    if (!creator) {
      return {
        code: 400,
        message: '缺少创建人信息'
      };
    }

    const { page = 1, pageSize = 10 } = event || {};
    const offset = (page - 1) * pageSize;

    // 兼容历史数据：同时兼容 creator 与 creatorName 两种字段
    const whereCond = db.command.or([
      { creator: String(creator) },
      { creatorName: String(creator) }
    ]);

    let activities = [];
    let count = 0;
    try {
      // 优先使用 getWithCount（若运行环境支持）
      const ret = await activitiesCollection
        .where(whereCond)
        .orderBy('createdAt', 'desc')
        .skip(offset)
        .limit(pageSize)
        .getWithCount();
      activities = ret.data || [];
      count = ret.count || 0;
    } catch (e) {
      // 回退方案：分两次查询
      console.warn('getWithCount 不可用，使用回退查询:', e && e.message);
      const listRet = await activitiesCollection
        .where(whereCond)
        .orderBy('createdAt', 'desc')
        .skip(offset)
        .limit(pageSize)
        .get();
      activities = listRet.data || [];
      const countRet = await activitiesCollection.where(whereCond).count();
      count = countRet.total || 0;
    }

    return {
      code: 0,
      data: {
        list: activities,
        total: count,
        page,
        pageSize,
        hasMore: offset + activities.length < count
      }
    };
  } catch (err) {
    console.error('获取用户活动失败:', err);
    return {
      code: 500,
      message: '获取活动列表失败，请稍后重试',
      error: err.message
    };
  }
};
