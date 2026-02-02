// miniprogram/services/parkingService.spec.js - 车位服务单元测试
const parkingService = require('./parkingService')

// Mock getApp
const mockApp = {
  globalData: {
    cloudReady: true
  },
  getDB: jest.fn()
}

global.getApp = jest.fn(() => mockApp)

describe('Parking Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset default mock behavior
    mockApp.getDB.mockReturnValue({
      collection: jest.fn().mockReturnValue({
        field: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ data: [] }),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ data: null })
        })
      }),
      command: {
        gte: jest.fn(() => '>= condition')
      }
    })
  })

  describe('getParkingList() - 获取车位列表', () => {
    test('应该使用默认参数获取车位列表', async () => {
      const mockData = [
        { _id: '1', spot_number: 'A001', status: 'available' },
        { _id: '2', spot_number: 'A002', status: 'available' }
      ]

      mockApp.getDB.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          field: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ data: mockData })
        }),
        command: {
          gte: jest.fn(() => '>= condition')
        }
      })

      const result = await parkingService.getParkingList()

      expect(result.data).toEqual(mockData)
    })

    test('应该支持自定义查询参数', async () => {
      const mockData = [
        { _id: '1', spot_number: 'A001', status: 'available' }
      ]

      mockApp.getDB.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          field: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ data: mockData })
        }),
        command: {
          gte: jest.fn(() => '>= condition')
        }
      })

      const result = await parkingService.getParkingList({
        status: 'reserved',
        limit: 10,
        skip: 20
      })

      expect(result.data).toEqual(mockData)
    })

    test('应该处理空结果', async () => {
      const result = await parkingService.getParkingList()

      expect(result.data).toEqual([])
    })

    test('应该处理数据库错误', async () => {
      mockApp.getDB.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          field: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          get: jest.fn().mockRejectedValue(new Error('Database error'))
        }),
        command: {
          gte: jest.fn(() => '>= condition')
        }
      })

      await expect(parkingService.getParkingList()).rejects.toThrow('Database error')
    })
  })

  describe('getParkingDetail() - 获取车位详情', () => {
    test('应该正确获取车位详情', async () => {
      const mockData = {
        _id: '123',
        spot_number: 'A001',
        status: 'available',
        date: '2024-01-15',
        start_time: '10:00',
        end_time: '12:00'
      }

      mockApp.getDB.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ data: mockData })
          }),
          field: jest.fn().mockReturnThis()
        })
      })

      const result = await parkingService.getParkingDetail('123')

      expect(result.data).toEqual(mockData)
    })

    test('应该处理不存在的车位', async () => {
      const result = await parkingService.getParkingDetail('nonexistent')

      expect(result.data).toBeNull()
    })
  })

  describe('createPublish() - 创建车位发布', () => {
    test('应该成功创建发布', async () => {
      const mockResult = {
        success: true,
        publishId: 'pub-123',
        message: '发布成功'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const publishData = {
        spotNumber: 'A001',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '12:00'
      }

      const result = await parkingService.createPublish(publishData)

      expect(result.publishId).toBe('pub-123')
    })

    test('应该处理创建失败', async () => {
      const mockResult = {
        success: false,
        message: '时间冲突'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const publishData = {
        spotNumber: 'A001',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '12:00'
      }

      await expect(parkingService.createPublish(publishData))
        .rejects.toThrow('时间冲突')
    })
  })

  describe('getMyPublishList() - 获取我的发布列表', () => {
    test('应该成功获取发布列表', async () => {
      const mockResult = {
        success: true,
        data: [
          { _id: '1', spot_number: 'A001', status: 'available' },
          { _id: '2', spot_number: 'A002', status: 'reserved' }
        ]
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await parkingService.getMyPublishList('user-123')

      expect(result.data).toHaveLength(2)
    })

    test('应该处理空列表', async () => {
      const mockResult = {
        success: true,
        data: []
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await parkingService.getMyPublishList('user-123')

      expect(result.data).toEqual([])
    })
  })

  describe('cancelPublish() - 取消发布', () => {
    test('应该成功取消发布', async () => {
      const mockResult = {
        success: true,
        message: '取消成功'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await parkingService.cancelPublish('pub-123')

      expect(result.success).toBe(true)
    })

    test('应该处理取消失败', async () => {
      const mockResult = {
        success: false,
        message: '发布已被预约，无法取消'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      await expect(parkingService.cancelPublish('pub-123'))
        .rejects.toThrow('发布已被预约，无法取消')
    })
  })

  describe('综合测试', () => {
    test('应该支持完整的车位发布流程', async () => {
      // 1. 创建发布
      const createResult = { success: true, publishId: 'pub-123' }
      wx.cloud.callFunction.mockResolvedValueOnce({ result: createResult })

      const publishData = {
        spotNumber: 'A001',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '12:00'
      }

      const create = await parkingService.createPublish(publishData)
      expect(create.publishId).toBe('pub-123')

      // 2. 获取发布列表
      const listResult = {
        success: true,
        data: [{ _id: 'pub-123', spot_number: 'A001', status: 'available' }]
      }
      wx.cloud.callFunction.mockResolvedValueOnce({ result: listResult })

      const list = await parkingService.getMyPublishList('user-123')
      expect(list.data).toHaveLength(1)

      // 3. 取消发布
      const cancelResult = { success: true, message: '取消成功' }
      wx.cloud.callFunction.mockResolvedValueOnce({ result: cancelResult })

      const cancel = await parkingService.cancelPublish('pub-123')
      expect(cancel.success).toBe(true)
    })
  })
})
