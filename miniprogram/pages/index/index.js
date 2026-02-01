// pages/index/index.js - 车位浏览页面
const app = getApp();
const { showToast, formatDuration } = require('../../utils/common');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    parkingList: [], // 车位列表
    today: '', // 当前日期
    filterDate: '', // 筛选日期
    showFilter: false, // 是否显示筛选弹窗
    loading: false, // 加载状态
    loadingMore: false, // 加载更多状态
    hasMore: true, // 是否还有更多数据
    currentPage: 1, // 当前页码
    pageSize: 10 // 每页数量
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const today = app.getUtils().getCurrentDate();
    this.setData({
      today: today,
      filterDate: today // 默认显示今天
    });

    // 加载车位列表
    this.loadParkingList(true);
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 确保自定义导航栏的选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({
      currentPage: 1,
      hasMore: true,
      parkingList: [],
      loading: true,
      error: null
    });

    this.loadParkingList(true).then(() => {
      wx.stopPullDownRefresh();
      this.setData({ loading: false, isFirstLoad: false });
    }).catch(() => {
      wx.stopPullDownRefresh();
      this.setData({ loading: false });
    });
  },

  /**
   * 触底加载更多
   */
  onReachBottom() {
    if (!this.data.loadingMore && this.data.hasMore && !this.data.loading) {
      this.setData({
        currentPage: this.data.currentPage + 1
      });
      this.loadParkingList(false);
    }
  },

  /**
   * 加载车位列表
   */
  async loadParkingList(isRefresh = false) {
    try {
      if (!isRefresh) {
        this.setData({ loadingMore: true });
      }

      const db = app.getDB();
      const utils = app.getUtils();

      // 获取当前时间
      const now = new Date();
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // 查询条件：状态为可用，日期大于等于筛选日期
      const queryConditions = {
        status: 'available',
        date: utils.getDateOffset(0) // 从今天开始
      };

      // 查询发布列表
      const res = await db.collection('parking_releases')
        .where({
          ...queryConditions
        })
        .orderBy('date', 'asc')
        .orderBy('start_time', 'asc')
        .limit(this.data.pageSize)
        .skip((this.data.currentPage - 1) * this.data.pageSize)
        .get();

      // 过滤出当前时间之后的记录
      const currentParkingList = res.data.filter(item => {
        return item.start_time >= currentTimeStr;
      });

      // 加载车位信息
      const parkingList = await this.loadParkingInfo(currentParkingList);

      // 更新数据
      if (isRefresh) {
        this.setData({
          parkingList: parkingList,
          hasMore: parkingList.length >= this.data.pageSize,
          error: null
        });
      } else {
        this.setData({
          parkingList: [...this.data.parkingList, ...parkingList],
          hasMore: parkingList.length >= this.data.pageSize,
          error: null
        });
      }
    } catch (err) {
      console.error('加载车位列表失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      if (!isRefresh) {
        this.setData({ loadingMore: false });
      }
    }
  },

  /**
   * 加载车位详细信息
   */
  async loadParkingInfo(parkingList) {
    const db = app.getDB();
    const newParkingList = [];

    for (const item of parkingList) {
      try {
        // 加载车位信息
        if (item.parking_id && item.parking_id._id) {
          const parkingRes = await db.collection('parkings')
            .doc(item.parking_id._id)
            .get();

          item.parking_info = parkingRes.data;
        }

        // 加载发布者信息
        if (item.owner_id && item.owner_id.openid) {
          const userRes = await db.collection('users')
            .where({ openid: item.owner_id.openid })
            .get();

          item.owner_info = userRes.data[0] || {};
        }

        newParkingList.push(item);
      } catch (err) {
        console.error('加载车位信息失败:', err);
        // 失败时使用默认信息
        item.parking_info = { spot_number: '未知' };
        item.owner_info = { nickname: '业主' };
        newParkingList.push(item);
      }
    }

    return newParkingList;
  },

  /**
   * 打开筛选弹窗
   */
  onFilter() {
    this.setData({
      showFilter: true
    });
  },

  /**
   * 关闭筛选弹窗
   */
  hideFilter() {
    this.setData({
      showFilter: false
    });
  },

  /**
   * 筛选日期改变
   */
  onFilterDateChange(e) {
    this.setData({
      filterDate: e.detail.value
    });
  },

  /**
   * 确认筛选
   */
  onFilterConfirm() {
    this.setData({
      currentPage: 1,
      parkingList: [],
      hasMore: true,
      showFilter: false
    });

    this.loadParkingList(true);
  },

  /**
   * 点击车位项跳转到预约页
   */
  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/reserve/reserve?id=${id}`
    });
  },

  /**
   * 防抖函数
   */
  debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(this, args);
      }, wait);
    };
  }
});
