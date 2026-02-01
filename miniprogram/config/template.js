/**
 * 订阅消息模板ID配置
 *
 * 使用说明:
 * 1. 在微信公众平台申请模板消息
 *    路径：微信公众平台 -> 功能 -> 模板消息 -> 模板库
 *
 * 2. 推荐申请以下模板:
 *    - 预约成功通知: 需包含字段: 车位号(thing)、预约时间(thing)、车牌号(thing)等
 *    - 预约取消通知: 需包含字段: 车位号(thing)、预约时间(thing)、车牌号(thing)等
 *
 * 3. 替换下方的模板ID为实际申请到的模板ID
 */

module.exports = {
  // 预约成功通知模板ID
  // 模板内容建议: 您已成功预约车位，车位号：{{thing1}}，时间：{{thing2}}，车牌号：{{thing3}}
  RESERVATION_SUCCESS: 'RESERVATION_SUCCESS_TEMPLATE_ID',

  // 预约取消通知模板ID
  // 模板内容建议: 您的预约已取消，车位号：{{thing1}}，时间：{{thing2}}，车牌号：{{thing3}}
  RESERVATION_CANCEL: 'RESERVATION_CANCEL_TEMPLATE_ID'
};
