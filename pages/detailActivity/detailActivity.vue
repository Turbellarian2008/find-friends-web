<template>
  <view class="detail-container">
    <!-- 活动名称与类型标签 -->
    <view class="title-row">
      <text v-if="activityData.type" class="category-tag title-category">{{ activityData.type }}</text>
      <view class="title">{{ activityData.name }}</view>
    </view>
    
    <!-- 活动详情卡片 -->
    <view class="detail-card">
      <view class="detail-item">
        <text class="detail-label">活动地点：</text>
        <text class="detail-value">{{ fullAddress }}</text>
      </view>
      
      <view class="detail-item">
        <text class="detail-label">活动时间：</text>
        <text class="detail-value">{{ activityData.date }} {{ activityData.timeSlot }}{{ activityData.endtime ? (' - ' + activityData.endtime) : '' }}</text>
      </view>
      
      <view class="detail-item">
        <text class="detail-label">参与人数：</text>
        <text class="detail-value">{{ activityData.joinedPeople || 0 }} / {{ activityData.totalPeople }}</text>
      </view>
      
      <view class="detail-item">
        <text class="detail-label">联系方式：</text>
        <text class="detail-value">{{ activityData.contact || '未提供' }}</text>
      </view>
      
      <view class="detail-item description">
        <text class="detail-label">活动说明：</text>
        <text class="detail-value">{{ activityData.description || '暂无详细说明' }}</text>
      </view>
    </view>
    
    <!-- 不是创建者：报名/退出 按钮，根据是否已报名切换文案 -->
    <button
      :class="['join-button', hasJoined ? 'leave-button' : '']"
      :type="hasJoined ? 'warn' : 'primary'"
      v-if="!isOwner"
      @click="handleJoin"
    >{{ hasJoined ? '退出活动' : '立即报名' }}</button>

    <!-- 创建者可见：编辑/删除按钮 -->
    <view class="owner-actions" v-else>
      <button class="edit-button" @click="goEditActivity">编辑活动</button>
      <button class="delete-button" @click="confirmDelete">删除活动</button>
    </view>

    <!-- 参与者列表：仅当当前账号已加入时展示，显示为 用户名（昵称） -->
    <view v-if="hasJoined && participantsInfo.length" class="participants-card">
      <view class="participants-title">参加人员</view>
      <view class="participants-item" v-for="(p, idx) in participantsInfo" :key="'p-'+idx" @click="goUserProfileTap" :data-username="p.username">
        <text class="participants-link">{{ p.username }}（{{ p.nickname || p.username }}）</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      activityId: '',
      activityData: {
        id: '',
        name: '',
        // 拆分：area 区，location 详细地址（已移除街道）
        area: '',
        location: '',
        date: '',
        timeSlot: '',
        endtime: '',
        totalPeople: 0,
        joinedPeople: 0,
        contact: '',
        description: '',
        type: '',
        creatorName: ''
      },
      participantsInfo: []
    }
  },
  computed: {
    fullAddress() {
      const area = this.activityData.area || '';
      const detail = this.activityData.location || '';
      if (area || detail) {
        const detailPart = detail ? (' ' + detail) : '';
        return `广东省广州市${area}${detailPart}`;
      }
      return '未设置';
    },
    isOwner() {
      try {
        const uname = uni.getStorageSync('username') || '';
        const creator = this.activityData.creatorName || '';
        return uname && creator && String(uname) === String(creator);
      } catch (_) {
        return false;
      }
    },
    hasJoined() {
      try {
        const uname = uni.getStorageSync('username') || '';
        const list = Array.isArray(this.activityData.participants) ? this.activityData.participants : [];
        return !!(uname && list.some(p => String(p && p.username) === String(uname)));
      } catch (_) {
        return false;
      }
    }
  },
  onLoad(options) {
    // 仅使用 id 作为活动标识
    if (!options || !options.id) {
      const errorMsg = '活动标识缺失（需要 id）';
      console.error(errorMsg, '参数:', options);
      uni.showModal({
        title: '错误',
        content: errorMsg,
        showCancel: false,
        complete: () => uni.navigateBack()
      });
    }
    
    // 记录传入的 id，并做解码与清理
    try {
      const rawId = options.id || '';
      this.activityId = decodeURIComponent(String(rawId)).trim();
    } catch (_) {
      this.activityId = (options.id || '').trim();
    }
    console.log('加载活动详情，参数:', { id: this.activityId });
    // 进入详情页即记录当前活动ID，供后续报名使用
    try {
      const toStoreId = String(this.activityId || '');
      uni.setStorageSync('currentActivityId', toStoreId);
      // 兼容用户指定的键名
      uni.setStorageSync('activityid', toStoreId);
    } catch (_) {}

    if (!this.activityId) {
      const errorMsg = '活动标识无效';
      console.error(errorMsg);
      uni.showModal({
        title: '错误',
        content: errorMsg,
        showCancel: false,
        complete: () => uni.navigateBack()
      });
    }

    // 通过 eventChannel 接收上一页传来的活动数据，先行预渲染，提升体验
    try {
      const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
      if (eventChannel && eventChannel.on) {
        eventChannel.on('activityPrefill', ({ activity }) => {
          console.log('收到预填充活动数据:', activity);
          if (activity) {
            this.prefillActivity(activity);
          }
        });
      }
    } catch (e) {
      console.warn('获取 eventChannel 失败（可能是直达打开详情页）:', e);
    }
    
    this.loadActivityDetail();
  },
  methods: {
    prefillActivity(activity) {
      // 规范化字段并带默认值，避免模板渲染报空
      const normalized = {
        id: activity.id || activity._id || '',
        name: activity.name || '未命名活动',
        area: activity.area || '',
        location: activity.location || '',
        date: activity.date || '未设置日期',
        timeSlot: activity.timeSlot || '未设置时间',
        endtime: activity.endtime || '',
        totalPeople: activity.totalPeople || 0,
        joinedPeople: activity.joinedPeople || 0,
        participants: Array.isArray(activity.participants) ? activity.participants : [],
        contact: activity.contact || '未提供',
        description: activity.description || '暂无详细说明',
        type: activity.type || '',
        creatorName: activity.creatorName || activity.creator || ''
      };
      this.activityData = { ...this.activityData, ...normalized };
      // 同步一份活动ID到本地存储，确保 handleJoin 使用同一ID
      try {
        if (normalized.id) {
          const nid = String(normalized.id);
          uni.setStorageSync('currentActivityId', nid);
          // 兼容用户指定的键名
          uni.setStorageSync('activityid', nid);
        }
      } catch (_) {}
    },
    async loadActivityDetail() {
      if (!this.activityId) {
        console.error('活动标识为空');
        return;
      }
      
      try {
        uni.showLoading({ title: '加载中...', mask: true });
        
        console.log('正在请求活动详情，参数:', { id: this.activityId });
        const res = await uniCloud.callFunction({
          name: 'getActivityDetail',
          data: { id: this.activityId },
          timeout: 10000
        });
        
        console.log('获取到活动详情响应:', res);
        
        if (res.result.code === 0) {
          // 确保数据格式正确
          if (!res.result.data) {
            throw new Error('返回的活动数据为空');
          }
          // 使用同一规范化方法更新数据
          this.prefillActivity(res.result.data);
          console.log('活动数据加载成功:', this.activityData);
          // 如用户已加入，加载参与者信息
          if (this.hasJoined) {
            this.loadParticipantsInfo();
          } else {
            this.participantsInfo = [];
          }
        } else {
          throw new Error(res.result.message || '获取活动详情失败');
        }
      } catch (err) {
        console.error('加载活动详情失败:', {
          message: err.message,
          stack: err.stack,
          activityId: this.activityId
        });
        
        uni.showModal({
          title: '加载失败',
          content: `无法加载活动详情: ${err.message || '未知错误'}`,
          showCancel: false,
          confirmText: '返回',
          success: () => {
            uni.navigateBack();
          }
        });
      } finally {
        uni.hideLoading();
      }
    },
    async handleJoin() {
      // 优先使用本地存储的 activityid（与进入详情页一致）
      let id = '';
      try { id = uni.getStorageSync('activityid') || ''; } catch (_) {}
      if (!id) {
        try { id = uni.getStorageSync('currentActivityId') || ''; } catch (_) {}
      }
      if (!id) id = this.activityData.id || this.activityId;
      if (!id) return;
      // 获取当前用户，并固定头像为本地图片
      let username = '';
      const avatar = '/static/icons/my.png';
      try {
        username = uni.getStorageSync('username') || '';
        const userInfo = uni.getStorageSync('userInfo') || {};
        if (!username && userInfo && userInfo.username) username = String(userInfo.username);
      } catch (_) {}

      if (!username) {
        uni.showToast({ title: '请先登录后再报名', icon: 'none' });
        setTimeout(() => uni.navigateTo({ url: '/pages/login/login' }), 600);
        return;
      }

      // 本地已在活动中：切换为退出活动流程
      try {
        const list = Array.isArray(this.activityData.participants) ? this.activityData.participants : [];
        const exists = list.some(p => String(p && p.username) === String(username));
        if (exists) {
          uni.showModal({
            title: '退出活动',
            content: '确定要退出该活动吗？',
            success: async (res) => {
              if (!res.confirm) return;
              try {
                uni.showLoading({ title: '退出中...', mask: true });
                const out = await uniCloud.callFunction({
                  name: 'leaveActivity',
                  data: { id, username },
                  timeout: 15000
                });
                const result = (out && out.result) || {};
                if (result.code === 0) {
                  // 本地更新：计数-1并移除该用户
                  const next = Math.max(0, Number(this.activityData.joinedPeople || 0) - 1);
                  this.activityData.joinedPeople = next;
                  this.activityData.participants = list.filter(p => String(p && p.username) !== String(username));
                  this.activityData.updatedAt = Date.now();
                  uni.showToast({ title: '已退出活动', icon: 'success' });
                  // 退出后清空参与者展示
                  this.participantsInfo = [];
                } else {
                  uni.showToast({ title: result.message || '退出失败，请稍后重试', icon: 'none' });
                }
              } catch (e) {
                console.error('退出失败:', e);
                uni.showToast({ title: e.message || '退出失败，请检查网络', icon: 'none' });
              } finally {
                uni.hideLoading();
              }
            }
          });
          return;
        }
      } catch (_) {}

      try {
        uni.showLoading({ title: '报名中...', mask: true });
        const canonicalId = id; // 直接使用本地已存的 _id

        const res = await uniCloud.callFunction({
          name: 'joinActivity',
          data: { id: canonicalId, username, avatar },
          timeout: 15000
        });

        const result = res && res.result ? res.result : {};
        if (result.code === 0) {
          // 成功：本地更新计数与参与者
          const next = (Number(this.activityData.joinedPeople || 0) + 1);
          this.activityData.joinedPeople = next;
          if (Array.isArray(this.activityData.participants)) {
            this.activityData.participants.push({ username, avatar, joinTime: Date.now() });
          } else {
            this.activityData.participants = [{ username, avatar, joinTime: Date.now() }];
          }
          this.activityData.updatedAt = Date.now();

          uni.showToast({ title: '报名成功', icon: 'success' });
          // 报名成功后加载参与者信息
          this.loadParticipantsInfo();
        } else {
          const msg = result.message || '报名失败，请稍后重试';
          uni.showToast({ title: msg, icon: 'none' });
        }
      } catch (err) {
        console.error('报名失败:', err);
        uni.showToast({ title: err.message || '报名失败，请检查网络', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
    goEditActivity() {
      const id = this.activityData.id || this.activityId;
      if (!id) return;
      uni.navigateTo({
        url: `/pages/editActivity/editActivity?id=${id}`,
        success: (res) => {
          // 预填数据到编辑页
          res.eventChannel && res.eventChannel.emit('activityPrefill', { activity: this.activityData });
        }
      });
    },
    confirmDelete() {
      uni.showModal({
        title: '确认删除',
        content: '删除后不可恢复，确认删除该活动吗？',
        success: async (m) => {
          if (m.confirm) {
            await this.deleteActivity();
          }
        }
      })
    },
    async deleteActivity() {
      if (!this.activityId) return;
      const username = uni.getStorageSync('username') || '';
      try {
        uni.showLoading({ title: '删除中...', mask: true });
        const res = await uniCloud.callFunction({
          name: 'deleteActivity',
          data: { id: this.activityId, username }
        });
        if (res.result && res.result.code === 0) {
          uni.showToast({ title: '删除成功', icon: 'success' });
          setTimeout(() => {
            // 返回首页
            uni.switchTab({ url: '/pages/index/index', fail: () => uni.reLaunch({ url: '/pages/index/index' }) });
          }, 800);
        } else {
          throw new Error((res.result && res.result.message) || '删除失败');
        }
      } catch (e) {
        uni.showToast({ title: e.message || '删除失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
    goUserProfileTap(e) {
      try {
        const uname = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.username;
        if (uname) {
          this.goUserProfile(String(uname));
        }
      } catch (_) {}
    },
    goUserProfile(username) {
      if (!username) return;
      const url = `/pages/userInfo/userInfo?username=${encodeURIComponent(String(username))}`;
      uni.navigateTo({ url });
    },
    async loadParticipantsInfo() {
      try {
        const id = this.activityData.id || this.activityId;
        if (!id) return;
        const res = await uniCloud.callFunction({
          name: 'getActivityParticipants',
          data: { id },
          timeout: 10000
        });
        const r = (res && res.result) || {};
        if (r.code === 0 && Array.isArray(r.data)) {
          this.participantsInfo = r.data;
        } else {
          this.participantsInfo = [];
        }
      } catch (e) {
        console.error('加载参与者信息失败:', e);
        this.participantsInfo = [];
      }
    }
  }
}
</script>

<style>
.detail-container {
  padding: 30rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin: 30rpx 0;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eee;
}

.detail-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 40rpx;
}

.detail-item {
  margin-bottom: 25rpx;
  display: flex;
  flex-wrap: wrap;
}

.detail-item.description {
  flex-direction: column;
}

.detail-label {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-right: 10rpx;
  line-height: 1.6;
}

.detail-value {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  flex: 1;
}

.join-button {
  margin-top: 40rpx;
  height: 90rpx;
  background: linear-gradient(135deg, #4CAF50, #66BB6A);
  color: white;
  border-radius: 12rpx;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 20rpx rgba(76, 175, 80, 0.3);
}

.join-button:active {
  opacity: 0.9;
}

/* 退出活动按钮：红色样式覆盖 */
.leave-button {
  background: linear-gradient(135deg, #F56C6C, #F78989) !important;
  box-shadow: 0 6rpx 20rpx rgba(245, 108, 108, 0.3) !important;
}

.owner-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
}
.edit-button {
  flex: 1;
  height: 90rpx;
  background: #409EFF;
  color: #fff;
  border-radius: 12rpx;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.delete-button {
  flex: 1;
  height: 90rpx;
  background: #F56C6C;
  color: #fff;
  border-radius: 12rpx;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 参与者列表样式 */
.participants-card {
  margin-top: 30rpx;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}
.participants-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}
.participants-item {
  font-size: 28rpx;
  color: #555;
  padding: 10rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.participants-item:last-child {
  border-bottom: none;
}

/* 类别标签样式（详情页） */
.category-tag {
  display: inline-block;
  padding: 8rpx 20rpx;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1;
  color: #0A84FF;
  background-color: rgba(10, 132, 255, 0.12);
  border: 1rpx solid rgba(10, 132, 255, 0.35);
  border-radius: 30rpx;
  backdrop-filter: saturate(140%) blur(2rpx);
}

/* 标题行：类型在左，名称在右（整体居中） */
.title-row {
  display: flex;
  align-items: baseline; /* 与标题文字基线对齐，保证同一水平 */
  justify-content: flex-start; /* 与下方卡片左侧对齐 */
  gap: 12rpx;
  margin: 30rpx 0 10rpx 0;
}

.title-category {
  margin-right: 8rpx;
  transform: translateY(-2px);
}
</style>
