Component({
  data: {
    safeBottom: 0,
    icons: {
      home: '/static/icons/首页.png',
      create: '/static/icons/创建活动.png',
      me: '/static/icons/个人中心.png',
      meActive: '/static/icons/个人中心-选中.png'
    }
  },
  methods: {
    // 仅用于避免重复跳转
    // 根据当前路由解析所在 tab 索引
    _getIndexByRoute(route) {
      const r = String(route || '');
      if (r.indexOf('pages/index/index') === 0) return 0;
      if (r.indexOf('pages/createActivity/createActivity') === 0) return 1;
      if (r.indexOf('pages/user/user') === 0) return 2;
      return -1;
    },
    switchTab(e) {
      const idx = Number(e.currentTarget.dataset.index);
      // 若当前已在目标 tab，避免重复跳转
      try {
        const pages = getCurrentPages();
        const current = pages && pages.length ? pages[pages.length - 1] : null;
        const currentIdx = this._getIndexByRoute(current && current.route);
        if (currentIdx === idx) {
          return; // 已在该页，避免反复跳转
        }
      } catch (_) {}
      // 直接跳转
      if (idx === 0) {
        wx.switchTab({ url: '/pages/index/index' });
      } else if (idx === 1) {
        wx.switchTab({ url: '/pages/createActivity/createActivity' });
      } else if (idx === 2) {
        wx.switchTab({ url: '/pages/user/user' });
      }
      
    }
  },
  lifetimes: {
    attached() {
      // 计算安全区底部内边距
      try {
        const info = wx.getSystemInfoSync();
        const safe = (info && info.safeAreaInsets) ? info.safeAreaInsets.bottom : 0;
        this.setData({ safeBottom: safe || 0 });
      } catch (_) {}
    }
  },
  
});
