// pages/login/login.js - 登录页面
const app = getApp();
const { showToast, showModal, showLoading, hideLoading } = require('../../utils/common');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    avatarUrl: '', // 用户头像（临时路径）
    nickname: '', // 用户昵称
    isLoading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否已登录
    if (app.globalData.isLoggedIn && app.globalData.userInfo) {
      // 已登录，跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      });
      return;
    }

    // 尝试加载本地缓存的用户信息
    const cachedUserInfo = wx.getStorageSync('userInfo');
    if (cachedUserInfo) {
      this.setData({
        avatarUrl: cachedUserInfo.avatar_url || '',
        nickname: cachedUserInfo.nickname || ''
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
   * 选择头像
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ avatarUrl });
  },

  /**
   * 输入昵称
   */
  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value.trim()
    });
  },

  /**
   * 微信登录
   */
  async onLogin() {
    // 验证输入
    if (!this.data.avatarUrl) {
      showToast('请选择头像');
      return;
    }
    if (!this.data.nickname || this.data.nickname.length < 1) {
      showToast('请输入昵称');
      return;
    }

    if (this.data.isLoading) {
      return;
    }

    try {
      this.setData({ isLoading: true });
      showLoading('登录中...');

      // 1. 静默登录获取 openid（如果已登录会直接返回）
      const openid = await app.wxLogin();

      if (!openid) {
        throw new Error('登录失败，请重试');
      }

      // 2. 上传头像到云存储
      const cloudAvatarUrl = await this.uploadAvatar(openid);

      // 3. 保存用户信息到数据库（使用 app 提供的方法）
      await app.saveUserInfo(openid, this.data.nickname, cloudAvatarUrl);

      hideLoading();
      showToast('登录成功');

      // 4. 延迟后跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1000);
    } catch (err) {
      hideLoading();
      console.error('登录失败:', err);
      showToast(err.message || '登录失败，请重试');
    } finally {
      this.setData({ isLoading: false });
    }
  },

  /**
   * 上传头像到云存储
   */
  async uploadAvatar(openid) {
    try {
      // 从临时文件路径上传
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `avatars/${openid}_${Date.now()}.jpg`,
        filePath: this.data.avatarUrl
      });

      if (uploadRes.fileID) {
        // 云存储 fileID 可以直接使用
        return uploadRes.fileID;
      } else {
        throw new Error('上传头像失败');
      }
    } catch (err) {
      console.error('上传头像失败:', err);
      // 上传失败时返回空字符串，让前端使用默认头像
      showToast('头像上传失败');
      return '';
    }
  },

  /**
   * 稍后填写（静默登录）
   */
  async onSkip() {
    if (this.data.isLoading) {
      return;
    }

    try {
      this.setData({ isLoading: true });
      showLoading('登录中...');

      // 静默登录获取 openid
      const openid = await app.wxLogin();

      if (!openid) {
        throw new Error('登录失败，请重试');
      }

      hideLoading();
      showToast('登录成功');

      // 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1000);
    } catch (err) {
      hideLoading();
      console.error('登录失败:', err);
      showToast(err.message || '登录失败，请重试');
    } finally {
      this.setData({ isLoading: false });
    }
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
