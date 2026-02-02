// miniprogram/pages/entry-pass/index.spec.js - 入场凭证页单元测试

// Mock wx API
global.wx = {
  cloud: {
    callFunction: jest.fn()
  },
  arrayBufferToBase64: jest.fn((buffer) => 'base64string'),
  showLoading: jest.fn(),
  hideLoading: jest.fn()
}

// Mock orderService
const orderService = require('../../services/orderService')
jest.mock('../../services/orderService')

// Mock errorHandler
const { handleError, showLoading, hideLoading } = require('../../utils/errorHandler')
jest.mock('../../utils/errorHandler', () => ({
  handleError: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn()
}))

// Mock CONSTANTS
jest.mock('../../config/constants.js', () => ({
  QR_REFRESH_INTERVAL: 30
}))

// Mock getApp
const mockApp = {
  globalData: {},
  getDB: jest.fn()
}

global.getApp = jest.fn(() => mockApp)

describe('Entry-Pass Page', () => {
  let entryPassPage

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // 模拟 Page 构造函数
    const Page = (options) => {
      entryPassPage = {
        ...options,
        data: options.data || {},
        setData: jest.fn((data, callback) => {
          Object.assign(entryPassPage.data, data)
          if (callback) callback()
        })
      }
    }

    global.Page = Page
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('loadOrderData() - 加载订单数据', () => {
    test('应该正确处理蛇形命名字段映射', async () => {
      // 加载页面
      require('./index.js')

      // Mock 数据库返回的蛇形命名数据
      const mockRawData = {
        _id: 'order-123',
        spot_number: 'A001',
        date: '2024-01-15',
        start_time: '10:00',
        end_time: '12:00',
        plateNumber: '京A12345',
        status: 'paid',
        timeRange: {
          start: '2024-01-15 10:00',
          end: '2024-01-15 12:00'
        },
        entryPass: {
          staticCode: 'ABC123'
        }
      }

      orderService.getOrderDetail.mockResolvedValue({ data: mockRawData })

      // 设置 orderId
      entryPassPage.orderId = 'order-123'

      // 调用 loadOrderData
      await entryPassPage.loadOrderData()

      // 验证字段映射正确
      expect(entryPassPage.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          orderData: expect.objectContaining({
            spotNumber: 'A001',
            startTime: '10:00',
            endTime: '12:00',
            date: '2024-01-15',
            plateNumber: '京A12345'
          }),
          statusText: '待入场',
          statusColor: '#22c55e',
          staticCode: 'ABC123'
        })
      )
    })

    test('应该处理驼峰命名字段（向后兼容）', async () => {
      // 加载页面
      require('./index.js')

      // Mock 驼峰命名数据
      const mockRawData = {
        _id: 'order-123',
        spotNumber: 'B002',
        startTime: '14:00',
        endTime: '16:00',
        date: '2024-01-15',
        plateNumber: '沪B56789',
        status: 'active',
        timeRange: {
          start: '2024-01-15 14:00',
          end: '2024-01-15 16:00'
        }
      }

      orderService.getOrderDetail.mockResolvedValue({ data: mockRawData })

      // 设置 orderId
      entryPassPage.orderId = 'order-123'

      // 调用 loadOrderData
      await entryPassPage.loadOrderData()

      // 验证字段正确
      expect(entryPassPage.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          orderData: expect.objectContaining({
            spotNumber: 'B002',
            startTime: '14:00',
            endTime: '16:00'
          }),
          statusText: '停车中',
          statusColor: '#3b82f6'
        })
      )
    })

    test('应该提供默认值处理缺失字段', async () => {
      // 加载页面
      require('./index.js')

      // Mock 缺失字段的数据
      const mockRawData = {
        _id: 'order-123',
        status: 'completed'
      }

      orderService.getOrderDetail.mockResolvedValue({ data: mockRawData })

      // 设置 orderId
      entryPassPage.orderId = 'order-123'

      // 调用 loadOrderData
      await entryPassPage.loadOrderData()

      // 验证默认值
      expect(entryPassPage.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          orderData: expect.objectContaining({
            spotNumber: '未知',
            startTime: '--:--',
            endTime: '--:--',
            date: '',
            plateNumber: '',
            timeRange: { start: '', end: '' }
          }),
          statusText: '已完成',
          statusColor: '#9ca3af'
        })
      )
    })

    test('应该处理加载失败的情况', async () => {
      // 加载页面
      require('./index.js')

      // Mock 错误
      orderService.getOrderDetail.mockRejectedValue(new Error('订单不存在'))

      // 设置 orderId
      entryPassPage.orderId = 'nonexistent'

      // 调用 loadOrderData
      await entryPassPage.loadOrderData()

      // 验证错误处理
      expect(handleError).toHaveBeenCalledWith(
        expect.any(Error),
        '加载失败'
      )
    })
  })

  describe('状态文本和颜色映射', () => {
    test('应该正确映射 paid 状态', async () => {
      // 加载页面
      require('./index.js')

      const mockData = {
        _id: 'order-paid',
        spot_number: 'A001',
        status: 'paid',
        date: '2024-01-15',
        start_time: '10:00',
        end_time: '12:00'
      }

      orderService.getOrderDetail.mockResolvedValue({ data: mockData })
      entryPassPage.orderId = 'order-paid'

      await entryPassPage.loadOrderData()

      expect(entryPassPage.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          statusText: '待入场',
          statusColor: '#22c55e'
        })
      )
    })

    test('应该正确映射 active 状态', async () => {
      // 加载页面
      require('./index.js')

      const mockData = {
        _id: 'order-active',
        spot_number: 'A001',
        status: 'active',
        date: '2024-01-15',
        start_time: '10:00',
        end_time: '12:00'
      }

      orderService.getOrderDetail.mockResolvedValue({ data: mockData })
      entryPassPage.orderId = 'order-active'

      await entryPassPage.loadOrderData()

      expect(entryPassPage.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          statusText: '停车中',
          statusColor: '#3b82f6'
        })
      )
    })

    test('应该正确映射 completed 状态', async () => {
      // 加载页面
      require('./index.js')

      const mockData = {
        _id: 'order-completed',
        spot_number: 'A001',
        status: 'completed',
        date: '2024-01-15',
        start_time: '10:00',
        end_time: '12:00'
      }

      orderService.getOrderDetail.mockResolvedValue({ data: mockData })
      entryPassPage.orderId = 'order-completed'

      await entryPassPage.loadOrderData()

      expect(entryPassPage.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          statusText: '已完成',
          statusColor: '#9ca3af'
        })
      )
    })

    test('应该正确映射 overstayed 状态', async () => {
      // 加载页面
      require('./index.js')

      const mockData = {
        _id: 'order-overstayed',
        spot_number: 'A001',
        status: 'overstayed',
        date: '2024-01-15',
        start_time: '10:00',
        end_time: '12:00'
      }

      orderService.getOrderDetail.mockResolvedValue({ data: mockData })
      entryPassPage.orderId = 'order-overstayed'

      await entryPassPage.loadOrderData()

      expect(entryPassPage.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          statusText: '已超时',
          statusColor: '#ef4444'
        })
      )
    })

    test('应该正确映射未知状态', async () => {
      // 加载页面
      require('./index.js')

      const mockData = {
        _id: 'order-unknown',
        spot_number: 'A001',
        status: 'unknown_status',
        date: '2024-01-15',
        start_time: '10:00',
        end_time: '12:00'
      }

      orderService.getOrderDetail.mockResolvedValue({ data: mockData })
      entryPassPage.orderId = 'order-unknown'

      await entryPassPage.loadOrderData()

      expect(entryPassPage.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          statusText: '未知',
          statusColor: '#9ca3af'
        })
      )
    })
  })

  describe('clearTimers() - 清除定时器', () => {
    test('应该清除所有定时器', () => {
      // 加载页面
      require('./index.js')

      // 模拟定时器
      entryPassPage.refreshTimer = setInterval(() => {}, 1000)
      entryPassPage.countdownTimer = setInterval(() => {}, 1000)

      // 调用 clearTimers
      entryPassPage.clearTimers()

      // 验证定时器被清除
      expect(entryPassPage.refreshTimer).toBeNull()
      expect(entryPassPage.countdownTimer).toBeNull()
    })
  })

  describe('onNavigate() - 导航功能', () => {
    test('应该打开地图导航', () => {
      // 加载页面
      require('./index.js')

      // Mock wx.showModal 和 wx.openLocation
      wx.showModal = jest.fn(({ success }) => {
        success({ confirm: true })
      })
      wx.openLocation = jest.fn()

      // 设置订单数据
      entryPassPage.data = {
        orderData: {
          latitude: 39.908823,
          longitude: 116.397470,
          spotName: 'A区001号',
          address: '北京市朝阳区'
        }
      }

      // 调用 onNavigate
      entryPassPage.onNavigate()

      // 验证
      expect(wx.showModal).toHaveBeenCalled()
      expect(wx.openLocation).toHaveBeenCalledWith({
        latitude: 39.908823,
        longitude: 116.397470,
        name: 'A区001号',
        address: '北京市朝阳区'
      })
    })

    test('应该使用默认位置信息', () => {
      // 加载页面
      require('./index.js')

      // Mock wx.showModal 和 wx.openLocation
      wx.showModal = jest.fn(({ success }) => {
        success({ confirm: true })
      })
      wx.openLocation = jest.fn()

      // 设置缺少位置的订单数据
      entryPassPage.data = {
        orderData: {
          spotNumber: 'B002'
        }
      }

      // 调用 onNavigate
      entryPassPage.onNavigate()

      // 验证使用默认位置
      expect(wx.openLocation).toHaveBeenCalledWith({
        latitude: 39.908823,
        longitude: 116.397470,
        name: '目标车位',
        address: '未知地址'
      })
    })
  })
})
