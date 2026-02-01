// app.js - 共享车位小程序主入口
const utils = require('./utils/common');
const ENV_CONFIG = require('./config/env');

App({
  // 全局数据
  globalData: {
    openid: '',
    userInfo: null,
    role: 'owner', // owner 或 property
    db: null, // 云数据库实例
    isLoggedIn: false
  },

  /**
   * 全局函数获取器 - 提供安全的函数调用方式
   */
  getDB() {
    return wx.cloud ? wx.cloud.database() : null;
  },

  getUtils() {
    return utils;
  },

  /**
   * 初始化应用
   */
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: ENV_CONFIG.CLOUD_ENV,
        traceUser: true
      });

      const db = this.getDB();

      // 初始化全局数据
      this.globalData.db = db;
      this.globalData.utils = utils;
      this.globalData.isLoggedIn = !!wx.getStorageSync('openid');
      this.globalData.openid = wx.getStorageSync('openid') || '';

      // 加载本地缓存的用户信息
      const cachedUserInfo = wx.getStorageSync('userInfo');
      if (cachedUserInfo) {
        this.globalData.userInfo = cachedUserInfo;
      }

      // 检查登录状态
      this.checkLoginStatus();
    } else {
      console.error('云开发未初始化');
    }
  },

  /**
   * 检查登录状态（静默登录）
   * 使用 wx.checkSession 检测会话有效性
   */
  async checkLoginStatus() {
    try {
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        return;
      }

      // 检查会话是否有效
      wx.checkSession({
        success: async () => {
          // 会话有效，加载用户信息
          this.globalData.openid = openid;
          this.globalData.isLoggedIn = true;

          await this.loadUserInfo(openid);
        },
        fail: () => {
          // 会话过期，清除本地数据
          this.clearLoginData();
        }
      });
    } catch (err) {
      console.error('检查登录状态失败:', err);
    }
  },

  /**
   * 从数据库加载用户信息
   */
  async loadUserInfo(openid) {
    try {
      const userRes = await this.globalData.db
        .collection('users')
        .where({ openid: openid })
        .get();

      if (userRes.data.length > 0) {
        this.globalData.userInfo = userRes.data[0];
        this.globalData.role = userRes.data[0].role || 'owner';

        // 同步到本地缓存
        wx.setStorageSync('userInfo', userRes.data[0]);
      }
    } catch (err) {
      console.error('加载用户信息失败:', err);
    }
  },

  /**
   * 清除登录数据
   */
  clearLoginData() {
    this.globalData.openid = '';
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('openid');
    wx.removeStorageSync('userInfo');
  },

  /**
   * 微信登录（静默获取 openid）
   * 不再需要传递 code，云函数直接使用 cloud.getOpenId()
   */
  wxLogin() {
    return new Promise((resolve, reject) => {
      // 先检查会话是否有效
      wx.checkSession({
        success: () => {
          const openid = wx.getStorageSync('openid');
          if (openid) {
            resolve(openid);
            return;
          }
          // 会话有效但没有 openid，继续登录流程
          this.doLogin(resolve, reject);
        },
        fail: () => {
          // 会话过期，重新登录
          this.doLogin(resolve, reject);
        }
      });
    });
  },

  /**
   * 执行登录流程
   */
  doLogin(resolve, reject) {
    wx.login({
      success: async (res) => {
        if (res.code) {
          try {
            // 调用云函数获取 openid
            const loginRes = await wx.cloud.callFunction({
              name: 'login',
              data: {}
            });

            if (loginRes.result && loginRes.result.openid) {
              // 保存 openid
              wx.setStorageSync('openid', loginRes.result.openid);
              this.globalData.openid = loginRes.result.openid;
              this.globalData.isLoggedIn = true;

              // 加载用户信息（如果存在）
              await this.loadUserInfo(loginRes.result.openid);

              resolve(loginRes.result.openid);
            } else {
              reject(new Error('获取 openid 失败'));
            }
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error('获取 code 失败'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  },

  /**
   * 保存或更新用户信息
   * 使用新的字段：nickname, avatar_url
   */
  async saveUserInfo(openid, nickname, avatarUrl) {
    const db = this.globalData.db;

    try {
      // 查询用户是否存在
      const userRes = await db.collection('users')
        .where({ openid: openid })
        .get();

      const userInfo = {
        nickname: nickname,
        avatar_url: avatarUrl || '', // 允许头像为空
        update_time: new Date().getTime()
      };

      if (userRes.data.length === 0) {
        // 创建新用户
        const newUser = {
          openid: openid,
          role: 'owner', // 默认为业主
          nickname: nickname,
          avatar_url: avatarUrl || '',
          create_time: new Date().getTime(),
          update_time: new Date().getTime()
        };

        // 保存到数据库
        const addRes = await db.collection('users').add({
          data: newUser
        });

        newUser._id = addRes._id;
        this.globalData.userInfo = newUser;
      } else {
        // 更新现有用户信息
        await db.collection('users')
          .doc(userRes.data[0]._id)
          .update({
            data: userInfo
          });

        // 合并更新后的用户信息
        this.globalData.userInfo = {
          ...userRes.data[0],
          ...userInfo
        };
      }

      // 同步到本地缓存
      wx.setStorageSync('userInfo', this.globalData.userInfo);

      return this.globalData.userInfo;
    } catch (err) {
      console.error('保存用户信息失败:', err);
      throw err;
    }
  },

  /**
   * 跳转到登录页面
   */
  navigateToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  /**
   * 退出登录
   */
  logout() {
    this.clearLoginData();
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
});
