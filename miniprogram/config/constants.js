// config/constants.js - 常量定义

// 积分系统
const POINTS_CURRENCY = 'POINTS'
const POINTS_NAME = '积分'

// 积分规则
const INITIAL_POINTS = 1000         // 初始积分
const PUBLISH_REWARD = 50            // 发布车位奖励积分
const BOOKING_COST = 10             // 预约车位消耗积分（固定）
const DAILY_CHECKIN_REWARD = 10     // 每日签到积分
const CONSECUTIVE_7_BONUS = 100     // 连续7天额外奖励

// 订单状态
const ORDER_STATUS = {
  PENDING: 'pending',         // 待支付
  PAID: 'paid',               // 已支付
  AWAITING_ENTRY: 'awaiting_entry', // 待入场
  ACTIVE: 'active',           // 停车中
  COMPLETED: 'completed',     // 已完成
  CANCELLED: 'cancelled',     // 已取消
  OVERSTAYED: 'overstayed'    // 已超时
}

// 车位发布状态
const SPOT_STATUS = {
  AVAILABLE: 'available',     // 可预订
  BOOKED: 'booked',           // 已预订
  IN_USE: 'in_use',          // 使用中
  CANCELLED: 'cancelled',     // 已取消
  COMPLETED: 'completed'      // 已完成
}

// 颜色主题
const COLORS = {
  PRIMARY: '#0d9488',         // Teal-600
  PRIMARY_LIGHT: '#f0fdfa',   // Teal-50
  SECONDARY: '#10b981',       // Emerald-500
  ACCENT: '#f97316',          // Orange-500 (价格)
  DANGER: '#ef4444',          // Red-500
  BG: '#f0fdfa',              // 页面背景
  TEXT_PRIMARY: '#1f2937',    // Gray-800
  TEXT_SECONDARY: '#6b7280',  // Gray-500
  BORDER: '#e5e7eb'           // Gray-200
}

// 服务费率
const SERVICE_FEE_RATE = 0.1  // 10%

// 二维码刷新间隔（秒）
const QR_REFRESH_INTERVAL = 30

// 提前入场时间（分钟）
const EARLY_ENTRY_MINUTES = 15

// 迟到宽限时间（分钟）
const LATE_GRACE_MINUTES = 30

// 离场宽限时间（分钟）
const EXIT_GRACE_MINUTES = 10

module.exports = {
  POINTS_CURRENCY,
  POINTS_NAME,
  INITIAL_POINTS,
  PUBLISH_REWARD,
  BOOKING_COST,
  DAILY_CHECKIN_REWARD,
  CONSECUTIVE_7_BONUS,
  ORDER_STATUS,
  SPOT_STATUS,
  COLORS,
  SERVICE_FEE_RATE,
  QR_REFRESH_INTERVAL,
  EARLY_ENTRY_MINUTES,
  LATE_GRACE_MINUTES,
  EXIT_GRACE_MINUTES
}
