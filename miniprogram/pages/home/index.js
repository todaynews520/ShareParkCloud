// pages/home/index.js - 发现页（首页）
const parkingService = require('../../services/parkingService.js')
const { handleError, showLoading, hideLoading } = require('../../utils/errorHandler.js')

Page({
  data: {
    parkingList: [],      // 车位列表
    loading: false,       // 加载状态
    hasMore: true,        // 是否有更多
    selectedRange: 500,   // 选中的搜索范围（米）
    mapScale: 15,         // 地图缩放级别
    latitude: 39.908823,  // 默认纬度（北京）
    longitude: 116.397470, // 默认经度（北京）
    mapMarkers: [],       // 地图标记
    filterTags: [         // 筛选标签
      { key: 'all', label: '全部', active: true },
      { key: 'charger', label: '可充电', active: false },
      { key: 'monitor', label: '有监控', active: false },
      { key: 'indoor', label: '室内', active: false }
    ]
  },

  mapContext: null, // 地图上下文

  onLoad() {
    // 获取用户位置
    this.getUserLocation()
    // 初始化地图上下文
    this.mapContext = wx.createMapContext('parkingMap', this)
  },

  onShow() {
    // 每次显示页面时都刷新列表
    this.loadParkingList(true)
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
   * 获取用户位置
   */
  getUserLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude
        })
        // 获取位置后再加载车位列表
        this.loadParkingList()
      },
      fail: (err) => {
        console.error('获取位置失败:', err)
        // 使用默认位置并加载车位列表
        this.loadParkingList()
      }
    })
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
      console.log('加载到的车位数据:', newList)

      // 处理数据，提取嵌套属性
      // 使用驼峰命名的字段，与云函数保持一致
      const processedList = newList.map(item => ({
        ...item,
        spotNumber: item.spotNumber || '未知',
        priceHourly: (item.price && item.price.hourly) ? (item.price.hourly / 100) : 5,
        locationName: (item.location && item.location.name) ? item.location.name : '未知位置',
        startTime: item.startTime || '--:--',
        endTime: item.endTime || '--:--'
      }))

      const parkingList = refresh ? processedList : [...this.data.parkingList, ...processedList]

      console.log('处理后的车位列表:', parkingList)

      // 创建地图标记
      const mapMarkers = this.createMapMarkers(parkingList)

      this.setData({
        parkingList,
        hasMore: newList.length >= 20,
        mapMarkers
      })
    } catch (err) {
      console.error('加载车位列表失败:', err)
      handleError(err, '加载失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 切换搜索范围
   */
  onRangeChange(e) {
    const range = parseInt(e.currentTarget.dataset.range)
    this.setData({
      selectedRange: range
    })

    // 调整地图缩放级别
    const scaleMap = {
      500: 16,
      1000: 15,
      3000: 14
    }
    this.setData({
      mapScale: scaleMap[range] || 15
    })

    // 刷新列表
    this.loadParkingList(true)
  },

  /**
   * 创建地图标记
   */
  createMapMarkers(parkingList) {
    return parkingList.map((item, index) => {
      // 如果车位有地理位置信息，使用实际位置
      // 否则，围绕中心点生成模拟位置（用于演示）
      let latitude = this.data.latitude
      let longitude = this.data.longitude

      if (item.location && item.location.latitude && item.location.longitude) {
        latitude = item.location.latitude
        longitude = item.location.longitude
      } else {
        // 生成围绕中心点的随机偏移（仅用于演示）
        const offset = 0.005 * (index + 1)
        latitude += (Math.random() - 0.5) * offset
        longitude += (Math.random() - 0.5) * offset
      }

      return {
        id: index,  // 使用索引作为数字ID
        spotId: item._id,  // 保存原始ID用于跳转
        latitude,
        longitude,
        width: 24,
        height: 24,
        title: `${item.spotNumber}号车位`,
        callout: {
          content: `¥${item.priceHourly}/时`,
          color: '#333',
          fontSize: 12,
          borderRadius: 8,
          bgColor: '#fff',
          padding: 4,
          display: 'ALWAYS'
        }
      }
    })
  },

  /**
   * 点击地图标记
   */
  onMarkerTap(e) {
    const markerId = e.detail.markerId
    const marker = this.data.mapMarkers.find(m => m.id === markerId)
    const spot = marker ? this.data.parkingList.find(item => item._id === marker.spotId) : null

    if (spot && spot._id) {
      wx.navigateTo({
        url: `/pages/book/index?spotId=${spot._id}`
      })
    }
  },

  /**
   * 地图区域变化
   */
  onRegionChange(e) {
    if (e.type === 'end') {
      // 可以在这里实现：地图移动后重新加载该区域的车位
      console.log('地图区域已变化')
    }
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
    console.log('点击车位卡片，ID:', spotId)
    console.log('完整 dataset:', e.currentTarget.dataset)

    if (!spotId) {
      wx.showToast({
        title: '车位ID缺失，无法预约',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/book/index?spotId=${spotId}`,
      fail: (err) => {
        console.error('页面跳转失败:', err)
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none'
        })
      }
    })
  }
})
