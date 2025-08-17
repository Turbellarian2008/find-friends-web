'use strict';

exports.main = async (event, context) => {
  try {
    // 仅支持通过 id 查询
    if (!event || !event.id) {
      console.error('错误：缺少活动标识参数（需要 id）');
      return { 
        code: -1, 
        message: '缺少活动标识参数（需要 id）',
        receivedData: event
      };
    }

    const db = uniCloud.database();
    const whereQuery = { _id: event.id };
    const res = await db.collection('activities')
      .where(whereQuery)
      .limit(1)
      .get();

    console.log('数据库查询结果:', JSON.stringify(res, null, 2));

    if (!res.data || res.data.length === 0) {
      console.error('未找到指定活动，查询条件:', whereQuery);
      return { 
        code: -1, 
        message: '活动不存在或已被删除',
        requestedId: event.id
      };
    }
    
    // 获取活动数据
    const activity = res.data[0];

    // 准备返回的数据，确保包含 id 字段
    const activityData = {
      ...activity,
      id: activity._id  // 保留数据库 _id 作为 id
    };

    console.log('成功获取活动详情，ID:', activityData.id);
    
    return {
      code: 0,
      data: activityData
    };
  } catch (err) {
    console.error('查询详情失败:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      requestData: event
    });
    
    return {
      code: -1,
      message: '获取详情失败: ' + err.message,
      error: {
        name: err.name,
        message: err.message,
        code: err.code
      }
    };
  }
};