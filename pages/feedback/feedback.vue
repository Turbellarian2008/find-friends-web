<template>
  <view class="feedback-container">
    <view class="header">意见反馈</view>

    <view class="tip">请描述你在使用过程中遇到的问题或建议，我们会尽快处理。</view>

    <textarea class="textarea" v-model="content" placeholder="请输入反馈内容（至少10个字）" maxlength="500"/>

    <button class="submit-btn" :disabled="submitting" @click="submit">{{ submitting ? '提交中...' : '提交反馈' }}</button>
  </view>
</template>

<script>
export default {
  data() {
    return {
      content: '',
      submitting: false,
      username: ''
    }
  },
  onLoad() {
    // 自动携带用户名
    const userInfo = uni.getStorageSync('userInfo') || {};
    this.username = userInfo && userInfo.username ? String(userInfo.username) : (uni.getStorageSync('username') || '');
  },
  methods: {
    async submit() {
      if (!this.username) {
        uni.showToast({ title: '请先登录再提交反馈', icon: 'none' });
        return;
      }
      if (!this.content || this.content.trim().length < 10) {
        uni.showToast({ title: '请至少填写10个字', icon: 'none' });
        return;
      }
      try {
        this.submitting = true;
        const res = await uniCloud.callFunction({
          name: 'submitFeedback',
          data: { username: this.username, content: this.content.trim() },
          timeout: 10000
        });
        if (res.result && res.result.code === 0) {
          uni.showToast({ title: '提交成功，感谢反馈！', icon: 'success' });
          setTimeout(() => uni.navigateBack(), 1200);
        } else {
          throw new Error((res.result && res.result.message) || '提交失败');
        }
      } catch (e) {
        console.error('提交反馈失败', e);
        uni.showToast({ title: e.message || '提交失败，请稍后重试', icon: 'none' });
      } finally {
        this.submitting = false;
      }
    }
  }
}
</script>

<style>
.feedback-container { padding: 32rpx; }
.header { font-size: 36rpx; font-weight: 600; text-align: center; margin-bottom: 20rpx; }
.tip { font-size: 26rpx; color: #666; margin-bottom: 24rpx; }
.textarea { width: 100%; min-height: 240rpx; padding: 20rpx; background: #fff; border-radius: 12rpx; border: 1rpx solid #eee; box-sizing: border-box; font-size: 28rpx; }
.submit-btn { margin-top: 32rpx; height: 88rpx; line-height: 88rpx; text-align: center; color: #fff; background: #007AFF; border-radius: 44rpx; }
.submit-btn[disabled] { background: #a0cfff; }
</style>
