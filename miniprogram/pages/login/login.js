// pages/login/login.js - 登录页面
const app = getApp();
const { showToast, showModal } = require('../../utils/common');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    openid: '',
    role: 'owner', // owner 或 property
    nickname: '',
    plateNumber: '', // 业主车牌号
    isLoading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否已登录
    if (app.globalData.isLoggedIn) {
      // 已登录，跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 确保自定义导航栏的选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
    }
  },

  /**
   * 车牌号输入
   */
  onPlateInput(e) {
    this.setData({
      plateNumber: e.detail.value
    });
  },

  /**
   * 角色切换
   */
  onRoleChange(e) {
    this.setData({
      role: e.detail.value
    });
  },

  /**
   * 登录按钮点击
   */
  async onLogin() {
    if (this.data.isLoading) {
      return;
    }

    // 微信登录
    try {
      this.setData({ isLoading: true });
      wx.showLoading({ title: '登录中...', mask: true });

      // 获取 openid
      const openid = await app.wxLogin();

      // 更新页面数据
      this.setData({
        openid: openid
      });

      // 跳转到首页
      wx.hideLoading();
      wx.switchTab({
        url: '/pages/index/index'
      });
    } catch (err) {
      wx.hideLoading();
      console.error('登录失败:', err);
      showToast('登录失败，请重试');
    } finally {
      this.setData({ isLoading: false });
    }
  },

  /**
   * 刷新页面
   */
  onRefresh() {
    wx.startPullDownRefresh();
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    // 重新检查登录状态
    app.checkLoginStatus().then(() => {
      wx.stopPullDownRefresh();
      if (app.globalData.isLoggedIn) {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  }
});
