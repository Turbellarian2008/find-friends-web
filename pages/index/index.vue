<template>
	<view class="activities-container">
		<!-- 下拉刷新区域 -->
		<view class="refresh-container" v-if="refreshing">
			<text class="refresh-text">刷新中...</text>
		</view>

		<!-- 侧边筛选抽屉 -->
		<view v-if="filterDrawerVisible" class="drawer-mask" @click="closeFilterDrawer"></view>
		<view class="filter-drawer" :class="{ show: filterDrawerVisible }">
			<view class="drawer-header">筛选</view>
			<view class="drawer-body">
				<!-- 左侧分类 -->
				<view class="drawer-left">
					<view 
						class="drawer-tab" 
						:class="{ active: filterActiveTab === 'date' }"
						@click="filterActiveTab = 'date'"
					>日期</view>
					<view 
						class="drawer-tab" 
						:class="{ active: filterActiveTab === 'time' }"
						@click="filterActiveTab = 'time'"
					>开始时间</view>
					<view 
						class="drawer-tab" 
						:class="{ active: filterActiveTab === 'area' }"
						@click="filterActiveTab = 'area'"
					>地区</view>
					<view 
						class="drawer-tab" 
						:class="{ active: filterActiveTab === 'type' }"
						@click="filterActiveTab = 'type'"
					>类别</view>
				</view>
				<!-- 右侧选项 -->
				<view class="drawer-right">
					<!-- 日期选项：仅“选择”（底部弹出日历，纵向排列） -->
					<view v-if="filterActiveTab === 'date'" class="option-list option-list-column">
						<picker mode="date" :value="tempDatePickerValue" @change="onTempDatePicked">
							<view class="option-item" :class="{ selected: !!tempSelectedDate }">
								{{ tempSelectedDate || '选择' }}
							</view>
						</picker>
					</view>
					<!-- 开始时间选项：多列选择器（小时：分钟），受日期约束 -->
					<view v-else-if="filterActiveTab === 'time'" class="option-list option-list-column">
						<picker 
							mode="multiSelector"
							:range="[tempHours, ['：'], tempMinutes]"
							:value="tempStartPickerIndex"
							@change="onTempStartTimeMultiChange"
							@columnchange="onTempStartTimeMultiColumnChange"
						>
							<view class="option-item" :class="{ selected: !!tempSelectedStartTime }">
								{{ tempSelectedStartTime || '选择开始时间' }}
							</view>
						</picker>
					</view>
					
					<!-- 地区选项（移除“不限”） -->
					<view v-else-if="filterActiveTab === 'area'" class="option-list">
						<view 
							v-for="(a, idx) in areas" :key="'a-'+idx"
							class="option-item" 
							:class="{ selected: tempSelectedAreaIndex === idx }"
							@click="tempSelectedAreaIndex = idx"
						>{{ a }}</view>
					</view>
					<!-- 类别选项（活动类型） -->
					<view v-else-if="filterActiveTab === 'type'" class="option-list">
						<view 
							v-for="(t, idx) in types" :key="'type-'+idx"
							class="option-item" 
							:class="{ selected: tempSelectedTypeIndex === idx }"
							@click="tempSelectedTypeIndex = idx"
						>{{ t }}</view>
					</view>
				</view>
			</view>
			<view class="drawer-actions">
				<button class="btn-clear" @click="onClearTempFilters">清空</button>
				<button class="btn-ok" @click="onConfirmTempFilters">完成</button>
			</view>
		</view>
		<!-- 搜索 -->
		<view class="search-container">
			<input class="search-input" v-model.trim="searchQuery" placeholder="搜索活动名称" confirm-type="search" />
		</view>
		<!-- 筛选 -->
		<!-- 工具栏：仅筛选按钮 -->
		<view class="toolbar">
			<button class="filter-toggle" @click="openFilterDrawer">
				<image class="filter-icon" src="/static/icons/筛选.png" mode="aspectFit"></image>
				<text class="filter-text">筛选</text>
			</button>
		</view>
		        <view class="activity-card" v-for="(activity, index) in displayedActivities" :key="activity.id || index">
            <view class="activity-info">
                <text class="activity-name">{{ activity.name }}</text>
                <view v-if="activity.type" class="category-row">
                  <text class="category-tag">{{ activity.type }}</text>
                </view>
                <text class="activity-location">{{ fullLocation(activity) }}</text>
                <text class="activity-time">{{ activity.date }} {{ activity.timeSlot }}{{ activity.endtime ? (' - ' + activity.endtime) : '' }}</text>
                <text class="activity-count">需要人数: {{ activity.totalPeople }} / 已报名: {{ activity.joinedPeople }}</text>
            </view>
            <button class="detail-button" :data-id="activity.id || activity._id" :data-index="index" @click="viewDetail">查看详情</button>
        </view>
		
		<!-- 空状态提示 -->
		<view v-if="!loading && activityList.length === 0" class="empty-tips">
			<text>暂无活动，下拉刷新或点击底部"创建"发起活动</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				selectedDate: null,
				selectedStartTime: '',
				selectedAreaIndex: null,
				selectedTypeIndex: null,
				areas: ['越秀区','荔湾区','海珠区','天河区','白云区','黄埔区','番禺区','花都区','南沙区','从化区','增城区'],
				types: ['运动','户外','音乐','艺术','其他'],
				searchQuery: '',
				tempDatePickerValue: '',
				// 抽屉筛选相关
				filterDrawerVisible: false,
				filterActiveTab: 'date', // 'date' | 'time' | 'area' | 'type'
				tempSelectedDate: null,
				// 抽屉中的开始时间（临时值）
				tempSelectedStartTime: '',
				// 临时多列：小时、分钟
				tempHours: [],
				tempMinutes: [],
				tempStartPickerIndex: [0, 0, 0],
				tempSelectedAreaIndex: null,
				tempSelectedTypeIndex: null,
				dateOptions: [],
				// 开始时间多列选择数据
				hours: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
				minutes: Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')),
				startPickerIndex: [0, 0, 0],
				activityList: [], // 存储从云数据库获取的活动列表
				refreshing: false, // 是否正在刷新
				loading: false // 是否正在加载
			}
		},
		computed: {
			displayedActivities() {
				if (!this.selectedDate && !this.selectedStartTime && this.selectedAreaIndex === null && this.selectedTypeIndex === null && !this.searchQuery) {
					return this.activityList; // 未选择筛选条件时显示全部
				}
				return this.activityList.filter(activity => {
					const dateMatch = !this.selectedDate || activity.date === this.selectedDate;
					const timeMatch = !this.selectedStartTime || String(activity.timeSlot || '') === this.selectedStartTime;
					const areaMatch = this.selectedAreaIndex === null || activity.area === this.areas[this.selectedAreaIndex];
					const typeMatch = this.selectedTypeIndex === null || activity.type === this.types[this.selectedTypeIndex];
					const q = (this.searchQuery || '').trim().toLowerCase();
					const nameMatch = !q || String(activity.name || '').toLowerCase().includes(q);
					return dateMatch && timeMatch && areaMatch && typeMatch && nameMatch;
				});
			}
		},
		onLoad() {
			// 初始化开始时间列（若选择的是今天，则不早于当前时间）
			this.rebuildStartColumns();
			this.loadActivities();
		},
		onShow() {
	// 每次页面显示时刷新数据
	console.log('首页显示，刷新活动数据...');
	this.loadActivities();
},
		onPullDownRefresh() {
			this.refreshing = true;
			this.loadActivities();
		},
		methods: {
            fullLocation(a) {
                try {
                    const base = '广东省广州市';
                    const area = String((a && a.area) || '').trim();
                    const detail = String((a && a.location) || '').trim();
                    // 若旧数据的 location 已包含省市信息，则直接返回，避免重复
                    if (/广东省|广州市/.test(detail)) return detail;
                    if (area && detail) return `${base}${area} ${detail}`;
                    if (area) return `${base}${area}`;
                    if (detail) return `${base}${detail}`;
                    return '';
                } catch(_) { return String((a && a.location) || ''); }
            },
			onDateChange(e) {
				this.selectedDate = e.detail.value;
				console.log('选择的日期:', this.selectedDate);
				// 日期变化时，重建开始时间可选列，并校验已选开始时间
				try {
					this.rebuildStartColumns();
					const minStart = this.getMinStartForSelectedDate();
					if (this.selectedStartTime && this.compareTime(this.selectedStartTime, minStart) < 0) {
						this.selectedStartTime = '';
					}
				} catch(_) {}
			},
			openFilterDrawer() {
				// 将当前选择复制到临时变量
				this.tempSelectedDate = this.selectedDate || null;
				this.tempSelectedStartTime = this.selectedStartTime || '';
				this.tempSelectedAreaIndex = this.selectedAreaIndex !== null ? this.selectedAreaIndex : null;
				this.tempSelectedTypeIndex = this.selectedTypeIndex !== null ? this.selectedTypeIndex : null;
				this.tempDatePickerValue = this.selectedDate || '';
				this.filterActiveTab = 'date';
				this.filterDrawerVisible = true;
				// 初始化抽屉内开始时间列
				this.rebuildTempStartColumns();
			},
			closeFilterDrawer() {
				this.filterDrawerVisible = false;
			},
			onClearTempFilters() {
				this.tempSelectedDate = null;
				this.tempSelectedStartTime = '';
				this.tempSelectedAreaIndex = null;
				this.tempSelectedTypeIndex = null;
				this.tempDatePickerValue = '';
			},
			onConfirmTempFilters() {
				this.selectedDate = this.tempSelectedDate;
				this.selectedStartTime = this.tempSelectedStartTime || '';
				this.selectedAreaIndex = this.tempSelectedAreaIndex;
				this.selectedTypeIndex = this.tempSelectedTypeIndex;
				this.filterDrawerVisible = false;
			},
			clearTempDate() {
				this.tempSelectedDate = null;
				this.tempDatePickerValue = '';
			},
			onTempDatePicked(e) {
				const val = e.detail && e.detail.value ? e.detail.value : '';
				this.tempDatePickerValue = val;
				this.tempSelectedDate = val || null;
				// 日期变更：重建抽屉内开始时间列，并校验临时时间
				this.rebuildTempStartColumns();
				const minStart = this.getMinStartForTempDate();
				if (this.tempSelectedStartTime && this.compareTime(this.tempSelectedStartTime, minStart) < 0) {
					this.tempSelectedStartTime = '';
				}
			},
			// —— 抽屉内开始时间（临时）列构建与联动 ——
			getMinStartForTempDate() {
				if (!this.tempSelectedDate) return '00:00';
				const today = this.formatDate(new Date());
				if (this.tempSelectedDate === today) {
					const now = new Date();
					return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
				}
				return '00:00';
			},
			rebuildTempStartColumns() {
				const minStart = this.getMinStartForTempDate();
				const [minH, minM] = minStart.split(':').map(s => parseInt(s, 10));
				this.tempHours = Array.from({ length: 24 - minH }, (_, i) => String(minH + i).padStart(2, '0'));
				const curHour = this.tempHours[Math.max(0, Math.min(this.tempStartPickerIndex[0], this.tempHours.length - 1))] || String(minH).padStart(2, '0');
				this.tempMinutes = this.getTempMinutesForHour(curHour);
				let hIdx = this.tempHours.indexOf(curHour);
				if (hIdx < 0) hIdx = 0;
				let mIdx = Math.max(0, Math.min(this.tempStartPickerIndex[2] || 0, this.tempMinutes.length - 1));
				this.tempStartPickerIndex = [hIdx, 0, mIdx];
			},
			getTempMinutesForHour(h) {
				const minStart = this.getMinStartForTempDate();
				const [minH, minM] = minStart.split(':').map(s => parseInt(s, 10));
				const hourNum = parseInt(h, 10);
				if (hourNum === minH) {
					return Array.from({ length: 60 - minM }, (_, i) => String(minM + i).padStart(2, '0'));
				}
				return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
			},
			onTempStartTimeMultiChange(e) {
				const [hIdx, _sep, mIdx] = e.detail.value;
				this.tempStartPickerIndex = [hIdx, 0, mIdx];
				const h = this.tempHours[hIdx];
				const m = this.tempMinutes[mIdx];
				this.tempSelectedStartTime = `${h}:${m}`;
			},
			onTempStartTimeMultiColumnChange(e) {
				const { column, value } = e.detail;
				const idx = [...this.tempStartPickerIndex];
				if (column === 0) idx[0] = value;
				if (column === 2) idx[2] = value;
				this.tempStartPickerIndex = idx;
				if (column === 0) {
					const h = this.tempHours[this.tempStartPickerIndex[0]];
					this.tempMinutes = this.getTempMinutesForHour(h);
					if (this.tempStartPickerIndex[2] >= this.tempMinutes.length) this.tempStartPickerIndex[2] = 0;
				}
			},
			// —— 开始时间选择（与创建页相同约束） ——
			isTodaySelected() {
				if (!this.selectedDate) return false;
				const today = this.formatDate(new Date());
				return this.selectedDate === today;
			},
			getMinStartForSelectedDate() {
				if (this.isTodaySelected()) {
					const now = new Date();
					const hh = String(now.getHours()).padStart(2, '0');
					const mm = String(now.getMinutes()).padStart(2, '0');
					return `${hh}:${mm}`;
				}
				return '00:00';
			},
			rebuildStartColumns() {
				const minStart = this.getMinStartForSelectedDate();
				const [minH, minM] = minStart.split(':').map(s => parseInt(s, 10));
				// 小时列
				this.hours = Array.from({ length: 24 - minH }, (_, i) => String(minH + i).padStart(2, '0'));
				// 当前选中小时
				const currentHour = this.hours[Math.max(0, Math.min(this.startPickerIndex[0], this.hours.length - 1))] || String(minH).padStart(2, '0');
				// 分钟列
				this.minutes = this.getStartMinutesForHour(currentHour);
				// 调整索引
				let hIdx = this.hours.indexOf(currentHour);
				if (hIdx < 0) hIdx = 0;
				let mIdx = Math.max(0, Math.min(this.startPickerIndex[2] || 0, this.minutes.length - 1));
				this.startPickerIndex = [hIdx, 0, mIdx];
			},
			getStartMinutesForHour(h) {
				const minStart = this.getMinStartForSelectedDate();
				const [minH, minM] = minStart.split(':').map(s => parseInt(s, 10));
				const hourNum = parseInt(h, 10);
				if (hourNum === minH) {
					return Array.from({ length: 60 - minM }, (_, i) => String(minM + i).padStart(2, '0'));
				}
				return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
			},
			onStartTimeMultiChange(e) {
				const [hIdx, _uh, mIdx] = e.detail.value;
				this.startPickerIndex = [hIdx, 0, mIdx];
				const h = this.hours[hIdx];
				const m = this.minutes[mIdx];
				this.selectedStartTime = `${h}:${m}`;
			},
			onStartTimeMultiColumnChange(e) {
				const { column, value } = e.detail;
				const idx = [...this.startPickerIndex];
				if (column === 0) idx[0] = value;
				if (column === 2) idx[2] = value;
				this.startPickerIndex = idx;
				// 联动分钟列
				if (column === 0) {
					const h = this.hours[this.startPickerIndex[0]];
					this.minutes = this.getStartMinutesForHour(h);
					if (this.startPickerIndex[2] >= this.minutes.length) {
						this.startPickerIndex[2] = 0;
					}
				}
			},
			formatDate(d) {
				const y = d.getFullYear();
				const m = (d.getMonth() + 1).toString().padStart(2, '0');
				const da = d.getDate().toString().padStart(2, '0');
				return `${y}-${m}-${da}`;
			},
			compareTime(a, b) {
				const toMin = (t) => {
					const [h, m] = String(t).split(':');
					return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
				};
				return toMin(a) - toMin(b);
			},
			async loadActivities() {
				try {
					console.log('开始加载活动数据...');
					this.loading = true;
					uni.showLoading({ title: '加载中...' });
					
					// 添加时间戳参数避免缓存
					const timestamp = new Date().getTime();
					
					const res = await uniCloud.callFunction({
						name: 'getActivities',
						data: { _t: timestamp }, // 添加时间戳参数
						timeout: 10000
					});
					
					console.log('获取到的活动数据:', res);
					
					if (res.result.code === 0) {
						// 确保每个活动都有唯一的ID
						this.activityList = res.result.data.map(activity => ({
							...activity,
							id: activity.id || activity._id // 确保有id字段
						}));
						// 生成日期选项（去重排序）
						const dates = Array.from(new Set(this.activityList.map(a => a.date).filter(Boolean)));
						try { dates.sort(); } catch(_) {}
						this.dateOptions = dates;
						// 地区选项固定为创建页的选项，保持一致，不在此处动态覆盖
						
						console.log('成功加载活动数据，数量:', this.activityList.length);
					} else {
						throw new Error(res.result.message || '加载活动失败');
					}
				} catch (err) {
					console.error('加载活动错误:', err);
					uni.showToast({ 
						title: '加载失败: ' + (err.message || '网络错误'), 
						icon: 'none',
						duration: 3000
					});
				} finally {
					this.loading = false;
					this.refreshing = false;
					uni.hideLoading();
					// 停止下拉刷新动画
					uni.stopPullDownRefresh();
				}
			},
			onAreaChange(e) {
				this.selectedAreaIndex = Number(e.detail.value);
				console.log('选择的地区索引:', this.selectedAreaIndex, '值:', this.areas[this.selectedAreaIndex]);
			},
			viewDetail(e) {
                const dataset = e && e.currentTarget ? e.currentTarget.dataset || {} : {};
                console.log('查看详情点击，dataset:', dataset);
                const idFromDataset = dataset.id;
                let activity = null;
                if (idFromDataset) {
                    // 优先通过 id 在完整列表中查找，避免筛选/排序导致索引错位
                    activity = this.activityList.find(a => (a.id || a._id) === idFromDataset) || null;
                }
                if (!activity) {
                    // 回退：通过当前展示列表索引
                    const idx = typeof dataset.index !== 'undefined' ? Number(dataset.index) : undefined;
                    activity = typeof idx !== 'undefined' ? this.displayedActivities[idx] : null;
                }
                if (!activity) {
                    console.error('错误：活动数据为空', activity);
                    uni.showToast({ 
                        title: '活动数据无效', 
                        icon: 'none',
                        duration: 2000
                    });
                    return;
                }
                const id = activity.id || activity._id;
                if (!id) {
                    console.error('错误：活动缺少 id/_id', activity);
                    uni.showToast({ 
                        title: '活动数据缺少id', 
                        icon: 'none',
                        duration: 2000
                    });
                    return;
                }
                const url = `/pages/detailActivity/detailActivity?id=${encodeURIComponent(id)}`;
                console.log('跳转详情页，参数:', { id, url });
                uni.navigateTo({
                    url,
                    success: (res) => {
                        try {
                            // 通过 eventChannel 传递完整活动数据，详情页可立即渲染
                            res.eventChannel && res.eventChannel.emit && res.eventChannel.emit('activityPrefill', { activity });
                        } catch (e) {
                            console.warn('eventChannel 传递活动数据失败，不影响跳转:', e);
                        }
                    },
                    fail: (err) => {
                        console.error('跳转失败:', err);
                        uni.showToast({ 
                            title: '跳转页面失败', 
                            icon: 'none',
                            duration: 2000
                        });
                    }
                });
            },
			createActivity() {
				console.log("创建新活动按钮被点击");
				uni.navigateTo({
					url: '/pages/createActivity/createActivity',
					fail: (err) => {
						console.error("跳转失败:", err);
						uni.showToast({
							title: '跳转失败，请检查页面是否存在',
							icon: 'none'
						});
					}
				});
			},
			resetFilters() {
				this.selectedDate = null;
				this.selectedTime = null;
				this.selectedAreaIndex = null;
				this.searchQuery = '';
				uni.showToast({
					title: '已清除筛选条件',
					icon: 'success'
				});
			},
			async loadActivityDetail() {
				try {
					const res = await uniCloud.callFunction({
						name: 'getActivityDetail',
						data: { id: this.activityId },
					});
					console.log('云函数返回数据:', res.result); // 重点检查这里
					if (res.result.code === 0) {
						this.activityData = { ...this.activityData, ...res.result.data };
					} else {
						throw new Error(res.result.message || '数据加载失败');
					}
				} catch (err) {
					console.error('详情加载失败:', err);
				}
			}
		}
	}
</script>

<style>
	/* 搜索 */
	.search-container {
		padding: 0 0 8rpx;
		margin: 0 20rpx 8rpx 20rpx;
	}
	.search-input {
		height: 70rpx;
		width: 100%;
		padding: 0 24rpx;
		border: 1rpx solid #e0e0e0;
		border-radius: 32rpx;
		font-size: 28rpx;
		background-color: #fff;
		box-sizing: border-box;
	}

	/* 工具栏 */
	.toolbar {
		display: flex;
		justify-content: flex-start; /* 左对齐 */
		margin: 0 20rpx 12rpx 20rpx; /* 与搜索框左右留白一致 */
		padding: 0; /* 避免内边距导致不对齐 */
	}
	.filter-toggle {
		display: inline-flex;
		align-items: center;
		gap: 10rpx;
		background-color: #fff;
		border: 1rpx solid #e0e0e0;
		border-radius: 24rpx;
		padding: 8rpx 20rpx;
		font-size: 26rpx;
		color: #333;
		margin: 0; /* 去除默认按钮外边距 */
	}
	.filter-icon { width: 32rpx; height: 32rpx; }
	.filter-text { line-height: 32rpx; }

	/* 抽屉遮罩 */
	.drawer-mask {
		position: fixed;
		left: 0; right: 0; top: 0; bottom: 0;
		background: rgba(0,0,0,0.35);
		z-index: 10000; /* 高于自定义 tabbar */
	}

	/* 抽屉容器 */
	.filter-drawer {
		position: fixed;
		top: 0; bottom: 0; left: -75%;
		width: 75%;
		background: #fff;
		z-index: 10001; /* 高于遮罩与 tabbar */
		box-shadow: 4rpx 0 20rpx rgba(0,0,0,0.08);
		transition: left 0.25s ease;
		display: flex;
		flex-direction: column;
	}
	.filter-drawer.show { left: 0; }

	.drawer-header {
		padding: 28rpx 24rpx;
		font-size: 32rpx;
		font-weight: 600;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.drawer-body {
		flex: 1;
		display: flex;
		min-height: 0;
	}

	.drawer-left {
		width: 32%;
		border-right: 1rpx solid #f5f5f5;
		background: #fafafa;
	}
	.drawer-tab {
		padding: 24rpx;
		font-size: 28rpx;
		color: #666;
	}
	.drawer-tab.active {
		background: #fff;
		color: #007AFF;
		font-weight: 600;
	}

	.drawer-right {
		flex: 1;
		padding: 16rpx;
		overflow-y: auto;
	}
	.option-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
	/* 纵向排列用于日期“不限/选择” */
	.option-list.option-list-column {
		flex-direction: column;
		flex-wrap: nowrap;
		gap: 16rpx;
	}
	.option-item {
		padding: 14rpx 22rpx;
		border: 1rpx solid #e0e0e0;
		border-radius: 24rpx;
		font-size: 26rpx;
		color: #333;
		background: #fff;
	}
	.option-item.selected {
		border-color: #007AFF;
		color: #007AFF;
		background: #E6F0FF;
	}

	.drawer-actions {
		display: flex;
		gap: 16rpx;
		padding: 12rpx 16rpx calc(24rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
		border-top: 1rpx solid #f0f0f0;
	}
	.btn-clear {
		flex: 1;
		background: #f5f5f5;
		color: #666;
		border-radius: 8rpx;
		padding: 18rpx 0;
		font-size: 28rpx;
	}
	.btn-ok {
		flex: 1;
		background: #007AFF;
		color: #fff;
		border-radius: 8rpx;
		padding: 18rpx 0;
		font-size: 28rpx;
	}
	.filter-container {
		padding: 20rpx;
		margin: 20rpx;
		margin-right: 20rpx;
		background-color: #f8f8f8;
		border-bottom: 1rpx solid #eee;
		border-radius: 16rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
		display: block;
		padding-bottom: 20rpx;
	}
	.picker {
		padding: 15rpx 20rpx;
		background-color: white;
		border: 1rpx solid #e0e0e0;
		border-radius: 12rpx;
		width: 100%;
		font-size: 28rpx;
		color: #333;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 15rpx;
	}
	.picker:last-child {
		margin-bottom: 0;
	}
	.activities-container {
		padding: 20rpx;
		padding-right: 20rpx;
		padding-bottom: 100rpx;
		background-color: #f5f7fa;
	}

	.activity-card {
		width: calc(100% - 40rpx);
		margin-right: 20rpx;
		padding: 25rpx;
		margin-bottom: 25rpx;
		border: 1rpx solid #e8e8e8;
		border-radius: 16rpx;
		position: relative;
		background-color: white;
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
	}

	.activity-info {
		display: flex;
		flex-direction: column;
		margin-bottom: 50rpx;
	}

	.activity-name {
		font-size: 34rpx;
		font-weight: bold;
		margin-bottom: 12rpx;
		color: #333;
	}

	.activity-location {
		font-size: 28rpx;
		color: #666;
		margin-bottom: 12rpx;
	}

	.activity-time {
		font-size: 26rpx;
		color: #888;
		margin-bottom: 12rpx;
	}

	.activity-count {
		font-size: 26rpx;
		color: #888;
	}

	.detail-button {
		position: absolute;
		right: 20rpx;
		bottom: 20rpx;
		background-color: #007AFF;
		color: white;
		border-radius: 10rpx;
		padding: 8rpx 20rpx;
		font-size: 26rpx;
		box-shadow: 0 2rpx 6rpx rgba(0, 122, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* 空状态提示 */
	.empty-tips {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 200rpx;
		color: #999;
		font-size: 28rpx;
	}

	.reset-button {
		margin-top: 15rpx;
		height: 80rpx;
		background-color: #f8f8f8;
		color: #666;
		border: 1rpx solid #e0e0e0;
		border-radius: 12rpx;
		font-size: 28rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.reset-button:active {
		background-color: #eee;
	}

	
	.reset-button[disabled] {
		opacity: 0.5;
		background-color: #f8f8f8;
	}
	/* 下拉刷新样式 */
	.refresh-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20rpx 0;
		font-size: 28rpx;
		color: #999;
	}
	
	.refresh-text {
		display: flex;
		align-items: center;
	}
	
	/* 空状态提示 */
	.empty-tips {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 200rpx;
		color: #999;
		font-size: 28rpx;
	}
	
	/* 活动卡片样式 */
	.activity-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: #fff;
		border-radius: 12rpx;
		padding: 24rpx;
		margin-bottom: 24rpx;
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
	}
	
	.activity-info {
		flex: 1;
	}
	
	.activity-name {
		display: block;
		font-size: 32rpx;
		font-weight: bold;
		margin-bottom: 8rpx;
		color: #333;
	}
	
	.activity-location,
	.activity-time,
	.activity-count {
		display: block;
		font-size: 26rpx;
		color: #666;
		margin-top: 6rpx;
	}
	
	.detail-button {
		background-color: #007AFF;
		color: #fff;
		font-size: 26rpx;
		padding: 10rpx 24rpx;
		border-radius: 30rpx;
		margin-left: 20rpx;
	}
	
	/* 筛选区域样式 */
	.filter-container {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		justify-content: space-between;
		padding: 12rpx 0;
		margin-bottom: 20rpx;
	}

	.picker {
		background-color: #fff;
		padding: 12rpx 18rpx;
		border-radius: 8rpx;
		font-size: 26rpx;
		color: #333;
		flex: 1 1 30%;
		min-width: 30%;
		width: auto; /* 覆盖上方的 width:100% */
		margin: 0;
		box-sizing: border-box;
	}

	.reset-button {
		background-color: #f8f8f8;
		color: #666;
		font-size: 26rpx;
		padding: 0 20rpx;
		height: 64rpx;
		line-height: 64rpx;
		border-radius: 32rpx;
		flex: 1 1 30%;
		min-width: 30%;
		margin: 0;
		box-sizing: border-box;
	}
	
	.reset-button[disabled] {
		opacity: 0.5;
	}

	/* 类别标签样式 */
	.category-row {
		margin: 4rpx 0 10rpx 0;
	}

	.category-tag {
		display: inline-block;
		padding: 6rpx 16rpx;
		font-size: 22rpx;
		font-weight: 600;
		line-height: 1;
		color: #0A84FF; /* 与背景形成对比的主色 */
		background-color: rgba(10, 132, 255, 0.12); /* 半透明背景 */
		border: 1rpx solid rgba(10, 132, 255, 0.35);
		border-radius: 28rpx; /* 胶囊形状 */
		backdrop-filter: saturate(140%) blur(2rpx);
		/* 使标签不占满整行，更贴近名称下方 */
		align-self: flex-start;
		transform: translateX(-5px);
	}
</style>