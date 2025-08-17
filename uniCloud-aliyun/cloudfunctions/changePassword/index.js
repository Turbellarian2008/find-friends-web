'use strict';
const crypto = require('crypto');
const db = uniCloud.database();
const usersCollection = db.collection('users');

exports.main = async (event, context) => {
  try {
    const { username, newPassword } = event || {};

    // 基本校验
    if (!username || !newPassword) {
      return { code: 400, message: '参数不完整' };
    }
    if (String(newPassword).length < 6 || String(newPassword).length > 20) {
      return { code: 400, message: '新密码长度需在6-20个字符之间' };
    }

    // 查询用户
    const { data: users } = await usersCollection.where({
      username: String(username).trim()
    }).limit(1).get();

    if (!users || users.length === 0) {
      return { code: 404, message: '用户不存在' };
    }

    const user = users[0];
    const newHash = crypto.createHash('sha256').update(String(newPassword)).digest('hex');
    if (newHash === user.password) {
      return { code: 400, message: '新密码不能与原密码相同' };
    }

    await usersCollection.doc(user._id).update({
      password: newHash,
      updateTime: Date.now()
    });

    return { code: 0, message: '密码修改成功' };
  } catch (err) {
    console.error('changePassword error:', err);
    return { code: 500, message: '服务器内部错误', error: err.message };
  }
};
