<template>
  <view class="joined-container">
    <view class="header">我加入的活动</view>

    <view v-if="loading" class="loading">加载中...</view>
    <view v-else>
      <view v-if="joinedList.length === 0" class="empty">暂无加入的活动</view>

      <view v-else class="list">
        <view class="card" v-for="item in joinedList" :key="item.id" @click="goDetail(item)">
          <view class="title">{{ item.name }}</view>
          <view class="meta">
            <text class="meta-item">时间：{{ item.date }} {{ item.timeSlot }}</text>
            <text class="meta-item">人数：{{ item.joinedPeople || 0 }} / {{ item.totalPeople }}</text>
          </view>
          <view class="address">地点：{{ buildAddress(item) }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loading: false,
      allList: [],
      joinedList: []
    }
  },
  onShow() {
    this.fetchJoined();
  },
  onPullDownRefresh() {
    this.fetchJoined().finally(() => uni.stopPullDownRefresh());
  },
  methods: {
    buildAddress(a) {
      const area = a.area || '';
      const detail = a.location || '';
      if (area || detail) {
        const detailPart = detail ? (' ' + detail) : '';
        return `广东省广州市${area}${detailPart}`;
      }
      return '未设置';
    },
    async fetchJoined() {
      this.loading = true;
      try {
        const username = uni.getStorageSync('username') || '';
        if (!username) {
          this.joinedList = [];
          return;
        }
        // 获取所有活动
        const res = await uniCloud.callFunction({ name: 'getActivities', data: {} });
        const list = (res && res.result && res.result.data) || [];
        // 规范化 id 并按 participants 过滤
        const normalized = list.map(a => ({
          id: a.id || a._id || '',
          name: a.name || '未命名活动',
          date: a.date || '',
          timeSlot: a.timeSlot || '',
          totalPeople: a.totalPeople || 0,
          joinedPeople: a.joinedPeople || 0,
          area: a.area || '',
          location: a.location || '',
          participants: Array.isArray(a.participants) ? a.participants : []
        }));
        this.allList = normalized;
        this.joinedList = normalized.filter(a => a.participants.some(p => String(p && p.username) === String(username)));
      } catch (e) {
        console.error('加载加入的活动失败:', e);
        uni.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },
    goDetail(item) {
      if (!item || !item.id) return;
      uni.navigateTo({ url: `/pages/detailActivity/detailActivity?id=${encodeURIComponent(item.id)}` });
    }
  }
}
</script>

<style>
.joined-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  box-sizing: border-box;
}
.header {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin: 20rpx 0 24rpx;
}
.loading, .empty {
  text-align: center;
  color: #999;
  padding: 60rpx 0;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
}
.title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.meta {
  margin-top: 12rpx;
  display: flex;
  gap: 24rpx;
  color: #666;
  font-size: 26rpx;
}
.address {
  margin-top: 10rpx;
  color: #666;
  font-size: 26rpx;
}
</style>
