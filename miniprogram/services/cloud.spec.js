// miniprogram/services/cloud.spec.js - 云服务单元测试
const cloudService = require('./cloud')

describe('Cloud Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('callFunction() - 调用云函数', () => {
    test('应该成功调用云函数并返回结果', async () => {
      const mockResult = { success: true, data: { id: 1, name: 'Test' } }
      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await cloudService.callFunction('testFunction', { param: 'value' })

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'testFunction',
        data: { param: 'value' }
      })
      expect(result).toEqual(mockResult)
    })

    test('应该正确传递空参数', async () => {
      const mockResult = { success: true, data: [] }
      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      await cloudService.callFunction('testFunction')

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'testFunction',
        data: {}
      })
    })

    test('应该在云函数返回失败时抛出错误', async () => {
      const mockResult = { success: false, message: '操作失败' }
      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      await expect(cloudService.callFunction('testFunction'))
        .rejects.toThrow('操作失败')
    })

    test('应该使用默认错误消息', async () => {
      const mockResult = { success: false }
      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      await expect(cloudService.callFunction('testFunction'))
        .rejects.toThrow('操作失败')
    })

    test('应该处理网络错误', async () => {
      const networkError = new Error('Network error')
      wx.cloud.callFunction.mockRejectedValue(networkError)

      await expect(cloudService.callFunction('testFunction'))
        .rejects.toThrow('Network error')
    })

    test('应该处理云函数超时', async () => {
      const timeoutError = new Error('Request timeout')
      wx.cloud.callFunction.mockRejectedValue(timeoutError)

      await expect(cloudService.callFunction('testFunction'))
        .rejects.toThrow('Request timeout')
    })

    test('应该正确处理复杂参数对象', async () => {
      const mockResult = { success: true, data: { result: 'ok' } }
      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const complexData = {
        nested: {
          object: {
            array: [1, 2, 3],
            string: 'test',
            number: 123
          }
        }
      }

      await cloudService.callFunction('complexFunction', complexData)

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'complexFunction',
        data: complexData
      })
    })

    test('应该处理没有 success 字段的响应', async () => {
      const mockResult = { data: 'some data' }
      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      await expect(cloudService.callFunction('testFunction'))
        .rejects.toThrow('操作失败')
    })
  })

  describe('实际使用场景', () => {
    test('应该支持登录云函数调用', async () => {
      const mockResult = {
        success: true,
        openid: 'test-openid',
        userData: { nickname: 'TestUser' }
      }
      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await cloudService.callFunction('login', {})

      expect(result.openid).toBe('test-openid')
      expect(result.userData.nickname).toBe('TestUser')
    })

    test('应该支持预约云函数调用', async () => {
      const mockResult = {
        success: true,
        orderId: 'order-123',
        status: 'confirmed'
      }
      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await cloudService.callFunction('createOrder', {
        parkingId: 'park-123',
        timeRange: ['10:00', '12:00']
      })

      expect(result.orderId).toBe('order-123')
      expect(result.status).toBe('confirmed')
    })

    test('应该串行调用多个云函数', async () => {
      const mockResult1 = { success: true, data: { id: 1 } }
      const mockResult2 = { success: true, data: { id: 2 } }

      wx.cloud.callFunction
        .mockResolvedValueOnce({ result: mockResult1 })
        .mockResolvedValueOnce({ result: mockResult2 })

      const result1 = await cloudService.callFunction('function1')
      const result2 = await cloudService.callFunction('function2')

      expect(result1.data.id).toBe(1)
      expect(result2.data.id).toBe(2)
      expect(wx.cloud.callFunction).toHaveBeenCalledTimes(2)
    })

    test('应该支持并行调用多个云函数', async () => {
      const mockResult1 = { success: true, data: { id: 1 } }
      const mockResult2 = { success: true, data: { id: 2 } }

      wx.cloud.callFunction
        .mockResolvedValueOnce({ result: mockResult1 })
        .mockResolvedValueOnce({ result: mockResult2 })

      const [result1, result2] = await Promise.all([
        cloudService.callFunction('function1'),
        cloudService.callFunction('function2')
      ])

      expect(result1.data.id).toBe(1)
      expect(result2.data.id).toBe(2)
    })

    test('应该在第一个云函数失败时停止串行调用', async () => {
      const errorResult = { success: false, message: 'First failed' }

      wx.cloud.callFunction.mockResolvedValueOnce({ result: errorResult })

      try {
        await cloudService.callFunction('function1')
        await cloudService.callFunction('function2')
        fail('Should have thrown an error')
      } catch (err) {
        expect(err.message).toBe('First failed')
        expect(wx.cloud.callFunction).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('边界情况', () => {
    test('应该处理非常大的数据参数', async () => {
      const mockResult = { success: true, data: { received: true } }
      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const largeData = {
        array: new Array(10000).fill('test'),
        nested: {
          deep: {
            structure: 'value'
          }
        }
      }

      await cloudService.callFunction('largeDataFunction', largeData)

      expect(wx.cloud.callFunction).toHaveBeenCalled()
    })

    test('应该处理特殊字符参数', async () => {
      const mockResult = { success: true, data: true }
      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const specialData = {
        emoji: '😀🎉',
        chinese: '中文测试',
        symbols: '!@#$%^&*()',
        mixed: 'Test中文123!@#😀'
      }

      await cloudService.callFunction('specialFunction', specialData)

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'specialFunction',
        data: specialData
      })
    })
  })
})
