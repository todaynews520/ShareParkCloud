// cloudfunctions/publish/index.js - 发布车位云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

function normalizeSpot(record = {}) {
  return {
    ...record,
    spotNumber: record.spotNumber ?? record.spot_number ?? record.schedule?.spotNumber,
    startTime: record.startTime ?? record.start_time ?? record.schedule?.startTime,
    endTime: record.endTime ?? record.end_time ?? record.schedule?.endTime,
    duration: record.duration ?? record.schedule?.duration
  }
}

exports.main = async (event, context) => {
  const { action, userId, publishData, publishId } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    switch (action) {
      case 'create':
        // 创建发布
        const createRes = await db.collection('parking_releases').add({
          data: {
            userId: openid,
            spotNumber: publishData.spotNumber,
            location: publishData.location || {
              name: '未知位置',
              address: '',
              latitude: 0,
              longitude: 0
            },
            // 将 schedule 展开，方便查询
            date: publishData.date,
            startTime: publishData.startTime,
            endTime: publishData.endTime,
            duration: publishData.duration,
            // 同时保留 schedule 对象
            schedule: {
              date: publishData.date,
              startTime: publishData.startTime,
              endTime: publishData.endTime,
              duration: publishData.duration
            },
            price: publishData.price,
            features: publishData.features || {},
            status: 'available',
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        })

        return {
          success: true,
          publishId: createRes._id
        }

      case 'list':
        // 获取我的发布列表
        const listRes = await db.collection('parking_releases')
          .where({
            userId: openid,
            status: _.neq('cancelled')
          })
          .orderBy('createdAt', 'desc')
          .get()

        return {
          success: true,
          data: (listRes.data || []).map(normalizeSpot)
        }

      case 'cancel':
        // 取消发布
        await db.collection('parking_releases').doc(publishId).update({
          data: {
            status: 'cancelled',
            updatedAt: db.serverDate()
          }
        })

        return {
          success: true
        }

      default:
        return {
          success: false,
          message: '未知操作'
        }
    }

  } catch (err) {
    console.error('发布操作失败:', err)
    return {
      success: false,
      message: err.message
    }
  }
}
