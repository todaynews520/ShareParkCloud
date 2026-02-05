// miniprogram/pages/book/index.spec.js - 预约页单元测试

// Mock wx API
global.wx = {
  showToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showModal: jest.fn(),
  navigateBack: jest.fn(),
  redirectTo: jest.fn(),
  switchTab: jest.fn()
}

// Mock errorHandler
jest.mock('../../utils/errorHandler', () => ({
  handleError: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn()
}))

// Mock services
jest.mock('../../services/parkingService', () => ({
  getParkingDetail: jest.fn(() => Promise.resolve({
    data: {
      _id: 'spot-123',
      spotNumber: 'A001',
      location: { name: '地下停车场A区' },
      date: '2024-01-15',
      startTime: '10:00',
      endTime: '12:00',
      duration: 2,
      price: { hourly: 500 }
    }
  }))
}))

jest.mock('../../services/orderService', () => ({
  createOrder: jest.fn(() => Promise.resolve({ orderId: 'order-123' })),
  payOrder: jest.fn(() => Promise.resolve({ success: true })),
  calculatePrice: jest.fn(() => ({
    pointsCost: 10,
    baseFee: 10,
    serviceFee: 0,
    total: 10,
    baseFeeText: '10',
    serviceFeeText: '0',
    totalText: '10'
  }))
}))

jest.mock('../../services/pointsService', () => ({
  getUserPoints: jest.fn(() => Promise.resolve({
    success: true,
    points: 100
  }))
}))

jest.mock('../../config/constants', () => ({
  BOOKING_COST: 10,
  POINTS_NAME: '积分'
}))

jest.mock('../../utils/cache', () => ({
  get: jest.fn(() => []),
  set: jest.fn()
}))

const parkingService = require('../../services/parkingService')
const orderService = require('../../services/orderService')
const pointsService = require('../../services/pointsService')

// Mock getApp
const mockApp = {
  globalData: {
    isLoggedIn: true
  },
  login: jest.fn(() => Promise.resolve())
}

global.getApp = jest.fn(() => mockApp)

describe('Book Page', () => {
  let bookPage

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // 模拟 Page 构造函数 - 确保方法被正确复制
    const Page = (options) => {
      const pageData = options.data ? { ...options.data } : {}

      const pageObj = {
        data: pageData,
        setData: jest.fn((data, callback) => {
          Object.assign(pageObj.data, data)
          if (callback) callback()
        })
      }

      // 复制所有生命周期方法和事件处理函数
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
    bookPage = Page({
      data: {
        spotId: '',
        spotInfo: null,
        plateNumber: '',
        plateHistory: [],
        pricing: {
          baseFee: 0,
          serviceFee: 0,
          total: 0
        }
      },
      onLoad(options) {
        this.spotId = options.spotId
        this.loadSpotDetail()
        this.loadPlateHistory()
      },
      loadSpotDetail() {},
      loadPlateHistory() {},
      onPlateInput() {},
      onPlateComplete() {},
      onConfirm() {},
      savePlateHistory() {}
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('onPlateInput() - 车牌输入', () => {
    test('应该更新车牌号', () => {
      const e = { detail: { value: '京A12345' } }

      bookPage.onPlateInput(e)

      expect(bookPage.data.plateNumber).toBe('京A12345')
    })
  })

  describe('onPlateComplete() - 车牌输入完成', () => {
    test('应该使用标准化的车牌号', () => {
      const e = {
        detail: {
          value: '京A12345',
          normalized: '京A12345'
        }
      }

      bookPage.onPlateComplete(e)

      expect(bookPage.data.plateNumber).toBe('京A12345')
    })

    test('如果没有normalized则使用原始值', () => {
      const e = {
        detail: {
          value: '京A12345'
        }
      }

      bookPage.onPlateComplete(e)

      expect(bookPage.data.plateNumber).toBe('京A12345')
    })
  })

  describe('savePlateHistory() - 保存车牌历史', () => {
    test('应该保存新车牌到历史', () => {
      bookPage.plateHistory = ['京B11111']

      bookPage.savePlateHistory('京A12345')

      expect(bookPage.plateHistory[0]).toBe('京A12345')
      expect(bookPage.plateHistory[1]).toBe('京B11111')
    })

    test('应该去重已存在的车牌', () => {
      bookPage.plateHistory = ['京A12345', '京B11111']

      bookPage.savePlateHistory('京A12345')

      expect(bookPage.plateHistory).toHaveLength(2)
      expect(bookPage.plateHistory[0]).toBe('京A12345')
    })

    test('应该只保存最近5条', () => {
      bookPage.plateHistory = ['B', 'C', 'D', 'E', 'F']

      bookPage.savePlateHistory('A')

      expect(bookPage.plateHistory).toHaveLength(5)
      expect(bookPage.plateHistory[0]).toBe('A')
      expect(bookPage.plateHistory).not.toContain('F')
    })
  })

  describe('loadPlateHistory() - 加载车牌历史', () => {
    test('应该从缓存加载车牌历史', () => {
      const cache = require('../../utils/cache')
      cache.get.mockReturnValue(['京A12345', '京B11111'])

      bookPage.loadPlateHistory()

      expect(bookPage.plateHistory).toEqual(['京A12345', '京B11111'])
    })

    test('缓存为空时应该返回空数组', () => {
      const cache = require('../../utils/cache')
      cache.get.mockReturnValue(undefined)

      bookPage.loadPlateHistory()

      expect(bookPage.plateHistory).toEqual([])
    })
  })
})
