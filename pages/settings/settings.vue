<template>
  <view class="settings-container">
    <view class="form-item">
      <text class="label">新密码</text>
      <view class="input-row">
        <input class="input flex-1" :password="!showNew" v-model="newPassword" placeholder="6-20位新密码" />
        <uni-icons :type="showNew ? 'eye-slash' : 'eye'" size="22" color="#666" @click="showNew = !showNew"></uni-icons>
      </view>
    </view>
    <view class="form-item">
      <text class="label">确认新密码</text>
      <view class="input-row">
        <input class="input flex-1" :password="!showConfirm" v-model="confirmPassword" placeholder="请再次输入新密码" />
        <uni-icons :type="showConfirm ? 'eye-slash' : 'eye'" size="22" color="#666" @click="showConfirm = !showConfirm"></uni-icons>
      </view>
    </view>

    <button class="submit-button" :class="canSubmit ? 'enabled' : 'disabled'" @tap="onSubmit">更改密码</button>
  </view>
</template>

<script>
export default {
  data() {
    return {
      newPassword: '',
      confirmPassword: '',
      showNew: false,
      showConfirm: false
    }
  },
  computed: {
    canSubmit() {
      const n = this.newPassword || '';
      const c = this.confirmPassword || '';
      return (
        n.length >= 6 && n.length <= 20 &&
        n === c
      );
    }
  },
  methods: {
    async onSubmit() {
      if (!this.canSubmit) {
        uni.showToast({ title: '请完整填写并确认新密码', icon: 'none' });
        return;
      }
      const userInfo = uni.getStorageSync('userInfo');
      const storedUsername = uni.getStorageSync('username');
      const username = (userInfo && userInfo.username) || storedUsername || '';
      if (!username) {
        uni.showToast({ title: '未登录，请先登录', icon: 'none' });
        setTimeout(() => { uni.navigateTo({ url: '/pages/login/login' }) }, 800);
        return;
      }
      try {
        uni.showLoading({ title: '提交中...', mask: true });
        const res = await uniCloud.callFunction({
          name: 'changePassword',
          data: {
            username,
            newPassword: this.newPassword
          },
          timeout: 10000
        });
        uni.hideLoading();
        if (res && res.result && res.result.code === 0) {
          uni.showToast({ title: '密码修改成功', icon: 'success' });
          // 安全起见，清除登录态，跳转登录
          try {
            uni.removeStorageSync('userInfo');
            uni.removeStorageSync('currentUsername');
          } catch (_) {}
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/login/login' });
          }, 800);
        } else {
          uni.showToast({ title: (res && res.result && res.result.message) || '修改失败', icon: 'none' });
        }
      } catch (err) {
        uni.hideLoading();
        console.error('修改密码失败:', err);
        uni.showToast({ title: `失败: ${err.message || '网络错误'}`, icon: 'none' });
      }
    }
  }
}
</script>

<style>
.settings-container {
  padding: 30rpx;
}
.form-item { margin-bottom: 40rpx; }
.label { display:block; margin-bottom: 12rpx; color:#333; font-size: 28rpx; }
.input {
  height: 90rpx;
  width: 94%;
  padding: 0 20rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  background-color: #fff;
  box-sizing: border-box;
  margin: 0 auto;
}
.submit-button {
  margin-top: 20rpx;
  height: 90rpx;
  background: #007AFF;
  color: #fff;
  border-radius: 12rpx;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit-button.disabled { opacity: 0.6; }
</style>
