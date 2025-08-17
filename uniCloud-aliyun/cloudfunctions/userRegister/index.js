'use strict';
const crypto = require('crypto');
const db = uniCloud.database();
const usersCollection = db.collection('users');

exports.main = async (event, context) => {
  try {
    const { username, password, agreePrivacy, policyVersion } = event;
    
    // 验证用户名和密码
    if (!username || !password) {
      return {
        code: 400,
        message: '用户名和密码不能为空'
      };
    }

    // 校验隐私政策是否勾选
    if (!agreePrivacy) {
      return { code: 400, message: '请勾选并同意隐私政策' };
    }
    
    // 验证用户名长度
    if (username.trim().length < 3 || username.trim().length > 20) {
      return {
        code: 400,
        message: '用户名长度需在3-20个字符之间'
      };
    }
    
    // 验证密码长度
    if (password.length < 6 || password.length > 20) {
      return {
        code: 400,
        message: '密码长度需在6-20个字符之间'
      };
    }

    // 检查用户名是否已存在
    const { total: userDup } = await usersCollection.where({
      username: username.trim()
    }).count();
    if (userDup > 0) {
      return {
        code: 409,
        message: '用户名重复'
      };
    }
    
    // 对密码进行加密
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    // 创建用户
    const res = await usersCollection.add({
      username: username.trim(),
      password: hashedPassword,
      nickname: username.trim(), // 默认昵称为用户名
      avatar: '',
      gender: 0, // 0-未知 1-男 2-女
      bio: '',
      createTime: Date.now(),
      updateTime: Date.now(),
      lastLoginTime: 0,
      privacyConsent: {
        agreed: true,
        version: policyVersion || '1.0.0',
        timestamp: Date.now()
      }
    });
    
    if (res.id) {
      return {
        code: 0,
        message: '注册成功',
        data: {
          userId: res.id
        }
      };
    } else {
      throw new Error('注册失败');
    }
  } catch (err) {
    console.error('注册失败:', err);
    return {
      code: 500,
      message: '注册失败，请稍后重试',
      error: err.message
    };
  }
};
