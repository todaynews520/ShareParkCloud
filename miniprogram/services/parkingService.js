// services/parkingService.js - 车位服务
const cloudService = require('./cloud.js')

/**
 * 获取车位列表
 * @param {object} params - 查询参数
 */
function getParkingList(params = {}) {
  const app = getApp()
  const db = app.getDB()
  const _ = db.command

  const {
    status = 'available',
    limit = 20,
    skip = 0
  } = params

  // 只查询需要的字段，减少数据传输
  return db.collection('parking_releases')
    .field({
      _id: true,
      parking_id: true,
      owner_id: true,
      spot_number: true,
      date: true,
      start_time: true,
      end_time: true,
      price: true,
      location: true,
      status: true,
      create_time: true
    })
    .where({
      status,
      date: _.gte(new Date().toISOString().split('T')[0])
    })
    .orderBy('date', 'asc')
    .orderBy('start_time', 'asc')
    .limit(limit)
    .skip(skip)
    .get()
}

/**
 * 获取车位详情
 * @param {string} spotId - 车位ID
 */
function getParkingDetail(spotId) {
  const app = getApp()
  const db = app.getDB()

  return db.collection('parking_releases').doc(spotId).get()
}

/**
 * 创建车位发布
 * @param {object} data - 发布数据
 */
function createPublish(data) {
  return cloudService.callFunction('publish', {
    action: 'create',
    publishData: data
  })
}

/**
 * 获取我的发布列表
 * @param {string} userId - 用户ID
 */
function getMyPublishList(userId) {
  return cloudService.callFunction('publish', {
    action: 'list',
    userId
  })
}

/**
 * 取消发布
 * @param {string} publishId - 发布ID
 */
function cancelPublish(publishId) {
  return cloudService.callFunction('publish', {
    action: 'cancel',
    publishId
  })
}

module.exports = {
  getParkingList,
  getParkingDetail,
  createPublish,
  getMyPublishList,
  cancelPublish
}
