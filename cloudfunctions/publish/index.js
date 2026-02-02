// cloudfunctions/publish/index.js - 发布车位云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, userId, publishData, publishId } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    switch (action) {
      case 'create':
        // 检查是否重复发布（相同车位号、日期、时间段）
        const { spotNumber, date, startTime, endTime, location } = publishData

        console.log('[发布校验] 开始检查:', { spotNumber, date, startTime, endTime })

        // 将时间字符串转换为分钟数进行比较
        const timeToMinutes = (timeStr) => {
          const [hours, minutes] = timeStr.split(':').map(Number)
          return hours * 60 + minutes
        }

        const newStart = timeToMinutes(startTime)
        const newEnd = timeToMinutes(endTime)

        // 查询相同车位号和日期的发布（包括已取消的，用于日志）
        const duplicateCheck = await db.collection('parking_releases')
          .where({
            spotNumber: spotNumber,
            date: date
          })
          .get()

        console.log('[发布校验] 查询结果:', duplicateCheck.data.length, '条记录')

        // 检查时间段是否重叠（排除已取消的）
        const hasTimeConflict = duplicateCheck.data.some(existing => {
          // 跳过已取消的发布
          if (existing.status === 'cancelled') {
            return false
          }

          const existingStart = timeToMinutes(existing.startTime)
          const existingEnd = timeToMinutes(existing.endTime)

          console.log('[发布校验] 比对:', {
            existing: `${existing.startTime}-${existing.endTime}`,
            new: `${startTime}-${endTime}`,
            existingStart,
            existingEnd,
            newStart,
            newEnd
          })

          // 时间重叠判断：两个时间段有交集
          const isConflict = !(newEnd <= existingStart || newStart >= existingEnd)

          if (isConflict) {
            console.log('[发布校验] 发现时间冲突!')
          }

          return isConflict
        })

        if (hasTimeConflict) {
          console.log('[发布校验] 拒绝发布: 时间段冲突')
          return {
            success: false,
            message: '该车位在此时间段已被发布，请选择其他时间'
          }
        }

        console.log('[发布校验] 通过，开始创建发布')

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
          data: listRes.data
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
