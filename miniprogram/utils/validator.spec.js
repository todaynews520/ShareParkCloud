// miniprogram/utils/validator.spec.js - 验证工具单元测试
const validator = require('./validator')

describe('Validator Utility', () => {
  describe('validatePlateNumber() - 验证车牌号', () => {
    test('应该接受普通7位车牌', () => {
      const result = validator.validatePlateNumber('京A12345')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('京A12345')
    })

    test('应该接受新能源8位车牌', () => {
      const result = validator.validatePlateNumber('京AD12345')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('京AD12345')
    })

    test('应该处理小写输入', () => {
      const result = validator.validatePlateNumber('京a12345')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('京A12345')
    })

    test('应该处理带点号的车牌', () => {
      const result = validator.validatePlateNumber('京A·12345')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('京A12345')
    })

    test('应该处理带句号的车牌', () => {
      const result = validator.validatePlateNumber('京A.12345')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('京A12345')
    })

    test('应该拒绝空输入', () => {
      const result = validator.validatePlateNumber('')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入车牌号')
    })

    test('应该拒绝null输入', () => {
      const result = validator.validatePlateNumber(null)
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入车牌号')
    })

    test('应该拒绝格式错误的车牌', () => {
      const result = validator.validatePlateNumber('INVALID')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('车牌号格式不正确')
    })

    test('应该拒绝过短的车牌', () => {
      const result = validator.validatePlateNumber('京A123')
      expect(result.valid).toBe(false)
    })

    test('应该接受特殊车牌', () => {
      expect(validator.validatePlateNumber('粤B12345挂').valid).toBe(true)
      expect(validator.validatePlateNumber('沪A12345学').valid).toBe(true)
      expect(validator.validatePlateNumber('京A12345警').valid).toBe(true)
    })

    test('应该接受港澳车牌', () => {
      expect(validator.validatePlateNumber('粤Z12345港').valid).toBe(true)
      expect(validator.validatePlateNumber('粤Z12345澳').valid).toBe(true)
    })
  })

  describe('formatPlateNumber() - 格式化车牌号', () => {
    test('应该正确格式化7位车牌', () => {
      expect(validator.formatPlateNumber('京A12345')).toBe('京A·12345')
    })

    test('应该正确格式化8位车牌', () => {
      expect(validator.formatPlateNumber('京AD12345')).toBe('京A·D12345')
    })

    test('应该处理小写输入', () => {
      expect(validator.formatPlateNumber('京a12345')).toBe('京A·12345')
    })

    test('应该移除已有点号', () => {
      expect(validator.formatPlateNumber('京A·12345')).toBe('京A·12345')
      expect(validator.formatPlateNumber('京A.12345')).toBe('京A·12345')
    })

    test('应该处理其他长度车牌', () => {
      // 非标准长度车牌不加分隔符
      expect(validator.formatPlateNumber('京A1234')).toBe('京A1234')
      // 6位车牌不加分隔符
      expect(validator.formatPlateNumber('粤B1234')).toBe('粤B1234')
      // 7位车牌加分隔符
      expect(validator.formatPlateNumber('粤B12345')).toBe('粤B·12345')
      // 9位车牌（特殊车牌）不加分隔符
      expect(validator.formatPlateNumber('粤B1234567')).toBe('粤B1234567')
    })
  })

  describe('validatePhone() - 验证手机号', () => {
    test('应该接受有效的手机号', () => {
      expect(validator.validatePhone('13812345678').valid).toBe(true)
      expect(validator.validatePhone('15912345678').valid).toBe(true)
      expect(validator.validatePhone('18612345678').valid).toBe(true)
    })

    test('应该接受各运营商号码', () => {
      // 中国移动
      expect(validator.validatePhone('13412345678').valid).toBe(true)
      expect(validator.validatePhone('13512345678').valid).toBe(true)
      expect(validator.validatePhone('13612345678').valid).toBe(true)
      expect(validator.validatePhone('13712345678').valid).toBe(true)
      expect(validator.validatePhone('13812345678').valid).toBe(true)
      expect(validator.validatePhone('13912345678').valid).toBe(true)
      expect(validator.validatePhone('15012345678').valid).toBe(true)

      // 中国联通
      expect(validator.validatePhone('13012345678').valid).toBe(true)
      expect(validator.validatePhone('13112345678').valid).toBe(true)
      expect(validator.validatePhone('13212345678').valid).toBe(true)
      expect(validator.validatePhone('15512345678').valid).toBe(true)
      expect(validator.validatePhone('15612345678').valid).toBe(true)
      expect(validator.validatePhone('18512345678').valid).toBe(true)

      // 中国电信
      expect(validator.validatePhone('13312345678').valid).toBe(true)
      expect(validator.validatePhone('15312345678').valid).toBe(true)
      expect(validator.validatePhone('18012345678').valid).toBe(true)
      expect(validator.validatePhone('18112345678').valid).toBe(true)
      expect(validator.validatePhone('18912345678').valid).toBe(true)
    })

    test('应该拒绝空输入', () => {
      const result = validator.validatePhone('')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入手机号')
    })

    test('应该拒绝null输入', () => {
      const result = validator.validatePhone(null)
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入手机号')
    })

    test('应该拒绝错误格式的手机号', () => {
      const result = validator.validatePhone('12345678901')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('手机号格式不正确')
    })

    test('应该拒绝过长的手机号', () => {
      const result = validator.validatePhone('138123456789')
      expect(result.valid).toBe(false)
    })

    test('应该拒绝过短的手机号', () => {
      const result = validator.validatePhone('1381234567')
      expect(result.valid).toBe(false)
    })

    test('应该拒绝非数字输入', () => {
      const result = validator.validatePhone('abcdefghijk')
      expect(result.valid).toBe(false)
    })
  })

  describe('validatePrice() - 验证价格', () => {
    test('应该接受有效价格', () => {
      expect(validator.validatePrice(5).valid).toBe(true)
      expect(validator.validatePrice(10).valid).toBe(true)
      expect(validator.validatePrice(25).valid).toBe(true)
    })

    test('应该接受边界值', () => {
      expect(validator.validatePrice(1).valid).toBe(true)
      expect(validator.validatePrice(50).valid).toBe(true)
    })

    test('应该接受字符串数字', () => {
      expect(validator.validatePrice('10').valid).toBe(true)
      expect(validator.validatePrice('25.5').valid).toBe(true)
    })

    test('应该拒绝空值', () => {
      const result = validator.validatePrice('')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入价格')
    })

    test('应该拒绝null', () => {
      const result = validator.validatePrice(null)
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入价格')
    })

    test('应该拒绝undefined', () => {
      const result = validator.validatePrice(undefined)
      expect(result.valid).toBe(false)
      expect(result.message).toBe('请输入价格')
    })

    test('应该拒绝超出范围的价格', () => {
      const result1 = validator.validatePrice(0)
      expect(result1.valid).toBe(false)
      expect(result1.message).toContain('1-50')

      const result2 = validator.validatePrice(51)
      expect(result2.valid).toBe(false)
      expect(result2.message).toContain('1-50')
    })

    test('应该拒绝非数字', () => {
      const result = validator.validatePrice('abc')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('价格格式不正确')
    })

    test('应该支持自定义范围', () => {
      expect(validator.validatePrice(100, 50, 200).valid).toBe(true)
      expect(validator.validatePrice(49, 50, 200).valid).toBe(false)
      expect(validator.validatePrice(201, 50, 200).valid).toBe(false)
    })
  })

  describe('综合测试', () => {
    test('应该组合使用多个验证器', () => {
      const plateResult = validator.validatePlateNumber('京A12345')
      const phoneResult = validator.validatePhone('13812345678')
      const priceResult = validator.validatePrice(10)

      expect(plateResult.valid && phoneResult.valid && priceResult.valid).toBe(true)
    })

    test('应该处理复杂验证场景', () => {
      // 场景：用户输入的车牌号格式化后验证
      const input = '京a.12345'
      const formatted = validator.formatPlateNumber(input)
      const validated = validator.validatePlateNumber(formatted)

      expect(formatted).toBe('京A·12345')
      expect(validated.valid).toBe(true)
    })
  })
})
