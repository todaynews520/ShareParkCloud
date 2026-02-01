/**
 * 通用工具函数集合
 */

/**
 * 获取当前日期 (YYYY-MM-DD)
 */
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取当前时间 (HH:mm)
 */
function getCurrentTime() {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

/**
 * 时间字符串转换为分钟数
 * @param {string} timeStr - 格式: HH:mm
 * @returns {number} 分钟数
 */
function timeStringToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const h = isNaN(hours) ? 0 : hours;
  const m = isNaN(minutes) ? 0 : minutes;
  return h * 60 + m;
}

/**
 * 分钟数转换为时间字符串
 * @param {number} totalMinutes - 总分钟数
 * @returns {string} 格式: HH:mm
 */
function minutesToTimeString(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * 比较两个时间段是否有重叠
 * @param {string} start1 - 开始时间 HH:mm
 * @param {string} end1 - 结束时间 HH:mm
 * @param {string} start2 - 开始时间 HH:mm
 * @param {string} end2 - 结束时间 HH:mm
 * @returns {boolean} 是否重叠
 */
function isTimeRangeOverlap(start1, end1, start2, end2) {
  const m1 = timeStringToMinutes(start1);
  const m2 = timeStringToMinutes(end1);
  const m3 = timeStringToMinutes(start2);
  const m4 = timeStringToMinutes(end2);

  // 判断两个时间段是否有重叠
  return m1 < m4 && m2 > m3;
}

/**
 * 生成随机车牌号
 * @returns {string} 随机车牌号
 */
function generateRandomPlate() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const provinces = ['京', '沪', '粤', '苏', '浙', '川', '鲁', '湘'];
  const province = provinces[Math.floor(Math.random() * provinces.length)];
  const letter = chars[Math.floor(Math.random() * chars.length)];
  const numbers = Math.floor(Math.random() * 899999) + 100000;
  return `${province}${letter}${numbers}`;
}

/**
 * 验证车牌号格式
 * @param {string} plate - 车牌号
 * @returns {boolean} 是否有效
 */
function validatePlate(plate) {
  // 简单验证：至少2个字符，包含字母或数字
  if (!plate || typeof plate !== 'string') return false;
  const trimmed = plate.trim();
  if (trimmed.length < 2) return false;
  // 可以添加更复杂的正则表达式验证
  return /^[A-Za-z0-9\u4e00-\u9fa5]+$/.test(trimmed);
}

/**
 * 格式化时间戳为日期字符串
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式: YYYY-MM-DD
 */
function formatTimestampToDateString(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化时间戳为完整时间字符串
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式: YYYY-MM-DD HH:mm
 */
function formatTimestampToDateTime(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * 显示提示信息
 * @param {string} title - 提示内容
 * @param {string} icon - 图标类型 success/error/loading/none
 */
function showToast(title, icon = 'none') {
  wx.showToast({
    title: title,
    icon: icon,
    duration: 2000
  });
}

/**
 * 显示模态框
 * @param {Object} options - 配置项
 */
function showModal(options) {
  wx.showModal({
    title: options.title || '提示',
    content: options.content || '',
    showCancel: options.showCancel !== false,
    confirmText: options.confirmText || '确定',
    cancelText: options.cancelText || '取消',
    confirmColor: options.confirmColor || '#667eea',
    success: options.success,
    fail: options.fail
  });
}

/**
 * 显示加载提示
 * @param {string} title - 提示内容
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title: title,
    mask: true
  });
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 防抖函数
 * @param {Function} func - 函数
 * @param {number} wait - 延迟时间
 * @returns {Function}
 */
function debounce(func, wait = 300) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func - 函数
 * @param {number} wait - 延迟时间
 * @returns {Function}
 */
function throttle(func, wait = 300) {
  let lastTime = 0;
  return function(...args) {
    const now = new Date().getTime();
    if (now - lastTime >= wait) {
      func.apply(this, args);
      lastTime = now;
    }
  };
}

/**
 * 获取距离今天的日期字符串
 * @param {number} days - 天数（正数为未来，负数为过去）
 * @returns {string} 格式: YYYY-MM-DD
 */
function getDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatTimestampToDateString(date.getTime());
}

/**
 * 格式化时长
 * @param {number} minutes - 分钟数
 * @returns {string} 格式化后的时长字符串
 */
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}分钟`;
  } else if (minutes % 60 === 0) {
    return `${minutes / 60}小时`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小时${mins}分钟`;
  }
}

module.exports = {
  getCurrentDate,
  getCurrentTime,
  timeStringToMinutes,
  minutesToTimeString,
  isTimeRangeOverlap,
  generateRandomPlate,
  validatePlate,
  formatTimestampToDateString,
  formatTimestampToDateTime,
  showToast,
  showModal,
  showLoading,
  hideLoading,
  sleep,
  debounce,
  throttle,
  getDateOffset,
  formatDuration
};
