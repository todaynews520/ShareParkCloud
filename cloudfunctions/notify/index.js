// cloudfunctions/notify/index.js - 订阅消息云函数
const cloud = require('wx-server-sdk');
const TEMPLATE_IDS = require('./config.js');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前环境
});

/**
 * 云函数入口函数
 * @param {Object} event - 事件参数
 * @param {string} event.type - 通知类型: 'reservation_success' | 'reservation_cancel' | 'property_notify'
 * @param {string} event.touser - 接收者的openid
 * @param {string} event.page - 点击消息跳转的小程序页面路径
 * @param {Object} event.data - 模板消息数据
 * @param {string} event.reservationId - 预约ID（可选，用于查询数据库）
 */
exports.main = async (event, context) => {
  const { type, touser, page, data, reservationId } = event;

  try {
    // 如果提供了预约ID，从数据库查询预约信息
    let messageData = data;
    if (reservationId && !data) {
      const reservationRes = await cloud.database().collection('reservations')
        .doc(reservationId)
        .get();

      if (!reservationRes.data) {
        return {
          success: false,
          errMsg: '预约记录不存在'
        };
      }

      const reservation = reservationRes.data;
      messageData = {
        thing1: { value: reservation.spot_number || '未知' }, // 车位号
        thing2: { value: `${reservation.date} ${reservation.start_time}-${reservation.end_time}` }, // 预约时间
        thing3: { value: reservation.plate_number || '未填写' }, // 车牌号
        thing4: { value: '共享车位' }, // 小程序名称
        date5: { value: reservation.date || '' } // 日期
      };
    }

    // 根据类型选择模板ID
    let templateId;
    switch (type) {
      case 'reservation_success':
        templateId = TEMPLATE_IDS.RESERVATION_SUCCESS;
        break;
      case 'reservation_cancel':
        templateId = TEMPLATE_IDS.RESERVATION_CANCEL;
        break;
      case 'property_notify':
        templateId = TEMPLATE_IDS.PROPERTY_NOTIFY;
        break;
      default:
        templateId = TEMPLATE_IDS.RESERVATION_SUCCESS;
    }

    // 检查模板ID是否已配置
    if (templateId.includes('TEMPLATE_ID')) {
      console.warn('模板消息ID未配置，请在notify/index.js中配置TEMPLATE_IDS');
      return {
        success: false,
        errMsg: '模板消息ID未配置'
      };
    }

    // 发送订阅消息
    const result = await cloud.openapi.subscribeMessage.send({
      touser: touser,
      templateId: templateId,
      page: page || '/pages/index/index',
      data: messageData,
      miniprogramState: 'formal' // 正式版：formal，开发版：developer，体验版：trial
    });

    console.log('订阅消息发送成功:', result);

    return {
      success: true,
      message: '订阅消息发送成功',
      data: result
    };
  } catch (err) {
    console.error('发送订阅消息失败:', err);

    // 错误处理
    let errMsg = '发送订阅消息失败';
    if (err.errCode) {
      switch (err.errCode) {
        case 40003:
          errMsg = 'touser字段openid为空或错误';
          break;
        case 40037:
          errMsg = '订阅模板id为空或不正确';
          break;
        case 43101:
          errMsg = '用户拒绝接受消息，或用户没有订阅该模板';
          break;
        case 47003:
          errMsg = '模板参数不准确，可能为空或不满足规则';
          break;
        default:
          errMsg = `错误码: ${err.errCode}, ${err.errMsg}`;
      }
    }

    return {
      success: false,
      errMsg: errMsg,
      errCode: err.errCode,
      detail: err.errMsg
    };
  }
};
