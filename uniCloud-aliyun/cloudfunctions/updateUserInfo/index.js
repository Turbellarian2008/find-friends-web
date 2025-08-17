'use strict';
const db = uniCloud.database();
const usersCollection = db.collection('users');

// 更新用户信息的云函数
exports.main = async (event, context) => {
  try {
    // 仅允许通过 username 更新公开资料（nickname、bio、gender），username 不可更改
    const { username, nickname, bio, gender } = event || {};
    const hasNickname = typeof nickname !== 'undefined';
    const hasBio = typeof bio !== 'undefined';
    const hasGender = typeof gender !== 'undefined';
    if (!username || (!hasNickname && !hasBio && !hasGender)) {
      return {
        code: 400,
        message: '缺少必要参数：username 或需要更新的字段（nickname/bio/gender）'
      };
    }

    // 查找用户
    const { data: found } = await usersCollection.where({ username: String(username) }).limit(1).get();
    if (!found || found.length === 0) {
      return {
        code: 404,
        message: '用户不存在'
      };
    }

    const userDocId = found[0]._id;

    // 组装需更新字段
    const toUpdate = { updateTime: Date.now() };
    if (hasNickname) {
      toUpdate.nickname = String(nickname).trim();
    }
    if (hasBio) {
      toUpdate.bio = String(bio);
    }
    if (hasGender) {
      let g = parseInt(gender, 10);
      if (![0,1,2].includes(g) || isNaN(g)) g = 0;
      toUpdate.gender = g;
    }
    const { updated } = await usersCollection.doc(userDocId).update(toUpdate);
    if (updated === 0) {
      return {
        code: 500,
        message: '更新失败，请稍后重试'
      };
    }

    // 返回更新后的用户信息（去除敏感字段）
    const { data: [user] } = await usersCollection.doc(userDocId).get();
    
    if (!user) {
      return {
        code: 404,
        message: '用户不存在'
      };
    }
    
    // 不返回密码等敏感信息
    const { password, ...userInfo } = user;
    
    return {
      code: 0,
      message: '更新成功',
      data: userInfo
    };
  } catch (err) {
    console.error('更新用户信息失败:', err);
    return {
      code: 500,
      message: '服务器内部错误',
      error: err.message
    };
  }
};
