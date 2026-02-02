// miniprogram/services/orderService.spec.js - 订单服务单元测试
const orderService = require('./orderService')

// Mock getApp
const mockApp = {
  globalData: {
    cloudReady: true
  },
  getDB: jest.fn()
}

global.getApp = jest.fn(() => mockApp)

// Mock CONSTANTS
jest.mock('../config/constants.js', () => ({
  SERVICE_FEE_RATE: 0.05
}))

describe('Order Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the default mock behavior
    mockApp.getDB.mockReturnValue({
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ data: null })
        })
      })
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('createOrder() - 创建订单', () => {
    test('应该成功创建订单', async () => {
      const mockResult = {
        success: true,
        orderId: 'order-123',
        message: '订单创建成功'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const orderData = {
        parkingId: 'park-123',
        spotNumber: 'A001',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '12:00'
      }

      const result = await orderService.createOrder(orderData)

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'book',
        data: {
          action: 'create',
          orderData
        }
      })
      expect(result.orderId).toBe('order-123')
    })

    test('应该处理创建失败', async () => {
      const mockResult = {
        success: false,
        message: '车位已被预约'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const orderData = {
        parkingId: 'park-123',
        spotNumber: 'A001'
      }

      await expect(orderService.createOrder(orderData))
        .rejects.toThrow('车位已被预约')
    })
  })

  describe('payOrder() - 支付订单', () => {
    test('应该成功支付订单', async () => {
      const mockResult = {
        success: true,
        message: '支付成功'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const payPromise = orderService.payOrder('order-123')

      // 快进时间，跳过 setTimeout
      jest.advanceTimersByTime(1500)

      await payPromise

      expect(wx.showLoading).toHaveBeenCalledWith({
        title: '支付中...',
        mask: true
      })
      expect(wx.hideLoading).toHaveBeenCalled()
      expect(wx.showToast).toHaveBeenCalledWith({
        title: '支付成功',
        icon: 'success'
      })
    })

    test('应该处理支付失败', async () => {
      const error = new Error('支付超时')
      wx.cloud.callFunction.mockRejectedValue(error)

      const payPromise = orderService.payOrder('order-123')

      jest.advanceTimersByTime(1500)

      await expect(payPromise).rejects.toThrow('支付超时')

      expect(wx.hideLoading).toHaveBeenCalled()
      expect(wx.showToast).toHaveBeenCalledWith({
        title: '支付失败',
        icon: 'error'
      })
    })

    test('应该在支付过程中显示loading', async () => {
      const mockResult = { success: true }
      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const payPromise = orderService.payOrder('order-123')

      // 在 setTimeout 期间应该显示 loading
      expect(wx.showLoading).toHaveBeenCalled()

      jest.advanceTimersByTime(1500)
      await payPromise

      expect(wx.hideLoading).toHaveBeenCalled()
    })
  })

  describe('getMyOrderList() - 获取我的订单列表', () => {
    test('应该成功获取订单列表', async () => {
      const mockResult = {
        success: true,
        data: [
          { _id: 'order-1', spotNumber: 'A001', status: 'confirmed' },
          { _id: 'order-2', spotNumber: 'A002', status: 'pending' }
        ]
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await orderService.getMyOrderList('user-123')

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'book',
        data: {
          action: 'list',
          userId: 'user-123'
        }
      })
      expect(result.data).toHaveLength(2)
    })

    test('应该处理空订单列表', async () => {
      const mockResult = {
        success: true,
        data: []
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await orderService.getMyOrderList('user-123')

      expect(result.data).toEqual([])
    })
  })

  describe('getOrderDetail() - 获取订单详情', () => {
    test('应该成功获取订单详情', async () => {
      const mockData = {
        _id: 'order-123',
        spotNumber: 'A001',
        status: 'confirmed',
        totalFee: 500
      }

      mockApp.getDB.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ data: mockData })
          })
        })
      })

      const result = await orderService.getOrderDetail('order-123')

      expect(result.data).toEqual(mockData)
    })

    test('应该处理不存在的订单', async () => {
      const result = await orderService.getOrderDetail('nonexistent')

      expect(result.data).toBeNull()
    })
  })

  describe('calculatePrice() - 计算费用', () => {
    test('应该正确计算基础费用', () => {
      const result = orderService.calculatePrice(500, 2) // 5元/小时, 2小时

      expect(result.baseFee).toBe(1000) // 500 * 2 = 1000分 = 10元
    })

    test('应该正确计算服务费', () => {
      const result = orderService.calculatePrice(500, 2)

      expect(result.serviceFee).toBe(50) // 1000 * 0.05 = 50分
    })

    test('应该正确计算总费用', () => {
      const result = orderService.calculatePrice(500, 2)

      expect(result.total).toBe(1050) // 1000 + 50 = 1050分
    })

    test('应该处理零时长', () => {
      const result = orderService.calculatePrice(500, 0)

      expect(result.baseFee).toBe(0)
      expect(result.serviceFee).toBe(0)
      expect(result.total).toBe(0)
    })

    test('应该处理大额订单', () => {
      const result = orderService.calculatePrice(1000, 10) // 10元/小时, 10小时

      expect(result.baseFee).toBe(10000) // 100元
      expect(result.serviceFee).toBe(500) // 5元
      expect(result.total).toBe(10500) // 105元
    })

    test('应该向上取整服务费', () => {
      const result = orderService.calculatePrice(333, 3) // 999分

      expect(result.baseFee).toBe(999)
      expect(result.serviceFee).toBe(50) // 999 * 0.05 = 49.95 -> 50
      expect(result.total).toBe(1049)
    })
  })

  describe('综合测试', () => {
    test('应该支持完整的订单流程', async () => {
      // 1. 创建订单
      const createResult = { success: true, orderId: 'order-123' }
      wx.cloud.callFunction.mockResolvedValueOnce({ result: createResult })

      const orderData = {
        parkingId: 'park-123',
        spotNumber: 'A001'
      }

      const create = await orderService.createOrder(orderData)
      expect(create.orderId).toBe('order-123')

      // 2. 计算价格
      const price = orderService.calculatePrice(500, 2)
      expect(price.total).toBe(1050)

      // 3. 支付订单
      const payResult = { success: true }
      wx.cloud.callFunction.mockResolvedValueOnce({ result: payResult })

      const payPromise = orderService.payOrder('order-123')
      jest.advanceTimersByTime(1500)
      await payPromise

      expect(wx.showToast).toHaveBeenCalledWith({
        title: '支付成功',
        icon: 'success'
      })

      // 4. 获取订单详情
      const mockOrder = {
        _id: 'order-123',
        spotNumber: 'A001',
        status: 'paid',
        totalFee: 1050
      }

      mockApp.getDB.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ data: mockOrder })
          })
        })
      })

      const detail = await orderService.getOrderDetail('order-123')
      expect(detail.data.totalFee).toBe(1050)
    })

    test('应该处理订单列表分页', async () => {
      const mockResult = {
        success: true,
        data: new Array(20).fill(null).map((_, i) => ({
          _id: `order-${i}`,
          spotNumber: `A${String(i).padStart(3, '0')}`,
          status: 'confirmed'
        })),
        hasMore: true
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await orderService.getMyOrderList('user-123')

      expect(result.data).toHaveLength(20)
      expect(result.data[0].spotNumber).toBe('A000')
      expect(result.data[19].spotNumber).toBe('A019')
    })
  })

  describe('边界情况', () => {
    test('应该处理极端价格计算', () => {
      const result1 = orderService.calculatePrice(1, 1) // 最低价格
      expect(result1.total).toBe(1) // 1分

      const result2 = orderService.calculatePrice(10000, 24) // 最高价格
      expect(result2.total).toBe(252000) // 240000 + 12000
    })

    test('应该处理小数价格输入', () => {
      const result = orderService.calculatePrice(5.5, 2)
      expect(result.baseFee).toBe(11)
    })
  })
})
