<template>
  <view class="login-container">
    <view class="login-header">
      <text class="title">用户登录</text>
    </view>
    
    <view class="login-form">
      <view class="form-item">
        <text class="label">用户名</text>
        <input 
          class="input" 
          v-model="form.username" 
          placeholder="请输入用户名"
          maxlength="20"
        />
      </view>
      
      <view class="form-item input-with-suffix">
        <text class="label">密码</text>
        <view class="input-wrapper">
          <input 
            class="input" 
            v-model="form.password" 
            :password="!loginPwdVisible"
            placeholder="请输入密码"
            maxlength="20"
          />
          <view class="suffix-group">
            <view class="clear-toggle" v-if="form.password" @click.stop="form.password = ''">
              <text class="icon-clear">✕</text>
            </view>
            <view class="eye-toggle" @click.stop="loginPwdVisible = !loginPwdVisible">
              <text class="icon-eye">{{ loginPwdVisible ? '👁️' : '🙈' }}</text>
            </view>
          </view>
        </view>
      </view>
      
      <button class="login-btn" @click="handleLogin" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>
      
      <view class="register-tip">
        还没有账号？<text class="register-link" @click="navigateToRegister">立即注册</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      form: {
        username: '',
        password: ''
      },
      loading: false,
      loginPwdVisible: false
    }
  },
  methods: {
    async handleLogin() {
      // 表单验证
      if (!this.form.username.trim()) {
        uni.showToast({
          title: '请输入用户名',
          icon: 'none'
        });
        return;
      }
      
      if (!this.form.password) {
        uni.showToast({
          title: '请输入密码',
          icon: 'none'
        });
        return;
      }
      
      try {
        this.loading = true;
        
        // 调用云函数进行登录
        const res = await uniCloud.callFunction({
          name: 'userLogin',
          data: {
            username: this.form.username.trim(),
            password: this.form.password
          },
          timeout: 10000
        });
        
        if (res.result.code === 0) {
          // 登录成功
          uni.showToast({
            title: '登录成功',
            icon: 'success'
          });
          
          // 仅使用本地 userInfo 作为登录态，并显式存储 username（注意后端返回结构在 data 内）
          const userInfo = (res.result && res.result.data && res.result.data.userInfo) || {};
          uni.setStorageSync('userInfo', userInfo);
          // 优先使用后端返回的标准 username 字段
          const username = userInfo && userInfo.username ? String(userInfo.username) : '';
          if (username) {
            // 统一使用 'username' 作为本地存储键
            uni.setStorageSync('username', username);
            // 兼容旧逻辑，同步一份到 currentUsername（可逐步移除）
            uni.setStorageSync('currentUsername', username);
          }
          console.log('登录写入本地存储', { hasUserInfo: !!userInfo, username: uni.getStorageSync('username') });
          
          // 统一跳转到首页（避免从注册页 navigateBack 回退到注册）
          setTimeout(() => {
            uni.switchTab({
              url: '/pages/index/index',
              fail: () => uni.reLaunch({ url: '/pages/index/index' })
            });
          }, 1200);
        } else {
          // 登录失败
          throw new Error(res.result.message || '登录失败');
        }
      } catch (err) {
        console.error('登录失败:', err);
        uni.showToast({
          title: err.message || '登录失败，请重试',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },
    
    navigateToRegister() {
      uni.navigateTo({
        url: '/pages/register/register'
      });
    }
  }
}
</script>

<style>
page {
  background-color: #f5f5f5;
  height: 100%;
}

.login-container {
  padding: 60rpx 60rpx 0;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.login-header {
  margin-bottom: 80rpx;
  text-align: center;
}

.login-header .title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
}

.login-form {
  flex: 1;
}

.form-item {
  margin-bottom: 40rpx;
}

.form-item .label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
}

.form-item .input {
  width: 100%;
  height: 88rpx;
  background-color: #fff;
  border-radius: 8rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  border: 1px solid #eee;
}

.login-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #007AFF;
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  margin-top: 60rpx;
  text-align: center;
}

.login-btn[disabled] {
  background-color: #a0cfff;
  color: #fff;
}

.register-tip {
  margin-top: 40rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}

.register-link {
  color: #007AFF;
  margin-left: 10rpx;
}

/* 密码显示/隐藏输入框样式 */
.input-with-suffix .input-wrapper {
  position: relative;
}
.input-with-suffix .input {
  padding-right: 140rpx; /* 预留右侧两个图标空间 */
}
.suffix-group {
  position: absolute;
  right: 20rpx;
  top: 0;
  height: 88rpx; /* 与输入框等高 */
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.eye-toggle, .clear-toggle { display: flex; align-items: center; }
.icon-eye { font-size: 36rpx; line-height: 1; color: #999; }
.icon-clear { font-size: 30rpx; line-height: 1; color: #c0c4cc; }
</style>
