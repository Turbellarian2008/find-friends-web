<template>
  <view class="user-info-container">
    <view class="form-container">
      <!-- 头像（固定本地图片） -->
      <view class="form-item">
        <text class="label">头像</text>
        <view class="avatar-fixed">
          <image 
            :src="'/static/icons/my.png'" 
            mode="aspectFill" 
            class="avatar"
          />
        </view>
      </view>
      
      <!-- 昵称 -->
      <view class="form-item">
        <text class="label">昵称</text>
        <input 
          class="input" 
          v-model="form.nickname" 
          placeholder="请输入昵称"
          maxlength="20"
          :disabled="readOnly"
        />
      </view>
      
      <!-- 性别 -->
      <view class="form-item">
        <text class="label">性别</text>
        <picker 
          class="picker" 
          mode="selector" 
          :range="genderOptions" 
          :value="form.gender"
          :disabled="readOnly"
          @change="onGenderChange"
        >
          <view class="picker-text">
            {{ genderOptions[form.gender] || '请选择性别' }}
          </view>
        </picker>
      </view>
      
      <!-- 个人简介 -->
      <view class="form-item">
        <text class="label">个人简介</text>
        <textarea 
          class="textarea" 
          v-model="form.bio" 
          placeholder="介绍一下自己吧~"
          maxlength="200"
          auto-height
          :disabled="readOnly"
        />
      </view>
      
      <!-- 保存按钮 -->
      <button 
        class="save-btn" 
        :disabled="!hasChanged || saving"
        @click="saveUserInfo"
        v-if="!readOnly"
      >
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      form: {
        nickname: '',
        gender: 0, // 0-未知 1-男 2-女
        bio: ''
      },
      originalForm: {},
      genderOptions: ['未知', '男', '女'],
      saving: false,
      readOnly: false,
      viewUsername: ''
    };
  },
  computed: {
    // 检查表单是否有变化
    hasChanged() {
      // 仅比较可编辑字段
      const cur = { nickname: this.form.nickname, gender: this.form.gender, bio: this.form.bio };
      const ori = { nickname: this.originalForm.nickname, gender: this.originalForm.gender, bio: this.originalForm.bio };
      return JSON.stringify(cur) !== JSON.stringify(ori);
    }
  },
  onLoad(options) {
    try {
      const cur = uni.getStorageSync('username') || '';
      const paramU = options && options.username ? String(options.username) : '';
      if (paramU && paramU !== cur) {
        // 查看他人资料，进入只读模式
        this.readOnly = true;
        this.viewUsername = paramU;
        this.loadPublicUserInfo(paramU);
        return;
      }
    } catch (_) {}
    // 自己资料，可编辑
    this.readOnly = false;
    this.viewUsername = '';
    this.loadUserInfo();
  },
  methods: {
    // 加载用户信息
    loadUserInfo() {
      const userInfo = uni.getStorageSync('userInfo');
      if (userInfo) {
        this.form = {
          nickname: userInfo.nickname || userInfo.username || '',
          gender: userInfo.gender || 0,
          bio: userInfo.bio || ''
        };
        // 保存原始数据用于比较
        this.originalForm = { ...this.form };
      }
    },
    // 加载他人公开资料
    async loadPublicUserInfo(username) {
      if (!username) return;
      try {
        uni.showLoading({ title: '加载中...', mask: true });
        const res = await uniCloud.callFunction({
          name: 'getUserPublicInfo',
          data: { username: String(username) },
          timeout: 10000
        });
        const r = (res && res.result) || {};
        if (r.code === 0 && r.data) {
          const d = r.data;
          this.form = {
            nickname: d.nickname || d.username || '',
            gender: typeof d.gender === 'number' ? d.gender : 0,
            bio: d.bio || ''
          };
          this.originalForm = { ...this.form };
        } else {
          uni.showToast({ title: r.message || '加载失败', icon: 'none' });
        }
      } catch (e) {
        console.error('加载公开资料失败:', e);
        uni.showToast({ title: e.message || '加载失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
    
    // 已移除头像更换与上传逻辑，头像固定为 /static/icons/my.png
    
    // 性别选择变化
    onGenderChange(e) {
      this.form.gender = parseInt(e.detail.value);
    },
    
    // 保存用户信息
    async saveUserInfo() {
      if (!this.form.nickname.trim()) {
        uni.showToast({
          title: '请输入昵称',
          icon: 'none'
        });
        return;
      }

      try {
        this.saving = true;
        // 仅允许更新昵称（username 不可更改）
        const username = uni.getStorageSync('username');
        if (!username) {
          throw new Error('未登录或缺少用户名');
        }
        // 调用云函数仅更新昵称
        const res = await uniCloud.callFunction({
          name: 'updateUserInfo',
          data: {
            username: String(username),
            nickname: this.form.nickname.trim(),
            bio: String(this.form.bio || ''),
            gender: Number.isInteger(this.form.gender) ? this.form.gender : parseInt(this.form.gender) || 0
          },
          timeout: 10000
        });
        
        if (res.result.code === 0) {
          // 更新本地存储的用户信息
          const userInfo = uni.getStorageSync('userInfo');
          const updatedUserInfo = { ...userInfo, nickname: this.form.nickname.trim(), bio: String(this.form.bio || ''), gender: (Number.isInteger(this.form.gender) ? this.form.gender : parseInt(this.form.gender) || 0) };
          uni.setStorageSync('userInfo', updatedUserInfo);
          
          // 只更新原始昵称字段，保持其他字段不变
          this.originalForm = { ...this.originalForm, nickname: this.form.nickname.trim(), bio: String(this.form.bio || ''), gender: (Number.isInteger(this.form.gender) ? this.form.gender : parseInt(this.form.gender) || 0) };
          
          uni.showToast({
            title: '保存成功',
            icon: 'success'
          });
          
          // 返回上一页
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        } else {
          throw new Error(res.result.message || '保存失败');
        }
      } catch (err) {
        console.error('保存用户信息失败:', err);
        uni.showToast({
          title: err.message || '保存失败，请重试',
          icon: 'none'
        });
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style>
.user-info-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  box-sizing: border-box;
}

.form-container {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-top: 20rpx;
}

.form-item {
  margin-bottom: 40rpx;
}

.form-item .label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 20rpx;
  font-weight: 500;
}

/* 头像固定容器 */
.avatar-fixed {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background-color: #f5f5f5;
  overflow: hidden;
  margin: 0 auto;
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 移除上传提示与占位样式 */

/* 输入框 */
.input, .picker {
  width: 100%;
  height: 80rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.picker {
  display: flex;
  align-items: center;
}

.textarea {
  width: 100%;
  min-height: 160rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  line-height: 1.5;
}

/* 保存按钮 */
.save-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #007AFF;
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  margin-top: 60rpx;
  text-align: center;
  border: none;
}

.save-btn[disabled] {
  background-color: #a0cfff;
  color: #fff;
  opacity: 0.7;
}
</style>
