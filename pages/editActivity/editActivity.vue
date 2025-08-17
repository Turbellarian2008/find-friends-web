<template>
  <view class="container">
    <view class="form-item">
      <text class="label">活动名称</text>
      <input class="input" v-model="form.name" placeholder="请输入活动名称" />
    </view>

    <view class="form-item">
      <text class="label">活动类型</text>
      <view class="type-list">
        <view
          class="type-item"
          v-for="t in typeOptions"
          :key="t"
          :class="{ active: form.type === t }"
          @tap="onTypeSelect(t)"
        >
          {{ t }}
        </view>
      </view>
    </view>

    <view class="form-item">
      <text class="label">活动所在区</text>
      <picker mode="selector" :range="districtOptions" :value="districtIndex" @change="onDistrictChange">
        <view class="picker">{{ districtIndex >= 0 ? districtOptions[districtIndex] : '请选择区' }}</view>
      </picker>
    </view>
    <view class="form-item">
      <text class="label">详细地址</text>
      <input class="input" v-model="detailAddress" placeholder="请输入详细地址" />
    </view>
    <view class="form-item">
      <text class="label">地点预览</text>
      <view class="picker">{{ displayLocation }}</view>
    </view>

    <view class="form-item">
      <text class="label">活动日期</text>
      <picker mode="date" @change="onDateChange">
        <view class="picker">{{ form.date || '请选择日期' }}</view>
      </picker>
    </view>

    <view class="form-item">
      <text class="label">活动开始时间</text>
      <picker 
        mode="multiSelector" 
        :range="[hours, ['：'], minutes]" 
        :value="startPickerIndex"
        @change="onStartMultiChange"
        @columnchange="onStartMultiColumnChange"
      >
        <view class="picker">{{ form.timeSlot || '请选择开始时间' }}</view>
      </picker>
    </view>

    <view class="form-item">
      <text class="label">活动结束时间</text>
      <picker 
        mode="multiSelector" 
        :range="[endHours, ['：'], endMinutes]" 
        :value="endPickerIndex"
        @change="onEndMultiChange"
        @columnchange="onEndMultiColumnChange"
      >
        <view class="picker">{{ form.endtime || '请选择结束时间' }}</view>
      </picker>
    </view>

    <view class="form-item">
      <text class="label">联系方式</text>
      <input class="input" v-model="form.contact" placeholder="请输入手机号" type="number" maxlength="11" />
    </view>

    <view class="form-item">
      <text class="label">活动人数</text>
      <picker 
        class="picker" 
        :range="peopleOptions" 
        @change="onPeopleChange"
        :value="peopleIndex"
      >
        <view class="picker-text">
          {{ form.totalPeople ? `${form.totalPeople}人` : '请选择活动人数' }}
        </view>
      </picker>
    </view>

    <view class="form-item">
      <text class="label">详细说明</text>
      <textarea class="textarea" v-model="form.description" placeholder="请输入详细说明"></textarea>
    </view>

    <button class="submit-button" :class="isFormValid ? 'enabled' : 'disabled'" @tap="onSubmitTap">保存修改</button>
  </view>
</template>

<script>
export default {
  data() {
    return {
      activityId: '',
      form: {
        name: '',
        date: '',
        timeSlot: '',
        endtime: '',
        contact: '',
        totalPeople: '',
        description: '',
        type: ''
      },
      originalLocation: '',
      // 地点联动（仅区 + 详细地址）
      districtOptions: ['越秀区','荔湾区','海珠区','天河区','白云区','黄埔区','番禺区','花都区','南沙区','从化区','增城区'],
      districtIndex: -1,
      detailAddress: '',
      // 多列时间选择数组
      hours: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
      minutes: Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')),
      startPickerIndex: [0, 0, 0],
      endHours: [],
      endMinutes: [],
      endPickerIndex: [0, 0, 0],
      endPlaceholder: false,
      peopleOptions: ['2','3','4','5','6','7','8','9','10','12','15','20','30','50'],
      peopleIndex: -1,
      typeOptions: ['室内运动','户外运动','音乐','艺术','娱乐','其他']
    }
  },
  computed: {
    isFormValid() {
      if (!this.form.name || !this.form.name.trim()) return false;
      if (this.districtIndex < 0) return false;
      if (!this.detailAddress || !this.detailAddress.trim()) return false;
      if (!this.form.date) return false;
      if (!this.form.timeSlot) return false;
      if (!this.form.endtime) return false;
      if (this.compareTime(this.form.endtime, this.form.timeSlot) <= 0) return false;
      if (!/^\d{11}$/.test(this.form.contact)) return false;
      if (!this.form.totalPeople || Number(this.form.totalPeople) <= 0) return false;
      if (!this.form.description || !this.form.description.trim()) return false;
      if (!this.form.type) return false;
      return true;
    },
    assembledLocation() {
      if (this.districtIndex < 0) return '';
      const district = this.districtOptions[this.districtIndex];
      const detail = (this.detailAddress || '').trim();
      if (!detail) return `广东省广州市${district}`;
      return `广东省广州市${district} ${detail}`;
    },
    displayLocation() {
      return this.assembledLocation || this.originalLocation || '';
    }
  },
  onLoad(options) {
    if (!options || !options.id) {
      uni.showModal({ title: '错误', content: '缺少活动ID', showCancel: false, complete: () => uni.navigateBack() });
      return;
    }
    this.activityId = options.id;

    // 通过 eventChannel 预填
    try {
      const ec = this.getOpenerEventChannel && this.getOpenerEventChannel();
      if (ec && ec.on) {
        ec.on('activityPrefill', ({ activity }) => {
          if (activity) this.prefill(activity);
        })
      }
    } catch(_) {}

    // 再次从后端拉取最新数据
    this.loadDetail();
  },
  methods: {
    prefill(activity) {
      const f = {
        name: activity.name || '',
        date: activity.date || '',
        timeSlot: activity.timeSlot || '',
        endtime: activity.endtime || '',
        contact: activity.contact || '',
        totalPeople: activity.totalPeople || '',
        description: activity.description || '',
        type: activity.type || ''
      };
      this.form = { ...this.form, ...f };
      // 优先使用拆分字段进行预填
      const area = activity.area || '';
      const detail = activity.location || '';
      if (area) {
        const dIdx = this.districtOptions.findIndex(d => String(d) === String(area));
        this.districtIndex = dIdx;
        // 无街道选择，直接填充详细地址
        this.detailAddress = detail || '';
        // 组装一个显示用的原始地址
        const assembled = `广东省广州市${area}${detail ? (' ' + detail) : ''}`;
        this.originalLocation = assembled;
      } else {
        // 回退：解析旧的合并地址
        this.originalLocation = activity.location || '';
        this.parseLocation(this.originalLocation);
      }
      // peopleIndex
      const idx = this.peopleOptions.findIndex(v => Number(v) === Number(f.totalPeople));
      this.peopleIndex = idx;
      // 初始化列（占位，后续完善逻辑）
      this.rebuildStartColumns();
      this.applyStartIndexFromValue();
      this.rebuildEndColumns();
      this.applyEndIndexFromValue();
    },
    async loadDetail() {
      try {
        const res = await uniCloud.callFunction({ name: 'getActivityDetail', data: { id: this.activityId } });
        if (res.result && res.result.code === 0 && res.result.data) {
          this.prefill(res.result.data);
        }
      } catch(e) {
        console.warn('加载详情失败', e);
      }
    },
    onDateChange(e) {
      this.form.date = e.detail.value;
      this.rebuildStartColumns();
      this.rebuildEndColumns();
    },
    onPeopleChange(e) {
      this.peopleIndex = Number(e.detail.value);
      this.form.totalPeople = Number(this.peopleOptions[this.peopleIndex]);
    },
    onDistrictChange(e) {
      this.districtIndex = Number(e.detail.value);
    },
    parseLocation(location) {
      try {
        if (!location) return;
        // 归一化：去空格、去省市
        const raw = String(location);
        const normalized = raw.replace(/\s+/g, '').replace('广东省','').replace('广州市','');
        // 找区
        const dIdx = this.districtOptions.findIndex(d => normalized.includes(d));
        if (dIdx >= 0) {
          this.districtIndex = dIdx;
          const dName = this.districtOptions[dIdx];
          // 无街道：区名后的剩余内容即为详细地址
          const after = normalized.split(dName)[1] || '';
          this.detailAddress = (after || '').trim();
        }
      } catch (_) {}
    },
    onSubmitTap() {
      if (this.isFormValid) {
        this.submit();
      } else {
        const reason = this.firstInvalidReason();
        reason && uni.showToast({ title: reason, icon: 'none' });
      }
    },
    firstInvalidReason() {
      if (!this.form.name || !this.form.name.trim()) return '请填写活动名称';
      if (this.districtIndex < 0) return '请选择活动所在区';
      if (!this.detailAddress || !this.detailAddress.trim()) return '请填写详细地址';
      if (!this.form.date) return '请选择活动日期';
      if (!this.form.timeSlot) return '请选择开始时间';
      if (!this.form.endtime) return '请选择结束时间';
      if (this.compareTime(this.form.endtime, this.form.timeSlot) <= 0) return '结束时间需晚于开始时间';
      if (!/^\d{11}$/.test(this.form.contact)) return '请输入11位手机号';
      if (!this.form.totalPeople || Number(this.form.totalPeople) <= 0) return '请选择活动人数';
      if (!this.form.description || !this.form.description.trim()) return '请填写详细说明';
      if (!this.form.type) return '请选择活动类型';
      return '';
    },
    onTypeSelect(t) {
      this.form.type = t;
    },
    async submit() {
      const username = uni.getStorageSync('username') || '';
      if (!username) {
        uni.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      try {
        uni.showLoading({ title: '保存中...', mask: true });
        const res = await uniCloud.callFunction({
          name: 'updateActivity',
          data: {
            id: this.activityId,
            username,
            ...this.form,
            // 拆分后的地址字段
            area: this.districtIndex >= 0 ? this.districtOptions[this.districtIndex] : '',
            location: (this.detailAddress || '').trim()
          }
        });
        if (res.result && res.result.code === 0) {
          uni.showToast({ title: '保存成功', icon: 'success' });
          setTimeout(() => {
            // 返回详情页并刷新
            uni.navigateBack();
          }, 800);
        } else {
          throw new Error((res.result && res.result.message) || '保存失败');
        }
      } catch (e) {
        uni.showToast({ title: e.message || '保存失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
    // —— 时间选择相关占位方法（后续完善逻辑） ——
    compareTime(a, b) {
      const toMin = (t) => {
        const [h, m] = String(t || '00:00').split(':');
        return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
      };
      return toMin(a) - toMin(b);
    },
    isTodaySelected() {
      if (!this.form.date) return false;
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return this.form.date === `${y}-${m}-${da}`;
    },
    getMinStartForSelectedDate() {
      if (this.isTodaySelected()) {
        const now = new Date();
        return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      }
      return '00:00';
    },
    getStartMinutesForHour(h) {
      const minStart = this.getMinStartForSelectedDate();
      const [minH, minM] = minStart.split(':').map(s => parseInt(s, 10));
      const hourNum = parseInt(h, 10);
      if (this.isTodaySelected() && hourNum === minH) {
        return Array.from({ length: 60 - minM }, (_, i) => String(minM + i).padStart(2, '0'));
      }
      return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
    },
    rebuildStartColumns() {
      const minStart = this.getMinStartForSelectedDate();
      const [minH] = minStart.split(':').map(s => parseInt(s, 10));
      // hours from minH..23
      this.hours = Array.from({ length: 24 - minH }, (_, i) => String(minH + i).padStart(2, '0'));
      // keep current hour if possible
      const curHour = (this.form.timeSlot || '').split(':')[0];
      const hIdx = Math.max(0, this.hours.indexOf(curHour));
      const h = this.hours[hIdx] || this.hours[0];
      this.minutes = this.getStartMinutesForHour(h);
      let mIdx = 0;
      const curMin = (this.form.timeSlot || '').split(':')[1];
      if (curMin) {
        const found = this.minutes.indexOf(curMin);
        mIdx = found >= 0 ? found : 0;
      }
      this.startPickerIndex = [hIdx, 0, Math.max(0, Math.min(mIdx, this.minutes.length - 1))];
    },
    onStartMultiColumnChange(e) {
      const { column, value } = e.detail;
      const idx = [...this.startPickerIndex];
      if (column === 0) idx[0] = value;
      if (column === 2) idx[2] = value;
      this.startPickerIndex = idx;
      if (column === 0) {
        const h = this.hours[this.startPickerIndex[0]];
        this.minutes = this.getStartMinutesForHour(h);
        if (this.startPickerIndex[2] >= this.minutes.length) this.startPickerIndex[2] = 0;
      }
      this.rebuildEndColumns();
    },
    onStartMultiChange(e) {
      const [hIdx, , mIdx] = e.detail.value;
      const h = this.hours[hIdx] || '00';
      const m = this.minutes[mIdx] || '00';
      this.form.timeSlot = `${h}:${m}`;
    },
    getStartHM() {
      if (this.form.timeSlot) {
        const [h, m] = this.form.timeSlot.split(':');
        return { startH: h, startM: m };
      }
      const h = this.hours[this.startPickerIndex[0]] || '00';
      const m = this.minutes[this.startPickerIndex[2]] || '00';
      return { startH: h, startM: m };
    },
    getEndMinutesForHour(h) {
      const { startH, startM } = this.getStartHM();
      const hourNum = parseInt(h, 10);
      const sHourNum = parseInt(startH, 10);
      if (hourNum === sHourNum) {
        const sMin = parseInt(startM, 10);
        if (sMin >= 59) return [];
        return Array.from({ length: 59 - sMin }, (_, i) => String(sMin + 1 + i).padStart(2, '0'));
      }
      return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
    },
    rebuildEndColumns() {
      const { startH, startM } = this.getStartHM();
      const sHourNum = parseInt(startH || '0', 10);
      // hours from startH..23, but if startM==59, effectively start from next hour
      let beginHour = sHourNum;
      if (parseInt((startM || '0'), 10) >= 59) beginHour = sHourNum + 1;
      if (beginHour > 23) {
        // no valid end time today
        this.endPlaceholder = true;
        this.endHours = ['--'];
        this.endMinutes = ['--'];
        this.endPickerIndex = [0, 0, 0];
        return;
      }
      this.endPlaceholder = false;
      this.endHours = Array.from({ length: 24 - beginHour }, (_, i) => String(beginHour + i).padStart(2, '0'));
      const firstH = this.endHours[0];
      this.endMinutes = this.getEndMinutesForHour(firstH);
      if (this.endMinutes.length === 0) {
        // move to next hour if same-hour minutes empty
        if (this.endHours.length > 1) {
          this.endMinutes = this.getEndMinutesForHour(this.endHours[1]);
          this.endPickerIndex = [1, 0, 0];
        } else {
          this.endPlaceholder = true;
          this.endHours = ['--'];
          this.endMinutes = ['--'];
          this.endPickerIndex = [0, 0, 0];
          return;
        }
      } else {
        this.endPickerIndex = [0, 0, 0];
      }
    },
    onEndMultiColumnChange(e) {
      if (this.endPlaceholder) return;
      const { column, value } = e.detail;
      const idx = [...this.endPickerIndex];
      if (column === 0) idx[0] = value;
      if (column === 2) idx[2] = value;
      this.endPickerIndex = idx;
      if (column === 0) {
        const h = this.endHours[this.endPickerIndex[0]];
        this.endMinutes = this.getEndMinutesForHour(h);
        if (this.endPickerIndex[2] >= this.endMinutes.length) this.endPickerIndex[2] = 0;
      }
    },
    onEndMultiChange(e) {
      const [hIdx, , mIdx] = e.detail.value;
      const h = (this.endHours[hIdx] || this.hours[hIdx] || '00');
      const m = (this.endMinutes[mIdx] || this.minutes[mIdx] || '00');
      this.form.endtime = `${h}:${m}`;
    },
    addOneMinute(h, m) {
      let hh = parseInt(h, 10);
      let mm = parseInt(m, 10) + 1;
      if (mm >= 60) { hh += 1; mm = 0; }
      return { h: String(hh).padStart(2, '0'), m: String(mm).padStart(2, '0') };
    },
    setEndTimeDefault(h, m) {
      if (parseInt(h, 10) > 23) {
        this.form.endtime = '';
        return;
      }
      this.form.endtime = `${h}:${m}`;
    },
    applyStartIndexFromValue() {
      const val = this.form.timeSlot;
      if (!val) return;
      const [h, m] = val.split(':');
      const hIdx = Math.max(0, this.hours.indexOf(h));
      this.minutes = this.getStartMinutesForHour(this.hours[hIdx]);
      const mIdx = Math.max(0, this.minutes.indexOf(m));
      this.startPickerIndex = [hIdx, 0, mIdx];
    },
    applyEndIndexFromValue() {
      const val = this.form.endtime;
      if (!val || this.endPlaceholder) return;
      const [h, m] = val.split(':');
      const hIdx = Math.max(0, this.endHours.indexOf(h));
      this.endMinutes = this.getEndMinutesForHour(this.endHours[hIdx] || h);
      const mIdx = Math.max(0, this.endMinutes.indexOf(m));
      this.endPickerIndex = [hIdx, 0, mIdx];
    }
  }
}
</script>

<style>
.container { padding: 30rpx; }
.form-item { margin-bottom: 24rpx; }
.label { display: block; font-size: 28rpx; color: #333; margin-bottom: 12rpx; }
.input { background: #fff; padding: 20rpx; border-radius: 12rpx; font-size: 28rpx; }
.textarea { background: #fff; padding: 20rpx; border-radius: 12rpx; font-size: 28rpx; min-height: 180rpx; }
.picker { background: #fff; padding: 20rpx; border-radius: 12rpx; font-size: 28rpx; color: #666; }
.picker-text { font-size: 28rpx; color: #666; }
.submit-button { margin-top: 30rpx; height: 90rpx; border-radius: 12rpx; color: #fff; font-size: 32rpx; display: flex; align-items: center; justify-content: center; }
.submit-button.enabled { background-color: #4CAF50; }
.submit-button.disabled { background-color: #c8c9cc; }

 /* 活动类型按钮样式（与创建页一致，允许换行） */
 .type-list {
   width: 94%;
   display: flex;
   flex-wrap: wrap;
   gap: 16rpx;
   margin: 0 auto;
 }
 .type-item {
   padding: 16rpx 28rpx;
   border: 2rpx solid #e0e0e0;
   border-radius: 999rpx;
   font-size: 28rpx;
   background-color: #fff;
   color: #333;
   box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
 }
 .type-item.active {
   background: #e6f7ff;
   border-color: #91d5ff;
   color: #1890ff;
   box-shadow: 0 2rpx 10rpx rgba(24,144,255,0.2);
 }
 .type-item:active {
   opacity: 0.9;
   transform: scale(0.98);
 }
</style>
