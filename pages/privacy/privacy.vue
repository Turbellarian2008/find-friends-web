<template>
  <scroll-view class="page" scroll-y>
    <view class="content">
      <view class="title">隐私政策</view>
      <view class="update-time">版本：1.0.0｜更新日期：2025-08-15</view>

      <view class="section">
        <view class="section-title">一、引言</view>
        <view class="p">我们非常重视您的个人信息与隐私保护。本隐私政策将帮助您了解我们如何收集、使用、存储、共享和保护您的个人信息，以及您如何管理您的个人信息。</view>
      </view>

      <view class="section">
        <view class="section-title">二、我们收集的信息及用途</view>
        <view class="p">1. 账号信息：您在注册时提交的用户名、密码，用于创建账户与身份认证。</view>
        <view class="p">2. 使用信息：您在使用小程序过程中产生的操作记录（如创建/加入活动），用于实现核心功能并优化体验。</view>
        <view class="p">3. 设备信息：为保障运行安全与统计分析，可能收集设备型号、操作系统、网络信息等。</view>
      </view>

      <view class="section">
        <view class="section-title">三、Cookie/本地存储</view>
        <view class="p">我们可能在本地使用存储（如 `uni.setStorageSync`）保存必要信息（如登录态），以便为您提供更便捷的服务。您可在设置中清除本地数据，但可能影响使用体验。</view>
      </view>

      <view class="section">
        <view class="section-title">四、信息的共享、转让与公开披露</view>
        <view class="p">我们不会与任何公司、组织和个人共享、转让或公开披露您的个人信息，但以下情形除外：遵守法律法规、履行法定职责或经您事先授权同意。</view>
      </view>

      <view class="section">
        <view class="section-title">五、信息的存储与保护</view>
        <view class="p">我们在合理可行的范围内采取安全防护措施保护您的信息，防止数据泄露、损坏或丢失。密码以不可逆的加密方式存储。</view>
      </view>

      <view class="section">
        <view class="section-title">六、您的权利</view>
        <view class="p">您有权查询、更正或删除您的个人信息，并可撤回授权或注销账户。我们将在符合法律法规的前提下响应您的请求。</view>
      </view>

      <view class="section">
        <view class="section-title">七、未成年人保护</view>
        <view class="p">若您为未成年人，请在监护人指导下使用本小程序并在同意本政策前征得监护人同意。</view>
      </view>

      <view class="section">
        <view class="section-title">八、政策更新</view>
        <view class="p">我们可能适时更新本隐私政策。更新后将以在本页面提示的方式通知您。重大变更会提供更为显著的通知。</view>
      </view>

      <view class="section">
        <view class="section-title">九、联系我们</view>
        <view class="p">如对本政策有任何疑问或建议，请通过“设置-反馈”或项目维护者提供的联系方式与我们取得联系。</view>
      </view>

      <view class="footer">感谢您的信任与使用。</view>
    </view>
  </scroll-view>
</template>

<script>
export default {
  data() {
    return {}
  }
}
</script>

<style>
.page { height: 100vh; }
.content { padding: 32rpx; color: #333; }
.title { font-size: 40rpx; font-weight: 600; text-align: center; margin-bottom: 12rpx; }
.update-time { font-size: 24rpx; color: #999; text-align: center; margin-bottom: 28rpx; }
.section { margin-bottom: 28rpx; }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 12rpx; }
.p { font-size: 26rpx; line-height: 1.7; color: #444; }
.footer { text-align: center; color: #666; font-size: 24rpx; margin-top: 20rpx; }
.privacy-link { color: #007AFF; }
</style>
