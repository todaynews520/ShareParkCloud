// miniprogram/pages/home/index.spec.js - 首页单元测试

// Mock wx API 和依赖
global.wx = {
  getLocation: jest.fn(),
  createMapContext: jest.fn(() => ({
    moveToLocation: jest.fn()
  })),
  showToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  stopPullDownRefresh: jest.fn(),
  showModal: jest.fn(),
  navigateTo: jest.fn()
}

// Mock errorHandler
jest.mock('../../utils/errorHandler', () => ({
  handleError: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn()
}))

// Mock parkingService
jest.mock('../../services/parkingService', () => ({
  getParkingList: jest.fn(() => Promise.resolve({ data: [] }))
}))

const parkingService = require('../../services/parkingService')

// Mock getApp
global.getApp = jest.fn(() => ({
  globalData: {},
  getDB: jest.fn()
}))

describe('Home Page', () => {
  let homePage

  beforeEach(() => {
    jest.clearAllMocks()

    // 模拟 Page 构造函数
    const Page = (options) => {
      homePage = {
        ...options,
        data: options.data || {},
        setData: jest.fn((data, callback) => {
          Object.assign(homePage.data, data)
          if (callback) callback()
        })
      }
    }

    global.Page = Page

    // 加载页面（只加载一次）
    require('./index.js')
  })

  afterEach(() => {
    // 重置 loading 状态，防止影响下一个测试
    if (homePage && homePage.data) {
      homePage.data.loading = false
    }
  })

  describe('onShow() - 页面显示', () => {
    test('应该总是刷新列表', async () => {
      // 设置 loading 为 false 确保 loadParkingList 会执行
      homePage.data.loading = false

      // Mock parkingService.getParkingList
      parkingService.getParkingList.mockResolvedValue({
        data: []
      })

      // 调用 onShow
      await homePage.onShow()

      // 验证调用了刷新方法
      expect(parkingService.getParkingList).toHaveBeenCalled()
    })
  })

  describe('loadParkingList() - 加载车位列表', () => {
    test('应该在刷新时传入正确的参数', async () => {
      // Mock parkingService.getParkingList
      parkingService.getParkingList.mockResolvedValue({
        data: []
      })

      // 调用 loadParkingList(true)
      await homePage.loadParkingList(true)

      // 验证调用参数
      expect(parkingService.getParkingList).toHaveBeenCalledWith({
        limit: 20,
        skip: 0
      })
    })

    test('应该处理加载中的状态', async () => {
      // 设置加载状态
      homePage.data.loading = true

      // 调用 loadParkingList - 应该提前返回
      await homePage.loadParkingList()

      // 验证没有调用
      expect(parkingService.getParkingList).not.toHaveBeenCalled()
    })
  })

  describe('onPullDownRefresh() - 下拉刷新', () => {
    test('应该刷新列表并停止下拉动画', async () => {
      // 确保 loading 为 false
      homePage.data.loading = false

      // Mock loadParkingList 方法
      const mockLoadParkingList = jest.fn().mockResolvedValue(undefined)
      homePage.loadParkingList = mockLoadParkingList

      // 调用 onPullDownRefresh
      await homePage.onPullDownRefresh()

      // 验证 loadParkingList 被调用
      expect(mockLoadParkingList).toHaveBeenCalledWith(true)
      expect(wx.stopPullDownRefresh).toHaveBeenCalled()
    })
  })

  describe('onSpotTap() - 点击车位卡片', () => {
    test('应该跳转到预约页面', () => {
      // 模拟点击事件
      const e = {
        currentTarget: {
          dataset: {
            id: 'spot-123'
          }
        }
      }

      homePage.onSpotTap(e)

      // 验证跳转
      expect(wx.navigateTo).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/pages/book/index?spotId=spot-123'
        })
      )
    })

    test('应该处理缺失的 spotId', () => {
      // 模拟点击事件（没有 id）
      const e = {
        currentTarget: {
          dataset: {}
        }
      }

      homePage.onSpotTap(e)

      // 验证提示
      expect(wx.showToast).toHaveBeenCalledWith({
        title: '车位ID缺失，无法预约',
        icon: 'none'
      })
    })
  })

  describe('onRangeChange() - 切换搜索范围', () => {
    test('应该更新选中范围并刷新列表', async () => {
      // 确保 loading 为 false
      homePage.data.loading = false

      // Mock loadParkingList 方法
      const mockLoadParkingList = jest.fn().mockResolvedValue(undefined)
      homePage.loadParkingList = mockLoadParkingList

      // 模拟切换范围
      const e = {
        currentTarget: {
          dataset: {
            range: '1000'
          }
        }
      }

      await homePage.onRangeChange(e)

      // 验证数据更新
      expect(homePage.data.selectedRange).toBe(1000)
      expect(homePage.data.mapScale).toBe(15)
      expect(mockLoadParkingList).toHaveBeenCalledWith(true)
    })
  })
})
