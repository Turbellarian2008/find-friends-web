<template>
	<view class="create-activity-container">
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
			<text class="label">活动地点</text>
			<picker mode="selector" :range="districts" @change="onDistrictChange" :value="districtIndex">
				<view class="picker">{{ districtIndex >= 0 ? districts[districtIndex] : '请选择区' }}</view>
			</picker>
			<view style="height: 16rpx;"></view>
			<input class="input" v-model="detailAddress" placeholder="请输入更详细地址（门牌号等）" />
			<view v-if="districtIndex>=0" style="margin-top: 12rpx; color: #666; font-size: 24rpx;">
				预览：广东省广州市{{ districts[districtIndex] }}{{ detailAddress ? (' ' + detailAddress) : '' }}
			</view>
		</view>
		<view class="form-item">
			<text class="label">活动日期</text>
			<picker mode="date" :start="minDate" @change="onDateChange">
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
		<button class="submit-button" :class="isFormValid ? 'enabled' : 'disabled'" @tap="onSubmitTap">提交</button>
		<!-- 防止底部按钮被自定义 tabbar 遮挡的占位 -->
		<view class="tabbar-spacer"></view>
	</view>
</template>

<script>
  export default {
    onShow() {
      try {
        const userInfo = uni.getStorageSync('userInfo');
        const storedUsername = uni.getStorageSync('username');
        console.log('[createActivity.onShow]', {
          hasUserInfo: !!userInfo,
          userInfoUsername: userInfo && userInfo.username,
          storedUsername
        });
      } catch (_) {}
    },
		data() {
			return {
				form: {
					name: "",
					location: "",
					date: "",
					timeSlot: "",
					endtime: "",
					contact: "",
					totalPeople: "",  //默认值
					description: "",
					type: ""
				},
				// 小时/分钟列（开始时间用）
        hours: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
        minutes: Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')),
        unitHour: ['：'],
        startPickerIndex: [0, 0, 0], // [h, unit, m]
        // 结束时间列（包含 24:00）
        endHours: Array.from({ length: 25 }, (_, i) => String(i).padStart(2, '0')), // 00..24
        endMinutes: Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')),
        endPickerIndex: [0, 0, 0],
        // 全天分钟级时间点：用于校验与兼容旧逻辑
        timeSlots: Array.from({ length: 24 * 60 }, (_, i) => {
          const h = String(Math.floor(i / 60)).padStart(2, '0');
          const m = String(i % 60).padStart(2, '0');
          return `${h}:${m}`;
        }),
				peopleOptions: Array.from({ length: 9 }, (_, i) => `${i + 2}`),
				peopleIndex: -1,
				districts: [
          '越秀区','荔湾区','海珠区','天河区','白云区','黄埔区','番禺区','花都区','南沙区','从化区','增城区'
        ],
        districtIndex: -1,
        detailAddress: '',
        typeOptions: ['室内运动','户外运动','音乐','艺术','娱乐','其他'],
        // 日期选择最小值（今天）
        minDate: '',
      }
    },
    created() {
      // 仅允许选择今天及以后 + 初始化开始时间可选列
      this.minDate = this.formatDate(new Date());
      this.rebuildStartColumns();
    },
    computed: {
      isFormValid() {
        const hasName = !!this.form.name && this.form.name.trim().length > 0;
        const hasDistrict = this.districtIndex >= 0;
        const hasDetail = !!this.detailAddress && this.detailAddress.trim().length > 0;
        const hasDate = !!this.form.date;
        const hasTime = !!this.form.timeSlot;
        const hasEnd = !!this.form.endtime;
        const hasPeople = !!this.form.totalPeople && Number(this.form.totalPeople) > 0;
        const phoneOk = /^\d{11}$/.test(this.form.contact);
        const hasDesc = !!this.form.description && this.form.description.trim().length > 0;
        const hasType = !!this.form.type;
        const orderOk = hasTime && hasEnd ? this.compareTime(this.form.endtime, this.form.timeSlot) > 0 : false;
        return hasName && hasDistrict && hasDetail && hasDate && hasTime && hasEnd && orderOk && hasPeople && phoneOk && hasDesc && hasType;
      },
      // 根据所选日期动态计算可选开始时间
      availableStartTimes() {
        return this.getAvailableStartTimesFor(this.form.date);
      },
      // 根据日期与开始时间，动态计算可选结束时间
      availableEndTimes() {
        return this.getAvailableEndTimesFor(this.form.date, this.form.timeSlot);
      }
    },
    methods: {
      onSubmitTap() {
        if (this.isFormValid) {
          this.submitActivity();
        } else {
          const reason = this.getFirstInvalidReason();
          if (reason) {
            uni.showToast({ title: reason, icon: 'none' });
          }
        }
      },
      getFirstInvalidReason() {
        if (!this.form.name || !this.form.name.trim()) return '请填写活动名称';
        if (this.districtIndex < 0) return '请选择活动所在区';
        if (!this.detailAddress || !this.detailAddress.trim()) return '请填写详细地址';
        if (!this.form.date) return '请选择活动日期';
        if (!this.form.timeSlot) return '请选择开始时间';
        if (!this.form.endtime) return '请选择结束时间';
        if (this.compareTime(this.form.endtime, this.form.timeSlot) <= 0) return '结束时间需晚于开始时间';
        if (!this.form.totalPeople || Number(this.form.totalPeople) <= 0) return '请选择活动人数';
        if (!/^\d{11}$/.test(this.form.contact)) return '请输入11位手机号';
        if (!this.form.description || !this.form.description.trim()) return '请填写详细说明';
        if (!this.form.type) return '请选择活动类型';
        return '';
      },
      onTypeSelect(t) {
        this.form.type = t;
      },
      onDateChange(e) {
        this.form.date = e.detail.value;
        // 日期变化不影响可选项，但清理无效的结束时间（保持 end > start）
        if (this.form.timeSlot && this.form.endtime && this.compareTime(this.form.endtime, this.form.timeSlot) <= 0) {
          this.form.endtime = '';
        }
        // 重新构建开始时间列（若是今天则不能早于当前时间）
        this.rebuildStartColumns();
        // 若当前开始时间早于允许的最小时间，则清空
        const minStart = this.getMinStartForSelectedDate();
        if (this.form.timeSlot && minStart && this.compareTime(this.form.timeSlot, minStart) < 0) {
          this.form.timeSlot = '';
        }
      },
      // 多列开始时间选择
      onStartMultiChange(e) {
        const [hIdx, _uh, mIdx] = e.detail.value;
        this.startPickerIndex = [hIdx, 0, mIdx];
        const h = this.hours[hIdx];
        const m = this.minutes[mIdx];
        this.form.timeSlot = `${h}:${m}`;
        // 重建结束列，并设置一个合法的默认结束时间（start+1 分钟）
        this.rebuildEndColumns();
        const next = this.addOneMinute(h, m);
        this.setEndTimeDefault(next.h, next.m);
      },
      onStartMultiColumnChange(e) {
        const { column, value } = e.detail;
        // 仅第 0 列(小时)与第 2 列(分钟)有效
        const idx = [...this.startPickerIndex];
        if (column === 0) idx[0] = value;
        if (column === 2) idx[2] = value;
        this.startPickerIndex = idx;
        // 实时联动结束列（但不立即写入 form）
        this.rebuildEndColumns();
        // 当选择的是今天时，切换小时需要刷新分钟列的最小值
        if (column === 0) {
          const h = this.hours[this.startPickerIndex[0]];
          this.minutes = this.getStartMinutesForHour(h);
          // 确保分钟索引不越界
          if (this.startPickerIndex[2] >= this.minutes.length) {
            this.startPickerIndex[2] = 0;
          }
        }
      },
      // 多列结束时间选择
      onEndMultiChange(e) {
        const [hIdx, _uh, mIdx] = e.detail.value;
        this.endPickerIndex = [hIdx, 0, mIdx];
        const h = this.endHours[hIdx];
        const mArr = this.getEndMinutesForHour(h);
        const mm = mArr[Math.min(mIdx, mArr.length - 1)];
        const endStr = `${h}:${mm}`;
        if (this.form.timeSlot && this.compareTime(endStr, this.form.timeSlot) <= 0) {
          uni.showToast({ title: '结束时间需晚于开始时间', icon: 'none' });
          return;
        }
        this.form.endtime = endStr;
      },
      onEndMultiColumnChange(e) {
        const { column, value } = e.detail;
        const idx = [...this.endPickerIndex];
        if (column === 0) {
          idx[0] = value;
          const h = this.endHours[value];
          this.endMinutes = this.getEndMinutesForHour(h);
          // 调整分钟索引
          this.endPickerIndex = [value, 0, 0];
        } else if (column === 2) {
          idx[2] = value;
          this.endPickerIndex = idx;
        }
      },
      // 根据开始时间重建结束列（小时与分钟可选范围）
      rebuildEndColumns() {
        const { startH, startM } = this.getStartHM();
        // 结束小时：startH..24
        const startHourNum = parseInt(startH, 10);
        this.endHours = Array.from({ length: 25 - startHourNum }, (_, i) => String(startHourNum + i).padStart(2, '0'));
        // 结束分钟：当小时==startH 时必须 > startM；当小时==24 时只能 00；其他小时 00..59
        this.endMinutes = this.getEndMinutesForHour(this.endHours[0]);
        this.endPickerIndex = [0, 0, 0];
        // 如果当前已有 endtime 但不满足条件，清空
        if (this.form.endtime && this.compareTime(this.form.endtime, `${startH}:${startM}`) <= 0) {
          this.form.endtime = '';
        }
      },
      getEndMinutesForHour(endH) {
        const { startH, startM } = this.getStartHM();
        if (endH === '24') return ['00'];
        if (endH === startH) {
          const mStart = parseInt(startM, 10) + 1; // 必须严格晚于开始时间
          const arr = [];
          for (let m = mStart; m <= 59; m++) arr.push(String(m).padStart(2, '0'));
          return arr.length ? arr : ['00'];
        }
        return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
      },
      setEndTimeDefault(h, m) {
        // 将结束列定位到 h:m（若超出范围，则选择当前可选的最小值）
        const hourIdx = this.endHours.indexOf(h);
        let hi = hourIdx >= 0 ? hourIdx : 0;
        this.endMinutes = this.getEndMinutesForHour(this.endHours[hi]);
        let mi = this.endMinutes.indexOf(m);
        if (mi < 0) mi = 0;
        this.endPickerIndex = [hi, 0, mi];
        this.form.endtime = `${this.endHours[hi]}:${this.endMinutes[mi]}`;
      },
      getStartHM() {
        const [hIdx, _uh, mIdx] = this.startPickerIndex;
        const h = this.hours[Math.max(0, Math.min(hIdx, this.hours.length - 1))];
        const m = this.minutes[Math.max(0, Math.min(mIdx, this.minutes.length - 1))];
        return { startH: h, startM: m };
      },
      addOneMinute(h, m) {
        const hh = parseInt(h, 10), mm = parseInt(m, 10);
        const total = hh * 60 + mm + 1;
        if (total >= 24 * 60) return { h: '24', m: '00' };
        const nh = String(Math.floor(total / 60)).padStart(2, '0');
        const nm = String(total % 60).padStart(2, '0');
        return { h: nh, m: nm };
      },
      // 选择的日期是否为今天
      isTodaySelected() {
        if (!this.form.date) return false;
        const today = this.formatDate(new Date());
        return this.form.date === today;
      },
      // 获取所选日期的最小开始时间（今天为当前时间，其他为 00:00）
      getMinStartForSelectedDate() {
        if (this.isTodaySelected()) {
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, '0');
          const mm = String(now.getMinutes()).padStart(2, '0');
          return `${hh}:${mm}`;
        }
        return '00:00';
      },
      // 根据选择的日期重建开始时间小时/分钟列
      rebuildStartColumns() {
        const minStart = this.getMinStartForSelectedDate();
        const [minH, minM] = minStart.split(':').map(s => parseInt(s, 10));
        // 构建小时列
        this.hours = Array.from({ length: 24 - minH }, (_, i) => String(minH + i).padStart(2, '0'));
        // 当前选中小时
        const currentHour = this.hours[Math.max(0, Math.min(this.startPickerIndex[0], this.hours.length - 1))] || String(minH).padStart(2, '0');
        // 构建分钟列
        this.minutes = this.getStartMinutesForHour(currentHour);
        // 调整索引
        let hIdx = this.hours.indexOf(currentHour);
        if (hIdx < 0) hIdx = 0;
        let mIdx = Math.max(0, Math.min(this.startPickerIndex[2] || 0, this.minutes.length - 1));
        this.startPickerIndex = [hIdx, 0, mIdx];
      },
      // 给定小时在不同情况下（今天的最小小时 vs 其他小时）返回分钟列
      getStartMinutesForHour(h) {
        const minStart = this.getMinStartForSelectedDate();
        const [minH, minM] = minStart.split(':').map(s => parseInt(s, 10));
        const hourNum = parseInt(h, 10);
        if (hourNum === minH) {
          return Array.from({ length: 60 - minM }, (_, i) => String(minM + i).padStart(2, '0'));
        }
        return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
      },
      formatDate(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      },
      // 结束时间可选项：严格大于开始时间，范围 (start, 24:00]
      getAvailableEndTimesFor(dateStr, startStr) {
        // 放宽：仅依赖开始时间，未选日期也可生成
        if (!startStr) return [];
        const endBase = this.timeSlots.concat('24:00');
        return endBase.filter(t => this.compareTime(t, startStr) > 0);
      },
      // 开始时间可选项：全天 00:00 ~ 23:59（不再按当前时间过滤）
      getAvailableStartTimesFor(_dateStr) {
        try {
          return this.timeSlots;
        } catch (_) {
          return [];
        }
      },
      compareTime(a, b) {
        // 返回 a-b 的分钟差：>0 表示 a 晚于 b
        const toMin = (t) => {
          const [h, m] = String(t).split(':');
          return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
        };
        return toMin(a) - toMin(b);
      },
      formatDate(d) {
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const da = d.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${da}`;
      },
      onPeopleChange(e) {
        this.peopleIndex = e.detail.value;
        this.form.totalPeople = parseInt(this.peopleOptions[this.peopleIndex]);
      },
      onDistrictChange(e) {
        this.districtIndex = Number(e.detail.value);
      },
      resetForm() {
        // 清空表单与选择
        this.form = {
          name: '',
          location: '',
          date: '',
          timeSlot: '',
          endtime: '',
          contact: '',
          totalPeople: '',
          description: '',
          type: ''
        };
        this.peopleIndex = -1;
        this.districtIndex = -1;
        this.detailAddress = '';
      },
      async submitActivity() {
        // 仅通过本地 userInfo 判断是否已登录
        const userInfo = uni.getStorageSync('userInfo');
        if (!userInfo) {
          uni.showToast({ title: '请先登录', icon: 'none', duration: 1500 });
          setTimeout(() => {
            uni.navigateTo({ url: '/pages/login/login' });
          }, 800);
          return;
        }

        // 组装地点（用于显示），并准备拆分字段
        let area = '';
        let locationDetail = '';
        if (this.districtIndex >= 0) {
          area = this.districts[this.districtIndex] || '';
          locationDetail = (this.detailAddress || '').trim();
          const detail = locationDetail ? (' ' + locationDetail) : '';
          this.form.location = `广东省广州市${area}${detail}`;
        } else {
          this.form.location = '';
        }

        // 逐项严格校验（所有字段必填且手机号为11位）
        if (!this.form.name || !this.form.name.trim()) {
          uni.showToast({ title: '请填写活动名称', icon: 'none' });
          return;
        }
        if (this.districtIndex < 0) {
          uni.showToast({ title: '请选择活动所在区', icon: 'none' });
          return;
        }
        if (!this.detailAddress || !this.detailAddress.trim()) {
          uni.showToast({ title: '请填写详细地址', icon: 'none' });
          return;
        }
        if (!this.form.date) {
          uni.showToast({ title: '请选择活动日期', icon: 'none' });
          return;
        }
        if (!this.form.timeSlot) {
          uni.showToast({ title: '请选择开始时间', icon: 'none' });
          return;
        }
        if (!this.form.endtime) {
          uni.showToast({ title: '请选择结束时间', icon: 'none' });
          return;
        }
        if (this.compareTime(this.form.endtime, this.form.timeSlot) <= 0) {
          uni.showToast({ title: '结束时间需晚于开始时间', icon: 'none' });
          return;
        }
        if (!this.form.totalPeople || Number(this.form.totalPeople) <= 0) {
          uni.showToast({ title: '请选择活动人数', icon: 'none' });
          return;
        }
        if (!/^\d{11}$/.test(this.form.contact)) {
          uni.showToast({ title: '请输入11位手机号', icon: 'none' });
          return;
        }
        if (!this.form.description || !this.form.description.trim()) {
          uni.showToast({ title: '请填写详细说明', icon: 'none' });
          return;
        }
        if (!this.form.type) {
          uni.showToast({ title: '请选择活动类型', icon: 'none' });
          return;
        }

        // 获取当前登录的用户名：优先本地 'username' 其后 userInfo.username
        const storedUsername = uni.getStorageSync('username');
        const currentUsername = storedUsername || (userInfo && userInfo.username) || '';
        if (!currentUsername) {
          uni.showToast({ title: '未获取到用户名，请重新登录', icon: 'none', duration: 2000 });
          setTimeout(() => {
            uni.navigateTo({ url: '/pages/login/login' });
          }, 800);
          return;
        }
        try { uni.setStorageSync('currentUsername', String(currentUsername)); } catch (_) {}

				try {
					// 显示加载中提示
					uni.showLoading({
						title: '创建中...',
						mask: true
					});

					// 调用云函数创建活动（不含街道）
					const res = await uniCloud.callFunction({
						name: 'uploadActivity',
						data: {
							name: this.form.name,
							area: area,
							location: locationDetail,
							date: this.form.date,
							timeSlot: this.form.timeSlot,
							endtime: this.form.endtime,
							contact: this.form.contact,
							totalPeople: parseInt(this.form.totalPeople, 10),
							description: this.form.description,
							type: this.form.type,
							joinedPeople: 1,
							creator: currentUsername,
							createdAt: Date.now()
						},
						timeout: 15000
					});

					// 隐藏加载中
					uni.hideLoading();

					if (res.result.code === 0) {
            uni.showToast({ 
              title: '活动创建成功', 
              icon: 'success',
              duration: 1000
            });

            // 重置表单，便于下次填写
            this.resetForm();

            // 1 秒后跳转到首页
            setTimeout(() => {
              // 优先切换到首页 Tab
              uni.switchTab({
                url: '/pages/index/index',
                fail: () => {
                  // 如果不是 tabBar 页面，则使用重启跳转
                  uni.reLaunch({ url: '/pages/index/index' });
                }
              });
            }, 1000);
          } else {
            // 显示错误信息
            uni.showToast({ 
              title: res.result.message || '活动创建失败', 
              icon: 'none',
              duration: 3000
            });
          }
				} catch (err) {
					// 隐藏加载中
					uni.hideLoading();
					
					// 显示错误信息
					console.error('提交失败:', err);
					uni.showToast({ 
						title: `提交失败: ${err.message || '网络错误'}`,
						icon: 'none',
						duration: 3000
					});
				}
			}
		}
	}
</script>

<style>
	.create-activity-container {
		padding: 30rpx;
		background-color: #f8f8f8;
		min-height: 100vh;
		/* 预留底部空间，避免被固定 tabbar 遮挡 */
		padding-bottom: 160rpx;
	}

	.form-item {
		margin-bottom: 40rpx;
	}

	.label {
		font-size: 30rpx;
		color: #333;
		margin-bottom: 15rpx;
		display: block;
		font-weight: 500;
	}

	.input {
		height: 90rpx;
		width: 94%;
		padding: 0 20rpx;
		border: 2rpx solid #e0e0e0;
		border-radius: 12rpx;
		font-size: 28rpx;
		background-color: #fff;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
		box-sizing: border-box;
		margin: 0 auto;
	}

	.textarea {
		width: 94%;
		height: 240rpx;
		padding: 20rpx;
		border: 2rpx solid #e0e0e0;
		border-radius: 12rpx;
		font-size: 28rpx;
		background-color: #fff;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
		box-sizing: border-box;
		margin: 0 auto;
	}

	.submit-button {
		margin-top: 60rpx;
		height: 90rpx;
		background: linear-gradient(135deg, #4CAF50, #66BB6A);
		color: white;
		border-radius: 12rpx;
		font-size: 32rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 6rpx 20rpx rgba(76, 175, 80, 0.3);
		border: none;
	}

	.submit-button:active {
		opacity: 0.9;
		transform: scale(0.98);
	}

	.submit-button.enabled {
		background-color: #07c160; /* WeChat green */
		color: #fff;
	}

	.submit-button.disabled {
		background-color: #d9d9d9;
		color: #fff;
	}

	.picker {
		height: 90rpx;
		width: 94%;
		padding: 0 24rpx;
		border: 2rpx solid #e0e0e0;
		border-radius: 12rpx;
		font-size: 28rpx;
		background-color: #fff;
		display: flex;
		align-items: center;
		box-sizing: border-box;
		margin: 0 auto;
	}

	.picker-text {
		flex: 1;
	}

	.picker-placeholder {
		color: #999;
	}

	/* 活动类型按钮样式 */
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