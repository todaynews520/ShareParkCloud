// cloudfunctions/reserve/index.js - 预约车位云函数（使用事务）
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 预约车位云函数
 * 使用数据库事务确保：
 * 1. 车位状态更新和预约记录创建同时成功或同时失败
 * 2. 避免并发预约导致的数据不一致
 */
exports.main = async (event, context) => {
  const { openid } = cloud.getWXContext();
  const { releaseId, plateNumber, role, userInfo } = event;

  // 参数验证
  if (!releaseId || !plateNumber) {
    return {
      success: false,
      errMsg: '参数不完整'
    };
  }

  try {
    // 使用事务确保原子性
    const transaction = await db.startTransaction();

    try {
      // 1. 在事务中查询并锁定车位发布记录
      const releaseRes = await transaction.collection('parking_releases')
        .doc(releaseId)
        .get();

      if (!releaseRes.data) {
        await transaction.rollback();
        return {
          success: false,
          errMsg: '车位信息不存在'
        };
      }

      // 2. 检查车位状态
      if (releaseRes.data.status !== 'available') {
        await transaction.rollback();
        return {
          success: false,
          errMsg: '该车位已被预约'
        };
      }

      // 3. 在事务中更新车位状态
      await transaction.collection('parking_releases')
        .doc(releaseId)
        .update({
          data: {
            status: 'reserved',
            reserve_time: new Date().getTime()
          }
        });

      // 4. 在事务中创建预约记录
      const reservationRes = await transaction.collection('reservations')
        .add({
          data: {
            release_id: releaseId,
            user_id: openid,
            user_nickname: userInfo?.nickname || '业主',
            plate_number: plateNumber,
            role: role || 'owner',
            spot_number: releaseRes.data.parking_id?.spot_number || '未知',
            date: releaseRes.data.date,
            start_time: releaseRes.data.start_time,
            end_time: releaseRes.data.end_time,
            status: 'confirmed',
            reserve_time: new Date().getTime()
          }
        });

      // 5. 提交事务
      await transaction.commit();

      return {
        success: true,
        reservationId: reservationRes._id,
        message: '预约成功'
      };

    } catch (err) {
      // 发生错误，回滚事务
      await transaction.rollback();
      throw err;
    }

  } catch (err) {
    console.error('预约失败:', err);
    return {
      success: false,
      errMsg: err.message || '预约失败，请重试'
    };
  }
};
