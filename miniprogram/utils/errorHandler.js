// utils/errorHandler.js - 错误处理封装

/**
 * 统一错误处理
 * @param {Error} error - 错误对象
 * @param {string} defaultMessage - 默认错误消息
 */
function handleError(error, defaultMessage = '操作失败') {
  console.error('Error:', error)

  let message = defaultMessage

  // 云函数错误
  if (error.errCode) {
    switch (error.errCode) {
      case -1:
        message = '网络错误，请检查网络连接'
        break
      case 401:
        message = '未授权，请重新登录'
        break
      case 404:
        message = '请求的资源不存在'
        break
      case 500:
        message = '服务器错误，请稍后重试'
        break
      default:
        message = error.errMsg || defaultMessage
    }
  } else if (error.message) {
    message = error.message
  }

  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2000
  })

  return message
}

/**
 * 显示提示信息
 * @param {string} title - 标题
 * @param {string} icon - 图标类型 success/error/loading/none
 */
function showToast(title, icon = 'none') {
  wx.showToast({
    title,
    icon,
    duration: 2000
  })
}

/**
 * 显示加载中
 * @param {string} title - 标题
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  })
}

/**
 * 隐藏加载中
 */
function hideLoading() {
  wx.hideLoading()
}

/**
 * 显示确认对话框
 * @param {string} content - 内容
 * @param {string} title - 标题
 * @returns {Promise<boolean>} 用户是否确认
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm)
      },
      fail: () => resolve(false)
    })
  })
}

module.exports = {
  handleError,
  showToast,
  showLoading,
  hideLoading,
  showConfirm
}
