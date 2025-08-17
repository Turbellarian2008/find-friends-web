<template>
  <view class="tabbar" :style="tabbarStyle">
    <!-- 首页 -->
    <view class="tab-item" :class="{ active: selected === 0 }" @click="switchTab(0)">
      <image class="tab-icon" :src="selected === 0 ? icons.homeActive : icons.home" mode="aspectFit" />
      <text class="tab-text">首页</text>
    </view>

    <!-- 中间创建（凸起） -->
    <view class="tab-item center-wrapper" @click="switchTab(1)">
      <view class="center-button" :class="{ active: selected === 1 }">
        <image class="center-icon" :src="icons.create" mode="aspectFit" />
      </view>
      <text class="tab-text center-text" :class="{ active: selected === 1 }">创建</text>
    </view>

    <!-- 我的 -->
    <view class="tab-item" :class="{ active: selected === 2 }" @click="switchTab(2)">
      <image class="tab-icon" :src="selected === 2 ? icons.meActive : icons.me" mode="aspectFit" />
      <text class="tab-text">我的</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      selected: 0,
      icons: {
        home: '/static/icons/首页.png',
        homeActive: '/static/icons/首页-选中.png',
        create: '/static/icons/创建活动.png',
        me: '/static/icons/个人中心.png',
        meActive: '/static/icons/个人中心-选中.png'
      }
    }
  },
  computed: {
    tabbarStyle() {
      // 适配 iPhone 底部安全区
      const safe = uni.getSystemInfoSync().safeAreaInsets || {};
      const pb = safe.bottom ? (safe.bottom) : 0;
      return `padding-bottom:${pb}px;`;
    }
  },
  methods: {
    setSelected(i) {
      this.selected = Number(i) || 0;
    },
    switchTab(i) {
      const idx = Number(i) || 0;
      this.selected = idx;
      if (idx === 0) {
        uni.switchTab({ url: '/pages/index/index' });
      } else if (idx === 1) {
        // 作为 Tab 页切换（保持与 pages.json 的 tabBar 列表一致）
        uni.switchTab({ url: '/pages/createActivity/createActivity' });
      } else if (idx === 2) {
        uni.switchTab({ url: '/pages/user/user' });
      }
    }
  }
}
</script>

<style>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100rpx;
  background: #ffffff;
  border-top: 1rpx solid #eaeaea;
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 999;
}

.tab-item {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #7A7E83;
}

.tab-item.active .tab-text {
  color: #007AFF;
}

.tab-icon {
  width: 48rpx;
  height: 48rpx;
}

.tab-text {
  margin-top: 6rpx;
  font-size: 22rpx;
}

/* 中间凸起按钮 */
.center-wrapper {
  position: relative;
  transform: translateY(-22rpx); /* 整体上移，制造凸起效果 */
}

.center-button {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background: #007AFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 20rpx rgba(0, 122, 255, 0.35);
}

.center-button.active {
  background: #0A84FF;
}

.center-icon {
  width: 64rpx;
  height: 64rpx;
}

.center-text {
  margin-top: 6rpx;
  color: #7A7E83;
}

.center-text.active {
  color: #007AFF;
}
</style>
