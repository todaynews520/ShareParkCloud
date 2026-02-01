// pages/community/community.js - 小区管理页面
const app = getApp();
const { showToast, showModal, showLoading, hideLoading } = require('../../utils/common');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    communityList: [], // 小区列表
    currentCommunity: null, // 当前选中的小区
    showAddModal: false,
    newCommunityName: '',
    newCommunityAddress: '',
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadCommunities();
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
   * 加载小区列表
   */
  async loadCommunities() {
    try {
      this.setData({ loading: true });

      const db = app.getDB();
      const res = await db.collection('communities')
        .orderBy('create_time', 'desc')
        .get();

      // 获取当前选中的小区
      const currentId = wx.getStorageSync('current_community_id');

      this.setData({
        communityList: res.data,
        currentCommunity: res.data.find(c => c._id === currentId) || (res.data.length > 0 ? res.data[0] : null),
        loading: false
      });
    } catch (err) {
      console.error('加载小区列表失败:', err);
      showToast('加载失败');
      this.setData({ loading: false });
    }
  },

  /**
   * 选择小区
   */
  onSelectCommunity(e) {
    const id = e.currentTarget.dataset.id;
    const community = this.data.communityList.find(c => c._id === id);

    if (community) {
      wx.setStorageSync('current_community_id', id);
      wx.setStorageSync('current_community_name', community.name);

      this.setData({ currentCommunity: community });
      showToast(`已切换到${community.name}`);

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 500);
    }
  },

  /**
   * 显示添加小区弹窗
   */
  onShowAddModal() {
    this.setData({
      showAddModal: true,
      newCommunityName: '',
      newCommunityAddress: ''
    });
  },

  /**
   * 隐藏添加小区弹窗
   */
  onHideAddModal() {
    this.setData({ showAddModal: false });
  },

  /**
   * 小区名称输入
   */
  onCommunityNameInput(e) {
    this.setData({ newCommunityName: e.detail.value });
  },

  /**
   * 小区地址输入
   */
  onAddressInput(e) {
    this.setData({ newCommunityAddress: e.detail.value });
  },

  /**
   * 添加小区
   */
  async onAddCommunity() {
    const { newCommunityName, newCommunityAddress } = this.data;

    if (!newCommunityName.trim()) {
      showToast('请输入小区名称');
      return;
    }

    if (!newCommunityAddress.trim()) {
      showToast('请输入小区地址');
      return;
    }

    try {
      showLoading('添加中...');

      const db = app.getDB();
      const openid = app.globalData.openid || wx.getStorageSync('openid');

      await db.collection('communities').add({
        data: {
          name: newCommunityName.trim(),
          address: newCommunityAddress.trim(),
          creator_id: openid,
          create_time: new Date().getTime()
        }
      });

      hideLoading();
      showToast('添加成功');

      this.setData({ showAddModal: false });
      this.loadCommunities();
    } catch (err) {
      hideLoading();
      console.error('添加小区失败:', err);
      showToast('添加失败');
    }
  },

  /**
   * 删除小区
   */
  async onDeleteCommunity(e) {
    const id = e.currentTarget.dataset.id;
    const community = this.data.communityList.find(c => c._id === id);

    if (!community) return;

    const res = await showModal({
      title: '确认删除',
      content: `确定要删除小区"${community.name}"吗？`
    });

    if (res.confirm) {
      try {
        const db = app.getDB();
        await db.collection('communities').doc(id).remove();

        showToast('删除成功');

        // 如果删除的是当前小区，清除缓存
        if (this.data.currentCommunity && this.data.currentCommunity._id === id) {
          wx.removeStorageSync('current_community_id');
          wx.removeStorageSync('current_community_name');
          this.setData({ currentCommunity: null });
        }

        this.loadCommunities();
      } catch (err) {
        console.error('删除小区失败:', err);
        showToast('删除失败');
      }
    }
  }
});
