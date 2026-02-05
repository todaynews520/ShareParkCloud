// miniprogram/pages/profile/index.spec.js - 个人中心单元测试

// Mock wx API
global.wx = {
  showToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showModal: jest.fn(),
  switchTab: jest.fn(),
  reLaunch: jest.fn(),
  navigateTo: jest.fn()
}

// Mock errorHandler
jest.mock('../../utils/errorHandler', () => ({
  handleError: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn()
}))

// Mock services
jest.mock('../../services/parkingService', () => ({
  getMyPublishList: jest.fn(() => Promise.resolve({ data: [] })),
  cancelPublish: jest.fn(() => Promise.resolve({ success: true }))
}))

jest.mock('../../services/orderService', () => ({
  getMyOrderList: jest.fn(() => Promise.resolve({ data: [] })),
  cancelOrder: jest.fn(() => Promise.resolve({ success: true }))
}))

jest.mock('../../services/pointsService', () => ({
  getUserPoints: jest.fn(() => Promise.resolve({
    success: true,
    points: 1000,
    lastCheckInDate: '',
    consecutiveDays: 0,
    totalCheckInDays: 0
  })),
  checkIn: jest.fn(() => Promise.resolve({
    success: true,
    points: 1010,
    reward: 10,
    bonus: 0,
    consecutiveDays: 1
  }))
}))

jest.mock('../../config/constants', () => ({
  POINTS_NAME: '积分'
}))

const pointsService = require('../../services/pointsService')

// Mock getApp
const mockApp = {
  globalData: {
    isLoggedIn: true,
    userInfo: {
      nickname: '测试用户',
      avatar: 'https://example.com/avatar.png',
      stats: {
        publishCount: 5,
        totalEarning: 50000,
        rating: 5.0
      }
    }
  },
  logout: jest.fn(),
  login: jest.fn()
}

global.getApp = jest.fn(() => mockApp)

describe('Profile Page', () => {
  let profilePage

  beforeEach(() => {
    jest.clearAllMocks()

    // 模拟 Page 构造函数
    const Page = (options) => {
      const pageData = options.data ? { ...options.data } : {}

      const pageObj = {
        data: pageData,
        setData: jest.fn((data, callback) => {
          Object.assign(pageObj.data, data)
          if (callback) callback()
        })
      }

      // 复制所有方法和属性
      Object.keys(options).forEach(key => {
        if (key !== 'data') {
          pageObj[key] = options[key]
        }
      })

      return pageObj
    }

    global.Page = Page

    // 加载页面
    require('./index.js')

    // 获取页面实例
    profilePage = Page({
      data: {
        userInfo: null,
        isLoggedIn: false,
        activeTab: 'publish',
        publishList: [],
        orderList: [],
        loading: false,
        points: 0,
        lastCheckInDate: '',
        consecutiveDays: 0,
        totalCheckInDays: 0,
        canCheckIn: true,
        stats: {
          publishCount: 0,
          totalEarningText: '0',
          rating: 5.0
        }
      },
      checkLogin() {},
      loadUserPoints() {},
      loadData() {},
      onTabChange() {},
      onCheckIn() {},
      onLogin() {},
      onLogout() {},
      onCancelPublish() {},
      onViewEntryPass() {},
      onCancelBooking() {},
      onShow() {},
      onLoad() {}
    })
  })

  describe('checkLogin() - 检查登录状态', () => {
    test('已登录用户应该正确显示信息', () => {
      mockApp.globalData.isLoggedIn = true

      profilePage.checkLogin()

      expect(profilePage.data.isLoggedIn).toBe(true)
      expect(profilePage.data.userInfo).toEqual(mockApp.globalData.userInfo)
      expect(profilePage.data.stats.publishCount).toBe(5)
    })

    test('未登录用户应该显示游客状态', () => {
      mockApp.globalData.isLoggedIn = false
      mockApp.globalData.userInfo = null

      profilePage.checkLogin()

      expect(profilePage.data.isLoggedIn).toBe(false)
      expect(profilePage.data.userInfo).toBeNull()
    })
  })

  describe('loadUserPoints() - 加载用户积分', () => {
    test('应该成功加载积分信息', async () => {
      const mockPointsData = {
        success: true,
        points: 1000,
        lastCheckInDate: 'Mon Jan 15 2024',
        consecutiveDays: 5,
        totalCheckInDays: 10
      }

      pointsService.getUserPoints.mockResolvedValue(mockPointsData)

      await profilePage.loadUserPoints()

      expect(profilePage.data.points).toBe(1000)
      expect(profilePage.data.consecutiveDays).toBe(5)
      expect(profilePage.data.totalCheckInDays).toBe(10)
      expect(profilePage.data.canCheckIn).toBe(true)
    })

    test('今日已签到应该设置 canCheckIn 为 false', async () => {
      const today = new Date().toDateString()
      const mockPointsData = {
        success: true,
        points: 1010,
        lastCheckInDate: today,
        consecutiveDays: 1,
        totalCheckInDays: 1
      }

      pointsService.getUserPoints.mockResolvedValue(mockPointsData)

      await profilePage.loadUserPoints()

      expect(profilePage.data.canCheckIn).toBe(false)
    })

    test('应该处理加载积分失败', async () => {
      pointsService.getUserPoints.mockRejectedValue(new Error('加载失败'))

      await profilePage.loadUserPoints()

      // 加载失败时积分应保持默认值 0
      expect(profilePage.data.points).toBe(0)
    })
  })

  describe('onCheckIn() - 签到', () => {
    test('应该成功签到并显示奖励', async () => {
      profilePage.data.canCheckIn = true

      const mockResult = {
        success: true,
        points: 1010,
        reward: 10,
        bonus: 0,
        consecutiveDays: 1
      }

      pointsService.checkIn.mockResolvedValue(mockResult)
      wx.showModal.mockImplementation(({ success }) => {
        if (success) success()
      })

      await profilePage.onCheckIn()

      expect(pointsService.checkIn).toHaveBeenCalled()
      expect(wx.showModal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '签到成功',
          content: '签到成功 +10积分'
        })
      )
    })

    test('已签到状态下再次点击应该提示', async () => {
      profilePage.data.canCheckIn = false

      await profilePage.onCheckIn()

      expect(wx.showToast).toHaveBeenCalledWith({
        title: '今日已签到',
        icon: 'none'
      })
      expect(pointsService.checkIn).not.toHaveBeenCalled()
    })
  })

  describe('onTabChange() - 切换Tab', () => {
    test('应该切换到发布Tab', () => {
      const e = {
        currentTarget: {
          dataset: {
            tab: 'publish'
          }
        }
      }

      profilePage.onTabChange(e)

      expect(profilePage.data.activeTab).toBe('publish')
    })

    test('应该切换到订单Tab', () => {
      const e = {
        currentTarget: {
          dataset: {
            tab: 'order'
          }
        }
      }

      profilePage.onTabChange(e)

      expect(profilePage.data.activeTab).toBe('order')
    })
  })
})
