'use strict';

// 不再依赖 uni-id，前端已改为仅通过本地 userInfo 判定登录

exports.main = async (event, context) => {
    // 记录接收到的数据（敏感信息如密码等不应记录）
    const loggableEvent = { ...event };
    console.log('接收到的活动数据:', JSON.stringify(loggableEvent, null, 2));
    
    try {
        // 验证必填字段：名称、区、详细地址、日期、开始时间、结束时间、类型（已去除街道）
        if (!event.name || !event.area || !event.location || !event.date || !event.timeSlot || !event.endtime || !event.type) {
            const errorMsg = '缺少必填字段（name/area/location/date/timeSlot/endtime/type）';
            console.error(errorMsg, event);
            return {
                code: 400,
                message: errorMsg,
                requiredFields: ['name', 'area', 'location', 'date', 'timeSlot', 'endtime', 'type']
            };
        }

        // 校验结束时间必须晚于开始时间（格式：HH:mm）
        const toMin = (t) => {
            const [h, m] = String(t).split(':');
            return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
        };
        if (toMin(event.endtime) <= toMin(event.timeSlot)) {
            const errorMsg = '结束时间需晚于开始时间';
            console.error(errorMsg, { start: event.timeSlot, end: event.endtime });
            return { code: 400, message: errorMsg };
        }

        // 不再校验 token，直接使用前端传入的数据

        // 准备活动数据
        const activityData = {
            name: event.name.trim(),
            // 拆分存储：区/详细地址（不再存储街道）
            area: String(event.area).trim(),
            location: String(event.location).trim(), // 详细地址
            totalPeople: Number(event.totalPeople) || 10,
            joinedPeople: 1, // 默认创建者自动加入
            date: event.date,
            timeSlot: event.timeSlot,
            endtime: event.endtime,
            type: String(event.type),
            contact: event.contact ? String(event.contact).trim() : '未提供联系方式',
            description: event.description ? String(event.description).trim() : '暂无详细说明',
            creator: event.creator || '未知用户', // 使用前端传递的创建人信息
            creatorId: null, // 不再依赖后端用户ID
            creatorName: event.creator || '未知用户',
            participants: [{
                userId: null,
                username: event.creator || '未知用户',
                avatar: '',
                joinTime: Date.now()
            }],
            status: 1, // 1-进行中 2-已结束
            createdAt: event.createdAt || Date.now(), // 使用前端传递的创建时间或当前时间
            updatedAt: Date.now()
        };

        console.log('准备创建活动:', JSON.stringify(activityData, null, 2));
        
        // 写入数据库
        const db = uniCloud.database();
        const res = await db.collection('activities').add(activityData);
        
        console.log('活动创建成功，ID:', res.id);
        
        // 返回成功响应，包含创建的活动ID
        return {
            code: 0,
            message: '活动创建成功',
            data: {
                id: res.id,  // 返回创建的活动ID
                ...activityData
            }
        };
    } catch (err) {
        // 打印详细错误信息
        console.error('创建活动失败:', {
            message: err.message,
            stack: err.stack,
            code: err.code,
            receivedData: event
        });
        
        return {
            code: -1,
            message: '创建活动失败: ' + (err.message || '未知错误'),
            error: {
                name: err.name,
                message: err.message,
                code: err.code
            }
        };
    }
};
