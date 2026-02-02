// miniprogram/app.spec.js - 应用核心功能单元测试

// Mock dependencies
jest.mock('./config/env.js', () => ({
  CLOUD_ENV: 'test-env-id'
}))

jest.mock('./utils/cache.js', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn()
}))

const cache = require('./utils/cache')

// 创建一个简化版本的 App 用于测试
function createApp() {
  const app = {
    globalData: {
      userInfo: null,
      openid: '',
      isLoggedIn: false,
      db: null,
      cloudReady: false
    },

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

    onLaunch() {
      console.log('邻里车位 - 启动')

      if (!wx.cloud) {
        console.error('当前微信版本不支持云开发')
        return
      }

      try {
        wx.cloud.init({
          env: 'test-env-id',
          traceUser: true
        })

        this.globalData.cloudReady = true
        console.log('云开发初始化成功，环境ID:', 'test-env-id')

        this.globalData.db = wx.cloud.database()

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

    login() {
      return new Promise((resolve, reject) => {
        if (!this.globalData.cloudReady) {
          reject(new Error('云开发尚未初始化'))
          return
        }

        wx.cloud.callFunction({
          name: 'login',
          data: {}
        }).then(res => {
          if (res.result && res.result.success) {
            const { openid, userId, userData } = res.result

            this.globalData.openid = openid
            this.globalData.userInfo = userData
            this.globalData.isLoggedIn = true

            cache.set('openid', openid)
            cache.set('userInfo', userData)

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

    logout() {
      try {
        this.globalData.userInfo = null
        this.globalData.openid = ''
        this.globalData.isLoggedIn = false

        cache.remove('openid')
        cache.remove('userInfo')

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
  }

  return app
}

describe('App Core Functionality', () => {
  let app

  beforeEach(() => {
    // 确保 wx.cloud 存在
    if (!wx.cloud) {
      wx.cloud = {
        init: jest.fn(),
        database: jest.fn(),
        callFunction: jest.fn()
      }
    }
    jest.clearAllMocks()
    app = createApp()
  })

  describe('onLaunch() - 应用启动', () => {
    test('应该成功初始化云开发', () => {
      wx.cloud.init.mockReturnValue(true)

      app.onLaunch()

      expect(wx.cloud.init).toHaveBeenCalledWith({
        env: 'test-env-id',
        traceUser: true
      })
      expect(app.globalData.cloudReady).toBe(true)
    })

    test('应该在云开发不支持时给出提示', () => {
      wx.cloud = null

      app.onLaunch()

      expect(app.globalData.cloudReady).toBe(false)
    })

    test('应该在初始化失败时显示错误', () => {
      wx.cloud.init = jest.fn(() => {
        throw new Error('Init failed')
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      app.onLaunch()

      expect(app.globalData.cloudReady).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    test('应该初始化后检查登录状态', () => {
      wx.cloud.init.mockReturnValue(true)
      cache.get.mockReturnValue(null)

      app.onLaunch()

      // 验证调用了 checkLoginStatus
      expect(cache.get).toHaveBeenCalledWith('userInfo')
      expect(cache.get).toHaveBeenCalledWith('openid')
    })
  })

  describe('checkLoginStatus() - 检查登录状态', () => {
    test('应该识别已登录用户', () => {
      const mockUserInfo = { nickname: 'TestUser', avatar: '' }
      const mockOpenid = 'test-openid-123'

      cache.get.mockImplementation((key) => {
        if (key === 'userInfo') return mockUserInfo
        if (key === 'openid') return mockOpenid
        return null
      })

      app.checkLoginStatus()

      expect(app.globalData.userInfo).toEqual(mockUserInfo)
      expect(app.globalData.openid).toBe(mockOpenid)
      expect(app.globalData.isLoggedIn).toBe(true)
    })

    test('应该识别未登录状态', () => {
      cache.get.mockReturnValue(null)

      app.checkLoginStatus()

      expect(app.globalData.userInfo).toBeNull()
      expect(app.globalData.openid).toBe('')
      expect(app.globalData.isLoggedIn).toBe(false)
    })

    test('应该处理缓存读取错误', () => {
      cache.get.mockImplementation(() => {
        throw new Error('Cache error')
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      app.checkLoginStatus()

      expect(consoleSpy).toHaveBeenCalled()
      expect(app.globalData.isLoggedIn).toBe(false)

      consoleSpy.mockRestore()
    })
  })

  describe('login() - 用户登录', () => {
    test('应该成功登录', async () => {
      app.globalData.cloudReady = true

      const mockResult = {
        success: true,
        openid: 'test-openid',
        userId: 'user-123',
        userData: {
          nickname: 'TestUser',
          avatar: ''
        }
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await app.login()

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'login',
        data: {}
      })

      expect(result.openid).toBe('test-openid')
      expect(app.globalData.openid).toBe('test-openid')
      expect(app.globalData.isLoggedIn).toBe(true)

      expect(cache.set).toHaveBeenCalledWith('openid', 'test-openid')
      expect(cache.set).toHaveBeenCalledWith('userInfo', mockResult.userData)
    })

    test('应该在云开发未初始化时拒绝登录', async () => {
      app.globalData.cloudReady = false

      await expect(app.login()).rejects.toThrow('云开发尚未初始化')
    })

    test('应该处理登录失败', async () => {
      app.globalData.cloudReady = true

      const mockResult = {
        success: false,
        message: '登录失败'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      await expect(app.login()).rejects.toThrow('登录失败')
    })

    test('应该处理网络错误', async () => {
      app.globalData.cloudReady = true

      const networkError = new Error('Network error')
      wx.cloud.callFunction.mockRejectedValue(networkError)

      await expect(app.login()).rejects.toThrow('Network error')
    })
  })

  describe('logout() - 退出登录', () => {
    test('应该成功退出登录', () => {
      app.globalData.userInfo = { nickname: 'TestUser' }
      app.globalData.openid = 'test-openid'
      app.globalData.isLoggedIn = true

      app.logout()

      expect(app.globalData.userInfo).toBeNull()
      expect(app.globalData.openid).toBe('')
      expect(app.globalData.isLoggedIn).toBe(false)

      expect(cache.remove).toHaveBeenCalledWith('openid')
      expect(cache.remove).toHaveBeenCalledWith('userInfo')

      expect(wx.reLaunch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/pages/home/index'
        })
      )
    })

    test('应该处理退出时的异常', () => {
      cache.remove.mockImplementation(() => {
        throw new Error('Remove failed')
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      app.logout()

      expect(consoleSpy).toHaveBeenCalled()
      expect(wx.reLaunch).not.toHaveBeenCalled() // 因为异常发生在 reLaunch 之前

      consoleSpy.mockRestore()
    })

    test('应该处理页面跳转失败', () => {
      wx.reLaunch.mockImplementation(() => {
        throw new Error('Navigate failed')
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      app.logout()

      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('getDB() - 获取数据库实例', () => {
    test('应该返回数据库实例', () => {
      app.globalData.cloudReady = true
      wx.cloud.database.mockReturnValue({})

      const db = app.getDB()

      expect(db).not.toBeNull()
      expect(wx.cloud.database).toHaveBeenCalled()
    })

    test('应该在云开发未初始化时返回null', () => {
      app.globalData.cloudReady = false

      const db = app.getDB()

      expect(db).toBeNull()
      expect(wx.cloud.database).not.toHaveBeenCalled()
    })

    test('应该缓存数据库实例', () => {
      app.globalData.cloudReady = true
      const mockDB = {}
      wx.cloud.database.mockReturnValue(mockDB)

      const db1 = app.getDB()
      const db2 = app.getDB()

      expect(db1).toBe(db2)
      expect(wx.cloud.database).toHaveBeenCalledTimes(1)
    })
  })

  describe('综合测试', () => {
    test('应该支持完整的登录流程', async () => {
      // 1. 应用启动
      wx.cloud.init.mockReturnValue(true)
      cache.get.mockReturnValue(null) // 未登录

      app.onLaunch()

      expect(app.globalData.cloudReady).toBe(true)
      expect(app.globalData.isLoggedIn).toBe(false)

      // 2. 用户登录
      const mockResult = {
        success: true,
        openid: 'test-openid',
        userId: 'user-123',
        userData: { nickname: 'TestUser' }
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      await app.login()

      expect(app.globalData.isLoggedIn).toBe(true)
      expect(app.globalData.userInfo.nickname).toBe('TestUser')

      // 3. 用户退出
      app.logout()

      expect(app.globalData.isLoggedIn).toBe(false)
      expect(app.globalData.userInfo).toBeNull()
    })

    test('应该处理启动时已有登录状态', () => {
      const mockUserInfo = { nickname: 'ExistingUser' }
      const mockOpenid = 'existing-openid'

      cache.get.mockImplementation((key) => {
        if (key === 'userInfo') return mockUserInfo
        if (key === 'openid') return mockOpenid
        return null
      })

      wx.cloud.init.mockReturnValue(true)

      app.onLaunch()

      expect(app.globalData.isLoggedIn).toBe(true)
      expect(app.globalData.userInfo.nickname).toBe('ExistingUser')
    })
  })
})
