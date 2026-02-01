// app.js - 共享车位小程序主入口
App({
  // 全局数据
  globalData: {
    openid: '',
    userInfo: null,
    role: 'owner', // owner 或 property
    db: null, // 云数据库实例
    utils: null, // 工具函数
    isLoggedIn: false
  },

  /**
   * 全局函数获取器 - 提供安全的函数调用方式
   */
  getDB() {
    return wx.cloud ? wx.cloud.database() : null;
  },

  getUtils() {
    return this.globalData.utils || {};
  },

  /**
   * 初始化应用
   */
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-4gu1xbu13e161c48', // 替换为您的云开发环境ID
        traceUser: true
      });

      const db = this.getDB();
      const utils = this.getUtils();

      // 初始化全局数据
      this.globalData.db = db;
      this.globalData.isLoggedIn = !!wx.getStorageSync('openid');
      this.globalData.openid = wx.getStorageSync('openid') || '';

      // 检查登录状态
      this.checkLoginStatus();
    } else {
      console.error('云开发未初始化');
    }
  },

  /**
   * 检查登录状态
   */
  async checkLoginStatus() {
    try {
      const openid = wx.getStorageSync('openid');
      if (openid) {
        this.globalData.openid = openid;
        this.globalData.isLoggedIn = true;

        // 检查用户角色
        const userRes = await this.globalData.db
          .collection('users')
          .where({ openid: openid })
          .get();

        if (userRes.data.length > 0) {
          this.globalData.userInfo = userRes.data[0];
          this.globalData.role = userRes.data[0].role || 'owner';
        }
      }
    } catch (err) {
      console.error('检查登录状态失败:', err);
    }
  },

  /**
   * 微信登录
   */
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: async (res) => {
          if (res.code) {
            try {
              // 调用云函数获取 openid
              const loginRes = await wx.cloud.callFunction({
                name: 'login',
                data: {
                  code: res.code
                }
              });

              if (loginRes.result && loginRes.result.openid) {
                // 保存 openid
                wx.setStorageSync('openid', loginRes.result.openid);
                this.globalData.openid = loginRes.result.openid;
                this.globalData.isLoggedIn = true;

                // 检查或创建用户
                await this.checkOrCreateUser(loginRes.result.openid);

                resolve(loginRes.result.openid);
              } else {
                reject(new Error('登录失败'));
              }
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error('获取code失败'));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  /**
   * 检查或创建用户
   */
  async checkOrCreateUser(openid) {
    const db = this.globalData.db;

    // 查询用户是否存在
    const userRes = await db.collection('users')
      .where({ openid: openid })
      .get();

    if (userRes.data.length === 0) {
      // 创建新用户
      await db.collection('users').add({
        data: {
          openid: openid,
          role: 'owner', // 默认为业主
          nickname: '业主',
          create_time: new Date().getTime()
        }
      });
    }
  },

  /**
   * 跳转到登录页面
   */
  navigateToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  }
});
