<template>
  <view class="my-activities">
    <!-- 自定义导航栏 -->
    <view class="custom-nav">
      <view class="nav-left" @click="goBack">
        <uni-icons type="back" size="24" color="#333"></uni-icons>
      </view>
      <view class="nav-title">我创建的活动</view>
      <view class="nav-right"></view>
    </view>

    <!-- 活动列表 -->
    <scroll-view 
      scroll-y 
      class="activity-list"
      @scrolltolower="loadMore"
      v-if="activityList.length > 0"
    >
      <view 
        class="activity-item" 
        v-for="(item, index) in activityList" 
        :key="index"
        @click="navigateToDetail(item._id)"
        hover-class="activity-item--hover"
      >
        <view class="activity-header">
          <text class="activity-name">{{ item.name }}</text>
          <text class="activity-status" :class="{'status-active': item.status === 1, 'status-ended': item.status === 2}">
            {{ item.status === 1 ? '进行中' : '已结束' }}
          </text>
        </view>

        <view class="activity-info">
          <view class="info-row">
            <view class="info-item">
              <uni-icons type="location" size="18" color="#8c8c8c"></uni-icons>
              <text class="info-text">{{ fullAddress(item) }}</text>
            </view>
          </view>
          <view class="info-row">
            <view class="chip">
              <uni-icons type="calendar" size="16" color="#4e5969"></uni-icons>
              <text class="chip-text">{{ item.date }} {{ item.timeSlot }}</text>
            </view>
            <view class="chip">
              <uni-icons type="person" size="16" color="#4e5969"></uni-icons>
              <text class="chip-text">{{ item.joinedPeople }}/{{ item.totalPeople }}人</text>
            </view>
          </view>
        </view>

        <view class="activity-footer">
          <text class="create-time">创建时间：{{ formatTime(item.createdAt) }}</text>
          <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="load-more" v-if="hasMore">
        <view class="spinner"></view>
        <text class="load-text">正在加载</text>
      </view>
      <view class="no-more" v-else-if="!loading && activityList.length > 0">
        <text>已经到底了</text>
      </view>
    </scroll-view>

    <!-- 空状态 -->
    <view class="empty-state" v-else>
      <image src="/static/images/empty-activity.png" mode="aspectFit" class="empty-image"></image>
      <text class="empty-text">您还没有创建过活动</text>
      <button class="create-btn" @click="navigateToCreate">去创建</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      activityList: [],
      loading: false,
      page: 1,
      pageSize: 10,
      hasMore: true,
      currentUsername: ''
    };
  },
  onLoad() {
    this.checkLoginAndLoad();
  },
  onShow() {
    // 可根据需要在返回该页时刷新
    // 如果需要每次进入都刷新，取消注释以下两行
    // this.page = 1;
    // this.hasMore = true;
  },
  methods: {
    // 检查登录状态并加载活动
    checkLoginAndLoad() {
      // 从本地存储获取用户名
      const username = uni.getStorageSync('username');
      if (!username) {
        uni.showToast({
          title: '请先登录',
          icon: 'none',
          duration: 1500,
          success: () => {
            setTimeout(() => {
              uni.navigateTo({
                url: '/pages/login/login'
              });
            }, 1500);
          }
        });
        return;
      }
      
      this.currentUsername = username;
      // 首次进入或切换账号时重置分页
      this.page = 1;
      this.hasMore = true;
      this.loadActivities();
    },
    
    // 加载活动列表
    async loadActivities() {
      if (this.loading || !this.hasMore) return;
      if (!this.currentUsername) {
        // 尝试恢复用户名
        this.checkLoginAndLoad();
        return;
      }
      
      this.loading = true;
      try {
        const res = await uniCloud.callFunction({
          name: 'getUserActivities',
          data: {
            creator: this.currentUsername,  // 传递创建人用户名
            page: this.page,
            pageSize: this.pageSize
          }
        });
        console.log('[myActivities] getUserActivities result:', res && res.result);
        const { code, data, message } = res.result || {};
        if (code === 0) {
          if (this.page === 1) {
            this.activityList = data.list || [];
          } else {
            this.activityList = [...this.activityList, ...(data.list || [])];
          }
          this.hasMore = !!(data && data.hasMore && data.list && data.list.length > 0);
        } else {
          uni.showToast({
            title: message || '加载失败，请重试',
            icon: 'none'
          });
        }
      } catch (err) {
        console.error('加载活动失败:', err);
        uni.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },
    
    // 加载更多
    loadMore() {
      if (this.loading || !this.hasMore) return;
      this.page++;
      this.loadActivities();
    },
    
    // 跳转到活动详情
    navigateToDetail(id) {
      uni.navigateTo({
        url: `/pages/detailActivity/detailActivity?id=${id}`
      });
    },
    
    // 跳转到创建活动
    navigateToCreate() {
      uni.switchTab({
        url: '/pages/createActivity/createActivity'
      });
    },
    
    // 返回上一页
    goBack() {
      uni.navigateBack();
    },
    
    // 格式化时间
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },

    // 组合展示地址，兼容历史 location 字段
    fullAddress(item) {
      const area = item.area || '';
      const detail = item.location || '';
      if (area || detail) {
        const spaceDetail = detail ? (' ' + detail) : '';
        return `${area}${spaceDetail}` || detail;
      }
      return '';
    }
  }
};
</script>

<style>
.my-activities {
  min-height: 100vh;
  background-color: #f7f7f7;
  padding-bottom: env(safe-area-inset-bottom);
}

/* 自定义导航栏 */
.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  padding-top: calc(15px + env(safe-area-inset-top));
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: saturate(180%) blur(6px);
}

.nav-left, .nav-right {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

/* 活动列表 */
.activity-list {
  padding: 15px;
  height: calc(100vh - 60px - env(safe-area-inset-top));
  box-sizing: border-box;
}

.activity-item {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px 14px;
  margin-bottom: 15px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.04);
  transition: transform 0.08s ease, box-shadow 0.2s ease;
}

.activity-item--hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.activity-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex: 1;
  margin-right: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
}

.status-active {
  background-color: #e8f5e9;
  color: #4caf50;
}

.status-ended {
  background-color: #ffebee;
  color: #f44336;
}

.activity-info { 
  margin: 6px 0 10px; 
}

.info-row { 
  display: flex; 
  gap: 8px; 
  align-items: center; 
  flex-wrap: wrap; 
  margin-bottom: 8px; 
}
.info-item { 
  display: flex; 
  align-items: center; 
  gap: 6px; 
  font-size: 14px; 
  color: #666; 
}
.info-text { 
  color: #4e5969; 
}

.chip { 
  display: inline-flex; 
  align-items: center; 
  gap: 6px; 
  padding: 6px 10px; 
  background: #f5f7fa; 
  border-radius: 999px; 
  font-size: 12px; 
  color: #4e5969; 
}
.chip-text { 
  line-height: 1; 
}

.activity-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 6px;
  font-size: 12px;
  color: #999;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 30px;
  text-align: center;
}

.empty-image {
  width: 200px;
  height: 200px;
  margin-bottom: 20px;
}

.empty-text {
  font-size: 16px;
  color: #999;
  margin-bottom: 30px;
}

.create-btn {
  background: linear-gradient(135deg, #4CAF50, #66BB6A);
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 0 30px;
  height: 40px;
  line-height: 40px;
  font-size: 14px;
}

.create-btn:active {
  opacity: 0.9;
}

/* 加载更多 */
.load-more,
.no-more {
  text-align: center;
  padding: 12px 0 20px;
  color: #999;
  font-size: 14px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #e5e7eb;
  border-top-color: #4caf50;
  border-radius: 50%;
  margin: 0 auto 8px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
