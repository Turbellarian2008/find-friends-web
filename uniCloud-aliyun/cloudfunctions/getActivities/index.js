'use strict';
exports.main = async (event, context) => {
    try {
        const db = uniCloud.database();
        console.log('开始查询活动列表');
        
        const res = await db.collection('activities')
            .orderBy('createdAt', 'desc')
            .get();

        // 添加调试日志
        console.log('查询结果记录数:', res.data.length);
        
        // 处理活动列表，确保每个活动都有 id
        const activities = res.data.map(activity => {
            // 确保每个活动都有 id
            const id = activity._id || activity.id;
            
            if (!id) {
                console.warn('活动缺少必要字段:', { id, activity });
            }
            
            // 返回处理后的活动数据，确保包含 id
            return {
                ...activity,
                id: id  // 使用 _id 作为 id
            };
        });

        console.log('处理后的活动列表:', JSON.stringify(activities, null, 2));
        
        return {
            code: 0,
            data: activities
        };
    } catch (err) {
        console.error('数据库错误详情:', {
            message: err.message,
            stack: err.stack,
            code: err.code
        });
        return {
            code: -1,
            message: '数据库查询异常',
            error: err.message
        };
    }
};
