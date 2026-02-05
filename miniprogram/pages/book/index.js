// pages/book/index.js - 预约页
const parkingService = require('../../services/parkingService.js')
const orderService = require('../../services/orderService.js')
const pointsService = require('../../services/pointsService.js')
const { validatePlateNumber, formatPlateNumber } = require('../../utils/validator.js')
const { handleError, showLoading, hideLoading } = require('../../utils/errorHandler.js')
const formatter = require('../../utils/formatter.js')
const cache = require('../../utils/cache.js')
const CONSTANTS = require('../../config/constants.js')

Page({
  data: {
    spotId: '',
    spotInfo: null,
    plateNumber: '',
    plateHistory: [],
    pricing: {
      baseFee: 0,
      serviceFee: 0,
      total: 0
    }
  },

  onLoad(options) {
    console.log('预约页面接收到的参数:', options)
    this.spotId = options.spotId

    if (!this.spotId) {
      wx.showModal({
        title: '提示',
        content: '缺少车位ID参数',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }

    this.loadSpotDetail()
    this.loadPlateHistory()
  },

  /**
   * 加载车位详情
   */
  async loadSpotDetail() {
    console.log('开始加载车位详情，ID:', this.spotId)
    showLoading('加载中...')

    try {
      const res = await parkingService.getParkingDetail(this.spotId)
      console.log('获取到的车位详情:', res)

      const spotInfo = res.data

      // 计算费用
      const pricing = orderService.calculatePrice(
        spotInfo.price.hourly,
        spotInfo.duration
      )

      // 处理数据供 WXML 使用
      // 使用驼峰命名的字段，与云函数保持一致
      const processedSpotInfo = {
        ...spotInfo,
        spotNumber: spotInfo.spotNumber || '未知',
        locationName: spotInfo.location && spotInfo.location.name ? spotInfo.location.name : '未知位置',
        priceHourly: (spotInfo.price && spotInfo.price.hourly) ? (spotInfo.price.hourly / 100) : 5,
        startTime: spotInfo.startTime || '--:--',
        endTime: spotInfo.endTime || '--:--'
      }

      console.log('处理后的车位信息:', processedSpotInfo)

      // 格式化费用显示（积分）
      const pricingText = {
        pointsCost: pricing.pointsCost,
        baseFee: pricing.baseFee,
        serviceFee: pricing.serviceFee,
        total: pricing.total,
        baseFeeText: pricing.baseFeeText,
        serviceFeeText: pricing.serviceFeeText,
        totalText: pricing.totalText
      }

      this.setData({
        spotInfo: processedSpotInfo,
        pricing: pricingText
      })
    } catch (err) {
      console.error('加载车位详情失败:', err)
      handleError(err, '加载失败')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } finally {
      hideLoading()
    }
  },

  /**
   * 加载车牌历史
   */
  loadPlateHistory() {
    const history = cache.get('plateHistory') || []
    this.setData({ plateHistory: history })
  },

  /**
   * 车牌号输入
   */
  onPlateInput(e) {
    this.setData({
      plateNumber: e.detail.value
    })
  },

  /**
   * 车牌输入完成
   */
  onPlateComplete(e) {
    const { value, normalized } = e.detail
    this.setData({
      plateNumber: normalized || value
    })
  },

  /**
   * 确认预约
   */
  async onConfirm() {
    const app = getApp()

    // 检查登录
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => {
          if (res.confirm) {
            app.login().then(() => {
              this.onConfirm()
            })
          }
        }
      })
      return
    }

    const { spotInfo, plateNumber, pricing } = this.data

    // 验证车牌
    const plateCheck = validatePlateNumber(plateNumber)
    if (!plateCheck.valid) {
      wx.showToast({ title: plateCheck.message, icon: 'none' })
      return
    }

    // 检查积分是否足够
    try {
      const pointsRes = await pointsService.getUserPoints()
      if (!pointsRes.success || pointsRes.points < CONSTANTS.BOOKING_COST) {
        wx.showModal({
          title: '积分不足',
          content: `预约需要${CONSTANTS.BOOKING_COST}${CONSTANTS.POINTS_NAME}，当前${pointsRes.points || 0}${CONSTANTS.POINTS_NAME}`,
          confirmText: '去签到',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({ url: '/pages/profile/index' })
            }
          }
        })
        return
      }
    } catch (err) {
      console.error('获取积分失败:', err)
      // 继续流程，让云函数处理积分检查
    }

    // 确认弹窗
    const confirmed = await wx.showModal({
      title: '确认预约',
      content: `预约车位：${spotInfo.spotNumber || '未知'}号\n车牌：${formatPlateNumber(plateNumber)}\n费用：${pricing.totalText}${CONSTANTS.POINTS_NAME}`
    })

    if (!confirmed.confirm) return

    showLoading('创建订单...')

    try {
      // 创建订单
      const orderRes = await orderService.createOrder({
        spotId: this.spotId,
        plateNumber: plateCheck.normalized,
        timeRange: {
          start: `${spotInfo.date} ${spotInfo.startTime}`,
          end: `${spotInfo.date} ${spotInfo.endTime}`
        },
        pricing
      })

      const orderId = orderRes.orderId

      // 模拟支付
      await orderService.payOrder(orderId)

      // 保存车牌到历史
      this.savePlateHistory(plateCheck.normalized)

      // 跳转到入场凭证页
      wx.redirectTo({
        url: `/pages/entry-pass/index?orderId=${orderId}`
      })

    } catch (err) {
      hideLoading()
      handleError(err, '预约失败')
    }
  },

  /**
   * 保存车牌历史
   */
  savePlateHistory(plate) {
    let history = this.data.plateHistory || []

    // 去重
    history = history.filter(p => p !== plate)

    // 添加到前面
    history.unshift(plate)

    // 最多保存5个
    history = history.slice(0, 5)

    this.setData({ plateHistory: history })
    cache.set('plateHistory', history)
  }
})
