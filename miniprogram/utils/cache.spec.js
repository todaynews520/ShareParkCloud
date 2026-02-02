// miniprogram/utils/cache.spec.js - 缓存工具单元测试
const cache = require('./cache')

describe('Cache Utility', () => {
  // 每个测试前清除所有 mock
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('set() - 设置缓存', () => {
    test('应该正确存储字符串值', () => {
      cache.set('testKey', 'testValue')
      expect(wx.setStorageSync).toHaveBeenCalledWith(
        'testKey',
        JSON.stringify({ value: 'testValue', expire: null })
      )
    })

    test('应该正确存储对象值', () => {
      const testObj = { name: 'John', age: 30 }
      cache.set('user', testObj)
      expect(wx.setStorageSync).toHaveBeenCalledWith(
        'user',
        JSON.stringify({ value: testObj, expire: null })
      )
    })

    test('应该正确存储数组值', () => {
      const testArr = [1, 2, 3]
      cache.set('numbers', testArr)
      expect(wx.setStorageSync).toHaveBeenCalledWith(
        'numbers',
        JSON.stringify({ value: testArr, expire: null })
      )
    })

    test('应该正确设置过期时间', () => {
      cache.set('tempKey', 'tempValue', 60) // 60秒后过期
      const stored = JSON.parse(wx.setStorageSync.mock.calls[0][1])
      expect(stored.expire).toBeTruthy()
      expect(stored.expire).toBeGreaterThan(Date.now())
    })
  })

  describe('get() - 获取缓存', () => {
    test('应该正确返回存储的值', () => {
      const testValue = 'testValue'
      wx.getStorageSync.mockReturnValue(JSON.stringify({ value: testValue, expire: null }))

      const result = cache.get('testKey')
      expect(result).toBe(testValue)
    })

    test('当键不存在时返回 null', () => {
      wx.getStorageSync.mockReturnValue(null)

      const result = cache.get('nonExistentKey')
      expect(result).toBeNull()
    })

    test('当数据过期时返回 null 并删除缓存', () => {
      const expiredData = JSON.stringify({
        value: 'expiredValue',
        expire: Date.now() - 1000 // 已过期
      })
      wx.getStorageSync.mockReturnValue(expiredData)

      const result = cache.get('expiredKey')
      expect(result).toBeNull()
      expect(wx.removeStorageSync).toHaveBeenCalledWith('expiredKey')
    })

    test('应该正确解析 JSON 数据', () => {
      const testObj = { name: 'Test', value: 123 }
      wx.getStorageSync.mockReturnValue(JSON.stringify({ value: testObj, expire: null }))

      const result = cache.get('objKey')
      expect(result).toEqual(testObj)
    })

    test('当 JSON 解析失败时返回 null', () => {
      wx.getStorageSync.mockReturnValue('invalid json')

      const result = cache.get('badKey')
      expect(result).toBeNull()
    })
  })

  describe('remove() - 删除缓存', () => {
    test('应该正确删除指定键的缓存', () => {
      cache.remove('testKey')
      expect(wx.removeStorageSync).toHaveBeenCalledWith('testKey')
    })

    test('应该能够连续删除多个键', () => {
      cache.remove('key1')
      cache.remove('key2')
      cache.remove('key3')

      expect(wx.removeStorageSync).toHaveBeenCalledTimes(3)
      expect(wx.removeStorageSync).toHaveBeenNthCalledWith(1, 'key1')
      expect(wx.removeStorageSync).toHaveBeenNthCalledWith(2, 'key2')
      expect(wx.removeStorageSync).toHaveBeenNthCalledWith(3, 'key3')
    })
  })

  describe('clear() - 清空所有缓存', () => {
    test('应该调用微信 API 清空所有存储', () => {
      cache.clear()
      expect(wx.clearStorageSync).toHaveBeenCalled()
    })

    test('应该能够连续多次调用', () => {
      cache.clear()
      cache.clear()

      expect(wx.clearStorageSync).toHaveBeenCalledTimes(2)
    })
  })

  describe('缓存过期功能', () => {
    test('未过期的数据应该能正确获取', () => {
      const futureTime = Date.now() + 10000 // 10秒后过期
      const data = JSON.stringify({
        value: 'futureValue',
        expire: futureTime
      })
      wx.getStorageSync.mockReturnValue(data)

      const result = cache.get('futureKey')
      expect(result).toBe('futureValue')
    })

    test('刚设置的数据应该立即可用', () => {
      // Mock set 后立即 get
      const testValue = 'immediateValue'
      wx.getStorageSync.mockReturnValue(JSON.stringify({ value: testValue, expire: null }))

      cache.set('immediateKey', testValue)
      const result = cache.get('immediateKey')

      expect(result).toBe(testValue)
    })
  })

  describe('边界情况', () => {
    test('应该处理 null 值', () => {
      cache.set('nullKey', null)
      expect(wx.setStorageSync).toHaveBeenCalled()
    })

    test('应该处理 undefined 值', () => {
      cache.set('undefinedKey', undefined)
      expect(wx.setStorageSync).toHaveBeenCalled()
    })

    test('应该处理数字 0', () => {
      cache.set('zeroKey', 0)
      expect(wx.setStorageSync).toHaveBeenCalled()
    })

    test('应该处理空字符串', () => {
      cache.set('emptyKey', '')
      expect(wx.setStorageSync).toHaveBeenCalled()
    })

    test('应该处理特殊字符', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/'
      cache.set('specialKey', specialChars)
      expect(wx.setStorageSync).toHaveBeenCalled()
    })
  })

  describe('性能测试', () => {
    test('应该能快速设置大量数据', () => {
      const start = Date.now()
      for (let i = 0; i < 1000; i++) {
        cache.set(`key${i}`, `value${i}`)
      }
      const duration = Date.now() - start
      expect(duration).toBeLessThan(100) // 应该在100ms内完成
    })

    test('应该能快速获取大量数据', () => {
      // 预设 mock 返回值
      wx.getStorageSync.mockImplementation((key) => {
        return JSON.stringify({ value: `value${key}`, expire: null })
      })

      const start = Date.now()
      for (let i = 0; i < 1000; i++) {
        cache.get(`key${i}`)
      }
      const duration = Date.now() - start
      expect(duration).toBeLessThan(100)
    })
  })
})
