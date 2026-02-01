/**
 * 统一表单验证工具类
 * 提供各种表单字段的验证功能
 */

/**
 * 验证结果类
 */
class ValidationResult {
  constructor(valid = true, message = '', field = '') {
    this.valid = valid;
    this.message = message;
    this.field = field;
  }

  /**
   * 创建成功结果
   */
  static success() {
    return new ValidationResult(true);
  }

  /**
   * 创建失败结果
   */
  static failure(message, field = '') {
    return new ValidationResult(false, message, field);
  }
}

/**
 * 验证器类
 */
class Validator {
  /**
   * 车牌号验证
   * 支持普通车牌和新能源车牌
   * @param {string} value - 车牌号
   * @param {Object} options - 验证选项
   */
  static plateNumber(value, options = {}) {
    const { required = true, allowEmpty = false } = options;

    // 必填验证
    if (required && !value) {
      return ValidationResult.failure('请输入车牌号', 'plateNumber');
    }

    if (!value && allowEmpty) {
      return ValidationResult.success();
    }

    const trimmed = value.trim();

    // 长度验证
    if (trimmed.length < 7 || trimmed.length > 8) {
      return ValidationResult.failure('车牌号长度应为7-8位', 'plateNumber');
    }

    // 格式验证（普通车牌：省份简称+字母+5位数字/字母）
    // 新能源车牌：8位
    const plateRegex = /^[\u4e00-\u9fa5][A-Z][A-HJ-NP-Z0-9]{5,6}$/;

    if (!plateRegex.test(trimmed)) {
      return ValidationResult.failure('车牌号格式不正确', 'plateNumber');
    }

    return ValidationResult.success();
  }

  /**
   * 时间范围验证
   * @param {string} startTime - 开始时间 HH:mm
   * @param {string} endTime - 结束时间 HH:mm
   * @param {Object} options - 验证选项
   */
  static timeRange(startTime, endTime, options = {}) {
    const { minDuration = 60, maxDuration = 24 * 60 } = options;

    if (!startTime || !endTime) {
      return ValidationResult.failure('请选择完整时间段', 'timeRange');
    }

    // 时间格式验证
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return ValidationResult.failure('时间格式不正确', 'timeRange');
    }

    // 转换为分钟数
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    // 结束时间必须大于开始时间
    if (end <= start) {
      return ValidationResult.failure('结束时间必须大于开始时间', 'timeRange');
    }

    // 时长验证
    const duration = end - start;
    if (duration < minDuration) {
      return ValidationResult.failure(`最小时长为${Math.floor(minDuration / 60)}小时`, 'timeRange');
    }

    if (duration > maxDuration) {
      return ValidationResult.failure(`最大时长为${Math.floor(maxDuration / 60)}小时`, 'timeRange');
    }

    return ValidationResult.success();
  }

  /**
   * 时间字符串转分钟数
   */
  static timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * 日期验证
   * @param {string} date - 日期字符串 YYYY-MM-DD
   * @param {Object} options - 验证选项
   */
  static date(date, options = {}) {
    const { required = true, minDate, maxDate, allowPast = false } = options;

    if (required && !date) {
      return ValidationResult.failure('请选择日期', 'date');
    }

    if (!date) {
      return ValidationResult.success();
    }

    // 格式验证
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return ValidationResult.failure('日期格式不正确', 'date');
    }

    const dateObj = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 不允许过去日期
    if (!allowPast && dateObj < today) {
      return ValidationResult.failure('不能选择过去的日期', 'date');
    }

    // 最小日期验证
    if (minDate) {
      const minDateObj = new Date(minDate);
      if (dateObj < minDateObj) {
        return ValidationResult.failure(`日期不能早于${minDate}`, 'date');
      }
    }

    // 最大日期验证
    if (maxDate) {
      const maxDateObj = new Date(maxDate);
      if (dateObj > maxDateObj) {
        return ValidationResult.failure(`日期不能晚于${maxDate}`, 'date');
      }
    }

    return ValidationResult.success();
  }

  /**
   * 车位号验证
   * @param {string} value - 车位号
   * @param {Object} options - 验证选项
   */
  static spotNumber(value, options = {}) {
    const { required = true, minLength = 1, maxLength = 10, pattern } = options;

    if (required && !value) {
      return ValidationResult.failure('请输入车位号', 'spotNumber');
    }

    if (!value) {
      return ValidationResult.success();
    }

    const trimmed = value.trim();

    // 长度验证
    if (trimmed.length < minLength || trimmed.length > maxLength) {
      return ValidationResult.failure(`车位号长度应为${minLength}-${maxLength}位`, 'spotNumber');
    }

    // 自定义正则验证
    if (pattern && !pattern.test(trimmed)) {
      return ValidationResult.failure('车位号格式不正确', 'spotNumber');
    }

    // 默认格式：支持数字、字母、中文
    if (!/^[\u4e00-\u9fa5A-Za-z0-9\-]+$/.test(trimmed)) {
      return ValidationResult.failure('车位号只能包含数字、字母、中文和连字符', 'spotNumber');
    }

    return ValidationResult.success();
  }

  /**
   * 必填验证
   * @param {*} value - 验证值
   * @param {string} fieldName - 字段名称
   */
  static required(value, fieldName = '字段') {
    if (value === null || value === undefined || value === '') {
      return ValidationResult.failure(`请输入${fieldName}`, fieldName);
    }

    if (typeof value === 'string' && value.trim() === '') {
      return ValidationResult.failure(`请输入${fieldName}`, fieldName);
    }

    if (Array.isArray(value) && value.length === 0) {
      return ValidationResult.failure(`请选择${fieldName}`, fieldName);
    }

    return ValidationResult.success();
  }

  /**
   * 长度验证
   * @param {string} value - 验证值
   * @param {number} min - 最小长度
   * @param {number} max - 最大长度
   * @param {string} fieldName - 字段名称
   */
  static length(value, min, max, fieldName = '字段') {
    if (!value) {
      return ValidationResult.success();
    }

    const len = value.trim().length;

    if (min !== undefined && len < min) {
      return ValidationResult.failure(`${fieldName}长度不能少于${min}位`, fieldName);
    }

    if (max !== undefined && len > max) {
      return ValidationResult.failure(`${fieldName}长度不能超过${max}位`, fieldName);
    }

    return ValidationResult.success();
  }

  /**
   * 数值范围验证
   * @param {number} value - 验证值
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @param {string} fieldName - 字段名称
   */
  static range(value, min, max, fieldName = '字段') {
    if (value === null || value === undefined || value === '') {
      return ValidationResult.success();
    }

    const num = Number(value);

    if (isNaN(num)) {
      return ValidationResult.failure(`${fieldName}必须是数字`, fieldName);
    }

    if (min !== undefined && num < min) {
      return ValidationResult.failure(`${fieldName}不能小于${min}`, fieldName);
    }

    if (max !== undefined && num > max) {
      return ValidationResult.failure(`${fieldName}不能大于${max}`, fieldName);
    }

    return ValidationResult.success();
  }

  /**
   * 手机号验证
   * @param {string} value - 手机号
   */
  static mobile(value) {
    if (!value) {
      return ValidationResult.failure('请输入手机号', 'mobile');
    }

    const trimmed = value.trim();
    const mobileRegex = /^1[3-9]\d{9}$/;

    if (!mobileRegex.test(trimmed)) {
      return ValidationResult.failure('手机号格式不正确', 'mobile');
    }

    return ValidationResult.success();
  }

  /**
   * 邮箱验证
   * @param {string} value - 邮箱地址
   */
  static email(value) {
    if (!value) {
      return ValidationResult.success();
    }

    const trimmed = value.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(trimmed)) {
      return ValidationResult.failure('邮箱格式不正确', 'email');
    }

    return ValidationResult.success();
  }

  /**
   * 身份证号验证
   * @param {string} value - 身份证号
   */
  static idCard(value) {
    if (!value) {
      return ValidationResult.success();
    }

    const trimmed = value.trim();
    const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]$/;

    if (!idCardRegex.test(trimmed)) {
      return ValidationResult.failure('身份证号格式不正确', 'idCard');
    }

    // 验证校验码
    const factors = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(trimmed[i]) * factors[i];
    }

    const checkCode = checkCodes[sum % 11];
    if (trimmed[17].toUpperCase() !== checkCode) {
      return ValidationResult.failure('身份证号校验位不正确', 'idCard');
    }

    return ValidationResult.success();
  }
}

/**
 * 表单验证器 - 批量验证表单字段
 */
class FormValidator {
  constructor() {
    this.rules = [];
  }

  /**
   * 添加验证规则
   * @param {string} field - 字段名
   * @param {*} value - 字段值
   * @param {Array} validators - 验证函数数组
   */
  addRule(field, value, validators) {
    this.rules.push({ field, value, validators });
    return this;
  }

  /**
   * 执行验证
   * @returns {ValidationResult}
   */
  validate() {
    for (const rule of this.rules) {
      for (const validator of rule.validators) {
        const result = validator(rule.value);
        if (result instanceof ValidationResult) {
          if (!result.valid) {
            return result;
          }
        } else {
          // 支持直接返回函数的验证
          const funcResult = validator(rule.value);
          if (funcResult !== true && funcResult !== undefined) {
            return ValidationResult.failure(funcResult, rule.field);
          }
        }
      }
    }

    return ValidationResult.success();
  }

  /**
   * 清空验证规则
   */
  clear() {
    this.rules = [];
    return this;
  }
}

module.exports = {
  Validator,
  FormValidator,
  ValidationResult
};
