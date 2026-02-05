// app.js - 应用入口
const ENV_CONFIG = require('./config/env.js')
const cache = require('./utils/cache.js')
const pointsService = require('./services/pointsService.js')

App({
  // 全局数据
  globalData: {
    userInfo: null,      // 用户信息
    openid: '',          // 用户openid
    isLoggedIn: false,   // 登录状态
    db: null,            // 数据库实例
    cloudReady: false    // 云开发是否就绪
  },

  /**
   * 获取数据库实例
   */
  getDB() {
    if (!this.globalData.db) {
      if (!this.globalData.cloudReady) {
        console.warn('云开发尚未初始化')
        return null
      }
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

    try {
      wx.cloud.init({
        env: ENV_CONFIG.CLOUD_ENV,
        traceUser: true
      })

      this.globalData.cloudReady = true
      console.log('云开发初始化成功，环境ID:', ENV_CONFIG.CLOUD_ENV)

      // 初始化数据库
      this.globalData.db = wx.cloud.database()

      // 检查登录状态
      this.checkLoginStatus()
    } catch (err) {
      console.error('云开发初始化失败:', err)
      wx.showModal({
        title: '提示',
        content: '云开发初始化失败，请检查云环境配置',
        showCancel: false
      })
    }
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    try {
      const userInfo = cache.get('userInfo')
      const openid = cache.get('openid')

      if (userInfo && openid) {
        this.globalData.userInfo = userInfo
        this.globalData.openid = openid
        this.globalData.isLoggedIn = true
        console.log('用户已登录:', userInfo.nickname)
      }
    } catch (err) {
      console.error('检查登录状态失败:', err)
    }
  },

  /**
   * 微信登录
   */
  login() {
    return new Promise((resolve, reject) => {
      if (!this.globalData.cloudReady) {
        reject(new Error('云开发尚未初始化'))
        return
      }

      wx.cloud.callFunction({
        name: 'login',
        data: {}
      }).then(async res => {
        if (res.result && res.result.success) {
          const { openid, userId, userData } = res.result

          // 保存到全局
          this.globalData.openid = openid
          this.globalData.userInfo = userData
          this.globalData.isLoggedIn = true

          // 保存到本地缓存
          cache.set('openid', openid)
          cache.set('userInfo', userData)

          // 初始化用户积分
          try {
            await pointsService.initUserPoints()
          } catch (err) {
            console.error('初始化积分失败:', err)
            // 不阻塞登录流程
          }

          resolve({ openid, userId, userData })
        } else {
          reject(new Error(res.result?.message || '登录失败'))
        }
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
    try {
      // 清除全局数据
      this.globalData.userInfo = null
      this.globalData.openid = ''
      this.globalData.isLoggedIn = false

      // 清除本地缓存
      cache.remove('openid')
      cache.remove('userInfo')

      // 重定向到首页
      wx.reLaunch({
        url: '/pages/home/index',
        fail: (err) => {
          console.error('页面跳转失败:', err)
        }
      })
    } catch (err) {
      console.error('退出登录失败:', err)
    }
  }
})
