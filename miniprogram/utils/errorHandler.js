/**
 * 统一错误处理工具类
 * 提供错误捕获、处理、上报等功能
 */

// 错误码映射表
const ERROR_CODE_MAP = {
  // 网络错误
  'NETWORK_ERROR': '网络错误，请检查网络连接',
  'TIMEOUT': '请求超时，请重试',

  // 数据库错误
  'DATABASE_ERROR': '数据库操作失败',
  '-502005': '集合不存在',

  // 权限错误
  'PERMISSION_DENIED': '权限不足',
  'UNAUTHORIZED': '未登录或登录已过期',

  // 业务错误
  'PARKING_NOT_AVAILABLE': '车位已被预约',
  'PARKING_NOT_FOUND': '车位信息不存在',
  'INVALID_PLATE_NUMBER': '车牌号格式不正确',
  'TIME_RANGE_CONFLICT': '时间段冲突',

  // 通用错误
  'UNKNOWN_ERROR': '操作失败，请重试'
};

/**
 * 错误处理器类
 */
class ErrorHandler {
  /**
   * 处理错误
   * @param {Error|Object} error - 错误对象
   * @param {Object} options - 配置选项
   * @param {string} options.context - 错误上下文（如：'loadParkingList'）
   * @param {boolean} options.showToast - 是否显示Toast提示
   * @param {boolean} options.report - 是否上报错误
   * @param {Function} options.onRetry - 重试回调
   */
  static handle(error, options = {}) {
    const {
      context = '',
      showToast = true,
      report = true,
      onRetry = null
    } = options;

    // 打印错误日志
    this.log(error, context);

    // 显示用户提示
    if (showToast) {
      const message = this.getUserMessage(error);
      wx.showToast({
        title: message,
        icon: 'none',
        duration: 2000
      });
    }

    // 上报错误（生产环境）
    if (report && this.shouldReport(error)) {
      this.report(error, context);
    }

    // 提供重试选项
    if (onRetry && this.shouldRetry(error)) {
      setTimeout(() => {
        wx.showModal({
          title: '操作失败',
          content: '是否重试？',
          confirmText: '重试',
          success: (res) => {
            if (res.confirm) {
              onRetry();
            }
          }
        });
      }, 500);
    }
  }

  /**
   * 记录错误日志
   */
  static log(error, context) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    console.error(`${timestamp} ${contextStr} Error:`, error);

    // 可以扩展：写入本地日志文件用于调试
  }

  /**
   * 获取用户友好的错误信息
   */
  static getUserMessage(error) {
    // 根据错误码获取
    if (error.errCode && ERROR_CODE_MAP[error.errCode]) {
      return ERROR_CODE_MAP[error.errCode];
    }

    // 根据错误消息匹配
    if (error.message) {
      const msg = error.message.toLowerCase();
      if (msg.includes('network')) return ERROR_CODE_MAP.NETWORK_ERROR;
      if (msg.includes('timeout')) return ERROR_CODE_MAP.TIMEOUT;
      if (msg.includes('permission')) return ERROR_CODE_MAP.PERMISSION_DENIED;
    }

    // 默认消息
    return error.message || ERROR_CODE_MAP.UNKNOWN_ERROR;
  }

  /**
   * 判断是否应该上报错误
   */
  static shouldReport(error) {
    // 开发环境不上报
    const ENV = require('../config/env').ENV;
    if (ENV === 'development') {
      return false;
    }

    // 排除一些不需要上报的错误
    const ignoreCodes = ['-502005']; // 集合不存在等
    if (error.errCode && ignoreCodes.includes(error.errCode)) {
      return false;
    }

    return true;
  }

  /**
   * 判断是否可以重试
   */
  static shouldRetry(error) {
    // 网络错误、超时等可重试
    if (error.errMsg) {
      const msg = error.errMsg.toLowerCase();
      return msg.includes('network') || msg.includes('timeout');
    }
    return false;
  }

  /**
   * 上报错误到监控平台
   */
  static report(error, context) {
    // TODO: 接入错误监控平台（如：微信小程序实时日志、Bugly等）
    try {
      const reportData = {
        timestamp: new Date().getTime(),
        context: context,
        errorMessage: error.message || error.errMsg || '',
        errorCode: error.errCode || '',
        stack: error.stack || '',
        userInfo: this.getUserInfo(),
        systemInfo: this.getSystemInfo()
      };

      // 示例：写入本地存储用于后续上传
      const errorLogs = wx.getStorageSync('error_logs') || [];
      errorLogs.push(reportData);
      // 只保留最近100条
      if (errorLogs.length > 100) {
        errorLogs.shift();
      }
      wx.setStorageSync('error_logs', errorLogs);

    } catch (e) {
      console.error('上报错误失败:', e);
    }
  }

  /**
   * 获取用户信息（脱敏）
   */
  static getUserInfo() {
    const app = getApp();
    const userInfo = app.globalData.userInfo || {};
    const openid = app.globalData.openid || wx.getStorageSync('openid');

    return {
      openid: openid ? openid.substring(0, 8) + '***' : '',
      nickname: userInfo.nickname || '未知'
    };
  }

  /**
   * 获取系统信息
   */
  static getSystemInfo() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      return {
        brand: systemInfo.brand,
        model: systemInfo.model,
        system: systemInfo.system,
        platform: systemInfo.platform,
        SDKVersion: systemInfo.SDKVersion
      };
    } catch (e) {
      return {};
    }
  }

  /**
   * 异步包装器 - 自动处理错误
   * @param {Function} fn - 异步函数
   * @param {Object} options - 错误处理选项
   */
  static async try(fn, options = {}) {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, options);
      throw error;
    }
  }

  /**
   * 显示错误模态框
   */
  static showModal(error, options = {}) {
    const {
      title = '操作失败',
      confirmText = '确定',
      showCancel = false
    } = options;

    const message = this.getUserMessage(error);

    return new Promise((resolve) => {
      wx.showModal({
        title,
        content: message,
        showCancel,
        confirmText,
        success: (res) => {
          if (res.confirm) {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      });
    });
  }
}

module.exports = ErrorHandler;
