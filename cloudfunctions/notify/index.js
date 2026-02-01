// cloudfunctions/notify/index.js - 通知云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloud1-4gu1xbu13e161c48' // 云开发环境ID
});

/**
 * 云函数入口函数
 */
exports.main = async (event, context) => {
  const { reservationId, propertyId, propertyOpenid, message } = event;

  try {
    // 查询预约信息
    const reservationRes = await cloud.database().collection('reservations')
      .doc(reservationId)
      .get();

    const reservation = reservationRes.data;

    // 获取车位信息
    const spotNumber = reservation.spot_number;
    const date = reservation.date;
    const startTime = reservation.start_time;
    const endTime = reservation.end_time;

    // 构造通知消息内容
    const notificationContent = {
      thing1: { value: spotNumber }, // 车位号
      thing2: { value: `${date} ${startTime}-${endTime}` }, // 时间段
      thing3: { value: reservation.plate_number || '' }, // 车牌号
      thing4: { value: '车位预约通知' }, // 标题
      time5: { value: new Date().toLocaleString() } // 时间
    };

    // 这里需要配置微信小程序模板消息
    // 注意：实际使用时需要在微信公众平台配置模板消息
    // 并且用户需要先订阅模板消息

    return {
      success: true,
      message: '通知发送成功',
      content: notificationContent
    };
  } catch (err) {
    console.error('发送通知失败:', err);
    return {
      success: false,
      errMsg: err.message || '发送通知失败'
    };
  }
};
