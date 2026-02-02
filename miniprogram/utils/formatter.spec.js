// miniprogram/utils/formatter.spec.js - 格式化工具单元测试
const formatter = require('./formatter')

describe('Formatter Utility', () => {
  describe('formatTime() - 格式化时间', () => {
    test('应该正确格式化默认时间格式', () => {
      const date = new Date('2024-01-15T14:30:25')
      expect(formatter.formatTime(date)).toBe('2024-01-15 14:30')
    })

    test('应该支持自定义格式', () => {
      const date = new Date('2024-01-15T14:30:25')
      expect(formatter.formatTime(date, 'YYYY/MM/DD')).toBe('2024/01/15')
    })

    test('应该正确格式化包含秒的时间', () => {
      const date = new Date('2024-01-15T14:30:25')
      expect(formatter.formatTime(date, 'YYYY-MM-DD HH:mm:ss')).toBe('2024-01-15 14:30:25')
    })

    test('应该处理字符串日期', () => {
      expect(formatter.formatTime('2024-01-15T14:30:25')).toBe('2024-01-15 14:30')
    })

    test('应该处理时间戳', () => {
      const timestamp = new Date('2024-01-15T14:30:25').getTime()
      expect(formatter.formatTime(timestamp)).toBe('2024-01-15 14:30')
    })

    test('应该处理无效日期', () => {
      expect(formatter.formatTime('invalid')).toBe('')
    })

    test('应该补零处理', () => {
      const date = new Date('2024-01-05T04:03:02')
      expect(formatter.formatTime(date)).toBe('2024-01-05 04:03')
    })

    test('应该处理午夜时间', () => {
      const date = new Date('2024-01-15T00:00:00')
      expect(formatter.formatTime(date)).toBe('2024-01-15 00:00')
    })
  })

  describe('formatDate() - 格式化日期', () => {
    test('应该返回 YYYY-MM-DD 格式', () => {
      const date = new Date('2024-01-15T14:30:25')
      expect(formatter.formatDate(date)).toBe('2024-01-15')
    })

    test('应该处理边界日期', () => {
      const date = new Date('2024-12-31')
      expect(formatter.formatDate(date)).toBe('2024-12-31')
    })

    test('应该处理年初日期', () => {
      const date = new Date('2024-01-01')
      expect(formatter.formatDate(date)).toBe('2024-01-01')
    })
  })

  describe('formatMoney() - 格式化金额', () => {
    test('应该正确格式化金额（分转元）', () => {
      expect(formatter.formatMoney(100)).toBe('¥1.00')
      expect(formatter.formatMoney(1000)).toBe('¥10.00')
      expect(formatter.formatMoney(10000)).toBe('¥100.00')
    })

    test('应该保留两位小数', () => {
      expect(formatter.formatMoney(123)).toBe('¥1.23')
      expect(formatter.formatMoney(12345)).toBe('¥123.45')
    })

    test('应该处理零值', () => {
      expect(formatter.formatMoney(0)).toBe('¥0.00')
    })

    test('应该处理非数字输入', () => {
      expect(formatter.formatMoney('abc')).toBe('¥0.00')
      expect(formatter.formatMoney(null)).toBe('¥0.00')
      expect(formatter.formatMoney(undefined)).toBe('¥0.00')
    })

    test('应该正确处理大额金额', () => {
      expect(formatter.formatMoney(999999)).toBe('¥9999.99')
    })
  })

  describe('timeDiff() - 计算时间差', () => {
    test('应该正确计算分钟差', () => {
      const start = new Date('2024-01-15T10:00:00')
      const end = new Date('2024-01-15T11:30:00')
      expect(formatter.timeDiff(start, end)).toBe(90)
    })

    test('应该处理负时间差', () => {
      const start = new Date('2024-01-15T11:30:00')
      const end = new Date('2024-01-15T10:00:00')
      expect(formatter.timeDiff(start, end)).toBe(-90)
    })

    test('应该处理跨天时间差', () => {
      const start = new Date('2024-01-15T23:00:00')
      const end = new Date('2024-01-16T01:00:00')
      expect(formatter.timeDiff(start, end)).toBe(120)
    })

    test('应该处理相同时刻', () => {
      const time = new Date('2024-01-15T10:00:00')
      expect(formatter.timeDiff(time, time)).toBe(0)
    })

    test('应该向上取整', () => {
      const start = new Date('2024-01-15T10:00:00')
      const end = new Date('2024-01-15T10:00:31') // 31秒
      expect(formatter.timeDiff(start, end)).toBe(1)
    })
  })

  describe('formatDuration() - 格式化时长', () => {
    test('应该正确格式化分钟', () => {
      expect(formatter.formatDuration(30)).toBe('30分钟')
      expect(formatter.formatDuration(59)).toBe('59分钟')
    })

    test('应该正确格式化小时', () => {
      expect(formatter.formatDuration(60)).toBe('1小时')
      expect(formatter.formatDuration(120)).toBe('2小时')
      expect(formatter.formatDuration(180)).toBe('3小时')
    })

    test('应该正确格式化小时和分钟', () => {
      expect(formatter.formatDuration(90)).toBe('1小时30分钟')
      expect(formatter.formatDuration(150)).toBe('2小时30分钟')
      expect(formatter.formatDuration(61)).toBe('1小时1分钟')
    })

    test('应该处理零值', () => {
      expect(formatter.formatDuration(0)).toBe('0分钟')
    })

    test('应该处理大时长', () => {
      expect(formatter.formatDuration(1440)).toBe('24小时')
      expect(formatter.formatDuration(1500)).toBe('25小时')
    })
  })

  describe('getRelativeTime() - 获取相对时间', () => {
    beforeAll(() => {
      // Mock 当前时间
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T12:00:00'))
    })

    afterAll(() => {
      jest.useRealTimers()
    })

    test('应该返回"刚刚"对于一分钟内的', () => {
      const date = new Date('2024-01-15T11:59:30')
      expect(formatter.getRelativeTime(date)).toBe('刚刚')
    })

    test('应该返回"X分钟前"对于一小时内', () => {
      const date = new Date('2024-01-15T11:30:00')
      expect(formatter.getRelativeTime(date)).toBe('30分钟前')
    })

    test('应该返回"X小时前"对于24小时内', () => {
      const date = new Date('2024-01-15T08:00:00')
      expect(formatter.getRelativeTime(date)).toBe('4小时前')
    })

    test('应该返回"X天前"对于7天内', () => {
      const date = new Date('2024-01-13T12:00:00')
      expect(formatter.getRelativeTime(date)).toBe('2天前')
    })

    test('应该返回日期对于超过7天的', () => {
      const date = new Date('2024-01-01T12:00:00')
      expect(formatter.getRelativeTime(date)).toBe('2024-01-01')
    })

    test('应该处理未来时间', () => {
      const date = new Date('2024-01-15T13:00:00')
      const result = formatter.getRelativeTime(date)
      // 未来时间也返回"刚刚"（因为差值为负，小于1分钟）
      expect(result).toBe('刚刚')
    })
  })

  describe('综合测试', () => {
    test('应该组合使用多个格式化函数', () => {
      const startTime = new Date('2024-01-15T10:00:00')
      const endTime = new Date('2024-01-15T14:30:00')

      const diff = formatter.timeDiff(startTime, endTime) // 270分钟
      const duration = formatter.formatDuration(diff) // 4小时30分钟

      expect(duration).toBe('4小时30分钟')
    })

    test('应该正确格式化预约时间显示', () => {
      const date = new Date('2024-01-15T14:30:00')
      const dateStr = formatter.formatDate(date) // 2024-01-15
      const timeStr = formatter.formatTime(date, 'HH:mm') // 14:30

      expect(`${dateStr} ${timeStr}`).toBe('2024-01-15 14:30')
    })
  })
})
