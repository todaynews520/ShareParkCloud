// miniprogram/services/pointsService.spec.js - 积分服务单元测试
const pointsService = require('./pointsService')

describe('Points Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserPoints() - 获取用户积分', () => {
    test('应该成功获取用户积分', async () => {
      const mockResult = {
        success: true,
        points: 1000,
        lastCheckInDate: '2024-01-15',
        consecutiveDays: 5,
        totalCheckInDays: 10
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await pointsService.getUserPoints()

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'points',
        data: { action: 'get' }
      })
      expect(result.success).toBe(true)
      expect(result.points).toBe(1000)
      expect(result.consecutiveDays).toBe(5)
    })

    test('应该处理获取积分失败', async () => {
      wx.cloud.callFunction.mockRejectedValue(new Error('用户不存在'))

      await expect(pointsService.getUserPoints()).rejects.toThrow('用户不存在')
    })
  })

  describe('deductPoints() - 扣除积分', () => {
    test('应该成功扣除积分', async () => {
      const mockResult = {
        success: true,
        points: 990,
        message: '积分扣除成功'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await pointsService.deductPoints(10, '预约车位')

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'points',
        data: {
          action: 'deduct',
          amount: 10,
          description: '预约车位'
        }
      })
      expect(result.points).toBe(990)
    })

    test('应该处理积分不足的情况', async () => {
      wx.cloud.callFunction.mockRejectedValue(new Error('积分不足'))

      await expect(pointsService.deductPoints(10, '预约车位')).rejects.toThrow('积分不足')
    })
  })

  describe('addPoints() - 增加积分', () => {
    test('应该成功增加积分', async () => {
      const mockResult = {
        success: true,
        points: 1050,
        message: '积分增加成功'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await pointsService.addPoints(50, '发布车位')

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'points',
        data: {
          action: 'add',
          amount: 50,
          description: '发布车位'
        }
      })
      expect(result.points).toBe(1050)
    })

    test('应该处理增加积分失败', async () => {
      wx.cloud.callFunction.mockRejectedValue(new Error('操作失败'))

      await expect(pointsService.addPoints(50, '发布车位')).rejects.toThrow('操作失败')
    })
  })

  describe('checkIn() - 签到', () => {
    test('应该成功签到并获得奖励', async () => {
      const mockResult = {
        success: true,
        points: 1010,
        reward: 10,
        bonus: 0,
        consecutiveDays: 1,
        totalCheckInDays: 1,
        message: '签到成功'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await pointsService.checkIn()

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'points',
        data: { action: 'checkIn' }
      })
      expect(result.success).toBe(true)
      expect(result.reward).toBe(10)
      expect(result.bonus).toBe(0)
      expect(result.consecutiveDays).toBe(1)
    })

    test('应该成功签到并连续7天获得额外奖励', async () => {
      const mockResult = {
        success: true,
        points: 1200,
        reward: 10,
        bonus: 100,
        consecutiveDays: 7,
        totalCheckInDays: 7,
        message: '签到成功，连续7天额外奖励'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await pointsService.checkIn()

      expect(result.bonus).toBe(100)
      expect(result.consecutiveDays).toBe(7)
    })

    test('应该处理重复签到', async () => {
      wx.cloud.callFunction.mockRejectedValue(new Error('今日已签到'))

      await expect(pointsService.checkIn()).rejects.toThrow('今日已签到')
    })

    test('签到成功后连续天数应重置为0', async () => {
      const mockResult = {
        success: true,
        points: 1110,
        reward: 10,
        bonus: 100,
        consecutiveDays: 0,
        totalCheckInDays: 8,
        message: '签到成功，连续7天奖励已发放，连续天数重置'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await pointsService.checkIn()

      expect(result.consecutiveDays).toBe(0)
    })
  })

  describe('initUserPoints() - 初始化用户积分', () => {
    test('应该成功初始化新用户积分', async () => {
      const mockResult = {
        success: true,
        points: 1000,
        message: '积分初始化成功'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await pointsService.initUserPoints()

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'points',
        data: { action: 'init' }
      })
      expect(result.points).toBe(1000)
    })

    test('应该处理已存在用户的情况', async () => {
      const mockResult = {
        success: true,
        points: 950,
        message: '用户已存在，返回当前积分'
      }

      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await pointsService.initUserPoints()

      expect(result.points).toBe(950)
    })

    test('应该处理初始化失败', async () => {
      wx.cloud.callFunction.mockRejectedValue(new Error('初始化失败'))

      await expect(pointsService.initUserPoints()).rejects.toThrow('初始化失败')
    })
  })

  describe('综合测试', () => {
    test('应该支持完整的积分流程', async () => {
      // 1. 初始化积分
      const initResult = { success: true, points: 1000 }
      wx.cloud.callFunction.mockResolvedValueOnce({ result: initResult })

      const init = await pointsService.initUserPoints()
      expect(init.points).toBe(1000)

      // 2. 发布车位获得奖励
      const addResult = { success: true, points: 1050 }
      wx.cloud.callFunction.mockResolvedValueOnce({ result: addResult })

      const add = await pointsService.addPoints(50, '发布车位')
      expect(add.points).toBe(1050)

      // 3. 预约扣除积分
      const deductResult = { success: true, points: 1040 }
      wx.cloud.callFunction.mockResolvedValueOnce({ result: deductResult })

      const deduct = await pointsService.deductPoints(10, '预约车位')
      expect(deduct.points).toBe(1040)

      // 4. 每日签到
      const checkInResult = {
        success: true,
        points: 1050,
        reward: 10,
        consecutiveDays: 1
      }
      wx.cloud.callFunction.mockResolvedValueOnce({ result: checkInResult })

      const checkIn = await pointsService.checkIn()
      expect(checkIn.points).toBe(1050)
      expect(checkIn.consecutiveDays).toBe(1)
    })
  })

  describe('边界情况', () => {
    test('应该处理零积分操作', async () => {
      const mockResult = { success: true, points: 1000 }
      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await pointsService.addPoints(0, '测试')
      expect(result.success).toBe(true)
    })

    test('应该处理大额积分操作', async () => {
      const mockResult = { success: true, points: 10000 }
      wx.cloud.callFunction.mockResolvedValue({ result: mockResult })

      const result = await pointsService.addPoints(5000, '大额奖励')
      expect(result.success).toBe(true)
      expect(result.points).toBe(10000)
    })

    test('应该处理积分不足无法扣除的情况', async () => {
      wx.cloud.callFunction.mockRejectedValue(new Error('积分不足'))

      await expect(pointsService.deductPoints(10, '测试')).rejects.toThrow('积分不足')
    })
  })
})
