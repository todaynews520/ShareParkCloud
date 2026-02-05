// pages/publish/index.js - 发布页
const parkingService = require('../../services/parkingService.js')
const pointsService = require('../../services/pointsService.js')
const { handleError, showLoading, hideLoading } = require('../../utils/errorHandler.js')
const CONSTANTS = require('../../config/constants.js')
const formatter = require('../../utils/formatter.js')

Page({
  data: {
    // 表单数据
    form: {
      spotNumber: '',
      date: '',
      startHour: 13,
      duration: 2,
      features: {
        hasCharger: false,
        hasMonitor: false,
        isIndoor: false
      }
    },
    // 位置信息
    location: {
      name: '',
      address: '',
      latitude: 0,
      longitude: 0
    },
    // UI状态
    dates: [],
    selectedDateIndex: 0,
    durationOptions: [1, 2, 4, 8]
  },

  onLoad() {
    this.initDates()
    this.setDefaultTime()
  },

  /**
   * 设置默认时间为当前小时
   */
  setDefaultTime() {
    const now = new Date()
    const currentHour = now.getHours()
    this.setData({
      'form.startHour': currentHour
    })
  },

  /**
   * 初始化日期列表（未来7天）
   */
  initDates() {
    const dates = []
    const today = new Date()
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']

    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)

      dates.push({
        dateStr: formatter.formatDate(date),
        weekday: '周' + weekdays[date.getDay()],
        isToday: i === 0
      })
    }

    this.setData({
      dates,
      'form.date': dates[0].dateStr
    })
  },

  /**
   * 选择日期
   */
  onDateSelect(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      selectedDateIndex: index,
      'form.date': this.data.dates[index].dateStr
    })
  },

  /**
   * 开始时间滑块
   */
  onTimeChange(e) {
    this.setData({
      'form.startHour': parseInt(e.detail.value)
    })
  },

  /**
   * 选择时长
   */
  onDurationSelect(e) {
    const duration = e.currentTarget.dataset.duration
    this.setData({
      'form.duration': duration
    })
  },

  /**
   * 车位号输入
   */
  onSpotNumberInput(e) {
    this.setData({
      'form.spotNumber': e.detail.value
    })
  },

  /**
   * 选择位置
   */
  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          location: {
            name: res.name || '选中位置',
            address: res.address,
            latitude: res.latitude,
            longitude: res.longitude
          }
        })
      },
      fail: (err) => {
        console.error('选择位置失败:', err)
        if (err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要位置权限',
            content: '请在设置中开启位置权限，以便选择车位位置',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
        } else {
          wx.showToast({
            title: '选择位置失败，请重试',
            icon: 'none'
          })
        }
      }
    })
  },

  /**
   * 切换特性
   */
  onFeatureToggle(e) {
    const key = e.currentTarget.dataset.key
    const currentValue = this.data.form.features[key]
    this.setData({
      [`form.features.${key}`]: !currentValue
    })
  },

  /**
   * 提交发布
   */
  async onSubmit() {
    const app = getApp()

    // 检查登录
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => {
          if (res.confirm) {
            app.login().then(() => {
              this.onSubmit()
            })
          }
        }
      })
      return
    }

    const { form } = this.data

    // 表单验证
    if (!form.spotNumber) {
      wx.showToast({ title: '请输入车位号', icon: 'none' })
      return
    }

    // 计算结束时间
    const startHour = form.startHour
    const endHour = (startHour + form.duration) % 24
    const startTime = `${String(startHour).padStart(2, '0')}:00`
    const endTime = `${String(endHour).padStart(2, '0')}:00`

    showLoading('发布中...')

    try {
      await parkingService.createPublish({
        spotNumber: form.spotNumber,
        date: form.date,
        startTime,
        endTime,
        duration: form.duration,
        price: {
          hourly: 0, // 积分制，无需价格
          currency: 'POINTS'
        },
        location: this.data.location,
        features: form.features
      })

      // 发布成功奖励积分
      await pointsService.addPoints(CONSTANTS.PUBLISH_REWARD, '发布车位')

      hideLoading()

      wx.showToast({
        title: `发布成功 +${CONSTANTS.PUBLISH_REWARD}${CONSTANTS.POINTS_NAME}`,
        icon: 'success'
      })

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/home/index'
        })
      }, 1500)

    } catch (err) {
      hideLoading()
      handleError(err, '发布失败')
    }
  }
})
