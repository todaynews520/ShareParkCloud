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

    // 刷新车位列表数据
    this.loadParkingList(true);
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

      // 不再进行时间过滤，显示所有可用车位（包括取消预约后恢复的）
      const currentParkingList = res.data;

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
   * 使用批量查询优化性能，避免N+1查询问题
   */
  async loadParkingInfo(parkingList) {
    const db = app.getDB();
    const newParkingList = [];

    // 收集所有需要查询的parking_id和owner_openid
    const parkingIds = [];
    const ownerOpenids = [];

    for (const item of parkingList) {
      if (item.parking_id && item.parking_id._id) {
        parkingIds.push(item.parking_id._id);
      }
      if (item.owner_id && item.owner_id.openid) {
        ownerOpenids.push(item.owner_id.openid);
      }
    }

    // 批量查询parkings（使用in操作符）
    let parkingsMap = {};
    if (parkingIds.length > 0) {
      try {
        const parkingsRes = await db.collection('parkings')
          .where({
            _id: db.command.in(parkingIds.slice(0, 20)) // 限制一次最多查询20个
          })
          .get();

        // 构建map方便查找
        parkingsRes.data.forEach(p => {
          parkingsMap[p._id] = p;
        });
      } catch (err) {
        console.error('批量查询parkings失败:', err);
      }
    }

    // 批量查询users（使用in操作符）
    let usersMap = {};
    if (ownerOpenids.length > 0) {
      try {
        const usersRes = await db.collection('users')
          .where({
            openid: db.command.in(ownerOpenids.slice(0, 20)) // 限制一次最多查询20个
          })
          .get();

        // 构建map方便查找
        usersRes.data.forEach(u => {
          usersMap[u.openid] = u;
        });
      } catch (err) {
        console.error('批量查询users失败:', err);
      }
    }

    // 组装数据
    for (const item of parkingList) {
      try {
        // 从map中获取车位信息
        if (item.parking_id && item.parking_id._id) {
          item.parking_info = parkingsMap[item.parking_id._id] || { spot_number: '未知' };
        }

        // 从map中获取用户信息
        if (item.owner_id && item.owner_id.openid) {
          item.owner_info = usersMap[item.owner_id.openid] || { nickname: '业主' };
        }

        newParkingList.push(item);
      } catch (err) {
        console.error('组装车位信息失败:', err);
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
   * 刷新列表（供页面调用）
   */
  onRefresh() {
    this.setData({
      currentPage: 1,
      hasMore: true,
      parkingList: []
    });
    this.loadParkingList(true);
  }
});
