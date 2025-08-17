<template>
  <view class="user-container">
    <!-- 用户信息卡片 -->
    <view class="user-card" @click="navigateToUserInfo">
      <view class="user-avatar">
        <image 
          :src="'/static/icons/my.png'"
          mode="aspectFill"
          class="avatar"
        />
      </view>
      <view class="user-info">
        <text class="nickname">{{ userInfo.nickname || '未设置昵称' }}</text>
        <text class="username">用户名: {{ userInfo.username }}</text>
      </view>
      <uni-icons type="right" size="20" color="#999"></uni-icons>
    </view>
    
    <!-- 功能列表 -->
    <view class="menu-list">
      <view class="menu-item" @click="navigateTo('myActivities')">
        <view class="menu-item-left">
          <uni-icons type="list" size="20" color="#007AFF"></uni-icons>
          <text class="menu-text">我创建的活动</text>
        </view>
        <uni-icons type="right" size="20" color="#999"></uni-icons>
      </view>

      <view class="menu-item" @click="navigateTo('joinedActivities')">
        <view class="menu-item-left">
          <uni-icons type="flag" size="20" color="#007AFF"></uni-icons>
          <text class="menu-text">我加入的活动</text>
        </view>
        <uni-icons type="right" size="20" color="#999"></uni-icons>
      </view>

      <view class="menu-item" @click="navigateTo('settings')">
        <view class="menu-item-left">
          <uni-icons type="gear" size="20" color="#007AFF"></uni-icons>
          <text class="menu-text">修改密码</text>
        </view>
        <uni-icons type="right" size="20" color="#999"></uni-icons>
      </view>

      <view class="menu-item" @click="navigateTo('feedback')">
        <view class="menu-item-left">
          <uni-icons type="chat" size="20" color="#007AFF"></uni-icons>
          <text class="menu-text">意见反馈</text>
        </view>
        <uni-icons type="right" size="20" color="#999"></uni-icons>
      </view>
      
      <view class="menu-item" @click="handleLogout">
        <view class="menu-item-left">
          <uni-icons type="undo" size="20" color="#F56C6C"></uni-icons>
          <text class="menu-text" style="color: #F56C6C;">退出登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      userInfo: {}
    };
  },
  onShow() {
    this.loadUserInfo();
  },
  methods: {
    // 加载用户信息
    loadUserInfo() {
      const userInfo = uni.getStorageSync('userInfo');
      if (userInfo) this.userInfo = userInfo;
    },
    
    // 导航到用户信息页
    navigateToUserInfo() {
      uni.navigateTo({
        url: '/pages/userInfo/userInfo'
      });
    },
    
    // 导航到其他页面
    navigateTo(page) {
      if (page === 'myActivities') {
        uni.navigateTo({ url: '/pages/myActivities/myActivities' });
      } else if (page === 'joinedActivities') {
        uni.navigateTo({ url: '/pages/joinedActivities/joinedActivities' });
      } else if (page === 'settings') {
        uni.navigateTo({ url: '/pages/settings/settings' });
      } else if (page === 'feedback') {
        uni.navigateTo({ url: '/pages/feedback/feedback' });
      }
    },
    
    // 退出登录
    handleLogout() {
      uni.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            // 清除本地登录态
            uni.removeStorageSync('userInfo');
            uni.removeStorageSync('currentUsername');
            
            // 跳转到登录页
            uni.reLaunch({
              url: '/pages/login/login'
            });
          }
        }
      });
    }
  }
};
</script>

<style>
.user-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  box-sizing: border-box;
}

/* 用户信息卡片 */
.user-card {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 40rpx 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 24rpx;
  background-color: #f0f0f0;
}

.avatar {
  width: 100%;
  height: 100%;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.nickname {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.username {
  font-size: 24rpx;
  color: #999;
}

/* 菜单列表 */
.menu-list {
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item-left {
  display: flex;
  align-items: center;
}

.menu-text {
  font-size: 28rpx;
  color: #333;
  margin-left: 20rpx;
}
</style>
