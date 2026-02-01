// pages/home/index.js - 发现页（首页）
const parkingService = require('../../services/parkingService.js')
const { handleError, showLoading, hideLoading } = require('../../utils/errorHandler.js')

Page({
  data: {
    parkingList: [],      // 车位列表
    loading: false,       // 加载状态
    hasMore: true,        // 是否有更多
    range: 500,           // 搜索范围（米）
    rangeText: '500m',    // 范围文本
    filterTags: [         // 筛选标签
      { key: 'all', label: '全部', active: true },
      { key: 'charger', label: '可充电', active: false },
      { key: 'monitor', label: '有监控', active: false },
      { key: 'indoor', label: '室内', active: false }
    ]
  },

  onLoad() {
    this.loadParkingList()
  },

  onShow() {
    // 刷新列表
    if (this.data.parkingList.length > 0) {
      this.loadParkingList(true)
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadParkingList(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  /**
   * 触底加载更多
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadParkingList(false)
    }
  },

  /**
   * 加载车位列表
   */
  async loadParkingList(refresh = false) {
    if (this.data.loading) return

    this.setData({ loading: true })

    if (refresh) {
      this.setData({
        parkingList: [],
        hasMore: true
      })
    }

    try {
      const res = await parkingService.getParkingList({
        limit: 20,
        skip: refresh ? 0 : this.data.parkingList.length
      })

      const newList = res.data || []
      // 处理数据，提取嵌套属性
      const processedList = newList.map(item => ({
        ...item,
        priceHourly: (item.price && item.price.hourly) ? (item.price.hourly / 100) : 5,
        locationName: (item.location && item.location.name) ? item.location.name : '未知位置'
      }))

      const parkingList = refresh ? processedList : [...this.data.parkingList, ...processedList]

      this.setData({
        parkingList,
        hasMore: newList.length >= 20
      })
    } catch (err) {
      handleError(err, '加载失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 切换搜索范围
   */
  onRangeChange(e) {
    const range = e.currentTarget.dataset.range
    const rangeText = e.currentTarget.dataset.text

    this.setData({
      range,
      rangeText
    })

    // 刷新列表
    this.loadParkingList(true)
  },

  /**
   * 切换筛选标签
   */
  onFilterTap(e) {
    const key = e.currentTarget.dataset.key
    const filterTags = this.data.filterTags.map(tag => ({
      ...tag,
      active: tag.key === key
    }))

    this.setData({ filterTags })
    this.loadParkingList(true)
  },

  /**
   * 点击车位卡片
   */
  onSpotTap(e) {
    const spotId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/book/index?spotId=${spotId}`
    })
  }
})
