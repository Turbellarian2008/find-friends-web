'use strict';
const db = uniCloud.database();
const feedbackCol = db.collection('feedback');

exports.main = async (event, context) => {
  try {
    const { username, content } = event;

    if (!username) {
      return { code: 401, message: '未登录或用户名缺失' };
    }
    if (!content || String(content).trim().length < 10) {
      return { code: 400, message: '反馈内容至少10个字' };
    }

    const doc = {
      username: String(username),
      content: String(content).trim(),
      createdAt: Date.now(),
      status: 'new' // new|processing|resolved
    };

    const res = await feedbackCol.add(doc);
    if (res && res.id) {
      return { code: 0, message: '提交成功', data: { id: res.id } };
    }
    throw new Error('提交失败');
  } catch (e) {
    console.error('submitFeedback error', e);
    return { code: 500, message: '服务异常，请稍后重试', error: e.message };
  }
};
