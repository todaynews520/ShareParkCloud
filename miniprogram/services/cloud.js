// services/cloud.js - 云开发服务封装

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {object} data - 传递参数
 * @returns {Promise}
 */
function callFunction(name, data = {}) {
  return wx.cloud.callFunction({
    name,
    data
  }).then(res => {
    if (res.result && res.result.success) {
      return res.result
    }
    throw new Error(res.result?.message || '操作失败')
  })
}

module.exports = {
  callFunction
}
