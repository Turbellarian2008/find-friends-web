<script>
    export default {
		onLaunch: function() {
			console.log('App Launch');
			
			// 检查登录状态
			this.checkLoginStatus();
		},
		onShow: function() {
			console.log('App Show');
		},
		onHide: function() {
			console.log('App Hide');
		},
		methods: {
			// 检查登录状态（仅通过本地 userInfo 判定）
			checkLoginStatus() {
				const userInfo = uni.getStorageSync('userInfo');
				console.log('检查登录状态:', { hasUserInfo: !!userInfo });
				
				// 仅当没有 userInfo 时，跳转到登录页
				if (!userInfo) {
					// 获取当前页面栈
					const pages = getCurrentPages();
					const currentPage = pages[pages.length - 1];
					const route = currentPage ? currentPage.route : '';
					
					// 排除不需要登录的页面
					const whiteList = ['pages/login/login', 'pages/register/register'];
					if (route && !whiteList.includes(route)) {
						uni.reLaunch({
							url: '/pages/login/login'
						});
					}
				}
			}
		}
	}
</script>

<style>
	/* 全局样式 */
	page {
		font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, 
				 Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
		background-color: #f5f5f5;
		color: #333;
		font-size: 28rpx;
		line-height: 1.6;
	}
	
	/* 按钮样式 */
	button {
		border-radius: 8rpx;
		font-size: 28rpx;
	}
	
	button[type="primary"] {
		background-color: #007AFF;
	}
	
	button[disabled] {
		opacity: 0.6;
	}
	
	/* 输入框样式 */
	.uni-input, .uni-textarea {
		background-color: #fff;
		border: 1px solid #e5e5e5;
		border-radius: 8rpx;
		padding: 20rpx 24rpx;
		font-size: 28rpx;
	}
	
	.uni-input-placeholder, .uni-textarea-placeholder {
		color: #999;
	}
	
	/* 通用边距 */
	.mt-20 { margin-top: 20rpx; }
	.mb-20 { margin-bottom: 20rpx; }
	.ml-20 { margin-left: 20rpx; }
	.mr-20 { margin-right: 20rpx; }
	
	/* 文本对齐 */
	.text-center { text-align: center; }
	.text-right { text-align: right; }
	.text-left { text-align: left; }
	
	/* 文本颜色 */
	.text-primary { color: #007AFF; }
	.text-success { color: #67C23A; }
	.text-warning { color: #E6A23C; }
	.text-danger { color: #F56C6C; }
	.text-info { color: #909399; }
	.text-muted { color: #909399; }
	
	/* 背景色 */
	.bg-white { background-color: #fff; }
	.bg-grey { background-color: #f8f8f8; }
	
	/* 布局 */
	.flex {
		display: flex;
	}
	
	.flex-1 {
		flex: 1;
	}
	
	.items-center {
		align-items: center;
	}
	
	.justify-between {
		justify-content: space-between;
	}
	
	.justify-center {
		justify-content: center;
	}
	
	/* 卡片样式 */
	.card {
		background-color: #fff;
		border-radius: 12rpx;
		padding: 24rpx;
		margin-bottom: 24rpx;
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
	}
	
	/* 分割线 */
	.divider {
		height: 1px;
		background-color: #eee;
		margin: 24rpx 0;
	}
</style>
