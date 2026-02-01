// app.js - 应用入口
const ENV_CONFIG = require('./config/env.js')
const cache = require('./utils/cache.js')

App({
  // 全局数据
  globalData: {
    userInfo: null,      // 用户信息
    openid: '',          // 用户openid
    isLoggedIn: false,   // 登录状态
    db: null             // 数据库实例
  },

  /**
   * 获取数据库实例
   */
  getDB() {
    if (!this.globalData.db) {
      this.globalData.db = wx.cloud.database()
    }
    return this.globalData.db
  },

  /**
   * 应用启动
   */
  onLaunch() {
    console.log('邻里车位 - 启动')

    // 初始化云开发
    if (!wx.cloud) {
      console.error('当前微信版本不支持云开发')
      return
    }

    wx.cloud.init({
      env: ENV_CONFIG.CLOUD_ENV,
      traceUser: true
    })

    // 初始化数据库
    this.globalData.db = wx.cloud.database()

    // 检查登录状态
    this.checkLoginStatus()
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const userInfo = cache.get('userInfo')
    const openid = cache.get('openid')

    if (userInfo && openid) {
      this.globalData.userInfo = userInfo
      this.globalData.openid = openid
      this.globalData.isLoggedIn = true
      console.log('用户已登录:', userInfo.nickname)
    }
  },

  /**
   * 微信登录
   */
  login() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        data: {}
      }).then(res => {
        const { openid, userId, userData } = res.result

        // 保存到全局
        this.globalData.openid = openid
        this.globalData.userInfo = userData
        this.globalData.isLoggedIn = true

        // 保存到本地缓存
        cache.set('openid', openid)
        cache.set('userInfo', userData)

        resolve({ openid, userId, userData })
      }).catch(err => {
        console.error('登录失败:', err)
        reject(err)
      })
    })
  },

  /**
   * 退出登录
   */
  logout() {
    this.globalData.userInfo = null
    this.globalData.openid = ''
    this.globalData.isLoggedIn = false

    cache.remove('openid')
    cache.remove('userInfo')

    wx.reLaunch({
      url: '/pages/home/index'
    })
  }
})
