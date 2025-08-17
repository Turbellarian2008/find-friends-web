'use strict';
const crypto = require('crypto');
const db = uniCloud.database();
const usersCollection = db.collection('users');

// 生成 token
function generateToken(userId) {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2);
  const token = crypto
    .createHash('sha256')
    .update(`${userId}-${timestamp}-${randomStr}`)
    .digest('hex');
  return token;
}

exports.main = async (event, context) => {
  try {
    const { username, password } = event;
    
    // 参数验证
    if (!username || !password) {
      return {
        code: 400,
        message: '用户名和密码不能为空'
      };
    }
    
    // 查询用户
    const { data: users } = await usersCollection
      .where({
        username: username.trim(),
        password: crypto.createHash('sha256').update(password).digest('hex') // 密码加密后比对
      })
      .limit(1)
      .get();
    
    if (!users || users.length === 0) {
      return {
        code: 401,
        message: '用户名或密码错误'
      };
    }
    
    const user = users[0];
    
    // 生成 token
    const token = generateToken(user._id);
    
    // 更新用户最后登录时间
    await usersCollection.doc(user._id).update({
      lastLoginTime: Date.now()
    });
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userInfo } = user;
    
    return {
      code: 0,
      message: '登录成功',
      data: {
        token,
        userInfo
      }
    };
  } catch (err) {
    console.error('登录失败:', err);
    return {
      code: 500,
      message: '服务器内部错误',
      error: err.message
    };
  }
};
