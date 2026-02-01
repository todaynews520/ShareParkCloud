// pages/publish/publish.js - 车位发布页面
const app = getApp();
const { showToast, showModal, showLoading, hideLoading, formatDuration, isTimeRangeOverlap } = require('../../utils/common');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    spotNumber: '',
    date: '',
    startTime: '',
    endTime: '',
    duration: '',
    selectedDuration: { hours: 0, minutes: 0 },
    durationText: '',
    today: '',
    submitting: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const today = app.getUtils().getCurrentDate();
    const currentTime = app.getUtils().getCurrentTime();

    // 生成1-24小时时长选项
    const durationOptions = this.generateDurationOptions();

    // 获取当前用户上次使用的车位号
    const openid = app.globalData.openid || wx.getStorageSync('openid');
    const lastSpotNumber = wx.getStorageSync(`last_spot_${openid}`);

    this.setData({
      today: today,
      date: today, // 默认今天
      startTime: currentTime, // 默认当前时间
      spotNumber: lastSpotNumber || '', // 加载上次使用的车位号
      durationTexts: durationOptions.displayTexts,
      durationOptions: durationOptions.options,
      durationIndex: 0,
      selectedDuration: { hours: 1, minutes: 0 }
    });

    // 自动计算结束时间
    this.calculateDurationFromStartTime();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      });
    }
  },

  /**
   * 车位号输入
   */
  onSpotNumberInput(e) {
    const value = e.detail.value.trim();
    this.setData({ spotNumber: value });

    // 保存到本地存储
    const openid = app.globalData.openid || wx.getStorageSync('openid');
    wx.setStorageSync(`last_spot_${openid}`, value);
  },

  /**
   * 日期选择
   */
  onDateChange(e) {
    this.setData({
      date: e.detail.value
    });
  },

  /**
   * 开始时间选择
   */
  onStartTimeChange(e) {
    this.setData({
      startTime: e.detail.value
    });
    this.calculateDuration();
  },

  /**
   * 结束时间选择
   */
  onEndTimeChange(e) {
    this.setData({
      endTime: e.detail.value
    });
    this.calculateDurationFromEndTime();
  },

  /**
   * 时长选择
   */
  onDurationChange(e) {
    const index = parseInt(e.detail.value);
    const totalMinutes = this.data.durationOptions[index];

    this.setData({
      durationIndex: index,
      selectedDuration: { hours: 0, minutes: totalMinutes },
      endTime: '' // 清空结束时间
    });

    this.calculateDurationFromStartTime();
  },

  /**
   * 生成时长选项 (1-24小时)
   */
  generateDurationOptions() {
    const options = [];
    const displayTexts = [];

    // 1小时到24小时
    for (let i = 1; i <= 24; i++) {
      options.push(i * 60);
      displayTexts.push(`${i}小时`);
    }

    return {
      options,
      displayTexts
    };
  },

  /**
   * 根据开始时间计算时长和结束时间
   */
  calculateDuration() {
    if (!this.data.startTime || !this.data.endTime) {
      return;
    }

    try {
      const start = app.getUtils().timeStringToMinutes(this.data.startTime);
      const end = app.getUtils().timeStringToMinutes(this.data.endTime);

      if (end <= start) {
        return; // 结束时间必须大于开始时间
      }

      const diffMinutes = end - start;

      // 最小时长5分钟
      if (diffMinutes < 5) {
        return;
      }

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      let durationText = '';
      if (hours === 0) {
        durationText = `${minutes}分钟`;
      } else if (minutes === 0) {
        durationText = `${hours}小时`;
      } else {
        durationText = `${hours}小时${minutes}分钟`;
      }

      this.setData({
        duration: durationText
      });
    } catch (err) {
      console.error('计算时长失败:', err);
    }
  },

  /**
   * 根据结束时间计算时长
   */
  calculateDurationFromEndTime() {
    if (!this.data.startTime || !this.data.endTime) {
      this.setData({ duration: '', durationIndex: 0 });
      return;
    }

    try {
      const start = app.getUtils().timeStringToMinutes(this.data.startTime);
      const end = app.getUtils().timeStringToMinutes(this.data.endTime);

      if (end <= start) {
        return;
      }

      const diffMinutes = end - start;

      // 最小时长1小时
      if (diffMinutes < 60) {
        return;
      }

      const hours = Math.floor(diffMinutes / 60);

      // 找到对应的索引
      const index = this.data.durationOptions.indexOf(hours * 60);

      this.setData({
        duration: `${hours}小时`,
        selectedDuration: { hours: hours, minutes: 0 },
        durationIndex: index >= 0 ? index : 0
      });
    } catch (err) {
      console.error('计算时长失败:', err);
    }
  },

  /**
   * 根据开始时间和时长计算结束时间
   */
  calculateDurationFromStartTime() {
    if (!this.data.startTime || !this.data.selectedDuration) {
      return;
    }

    try {
      const start = app.getUtils().timeStringToMinutes(this.data.startTime);
      const { hours, minutes } = this.data.selectedDuration;
      const totalMinutes = hours * 60 + minutes;

      // 最小时长1小时
      if (totalMinutes < 60) {
        return;
      }

      const end = start + totalMinutes;
      const endHour = String(Math.floor(end / 60)).padStart(2, '0');
      const endMin = String(end % 60).padStart(2, '0');
      const endTime = `${endHour}:${endMin}`;

      this.setData({
        endTime: endTime
      });

      this.calculateDurationFromEndTime();
    } catch (err) {
      console.error('计算结束时间失败:', err);
    }
  },

  /**
   * 提交发布
   */
  async onSubmit() {
    // 表单验证
    if (!this.data.spotNumber) {
      showToast('请输入车位号');
      return;
    }

    if (!this.data.date) {
      showToast('请选择日期');
      return;
    }

    if (!this.data.startTime) {
      showToast('请选择开始时间');
      return;
    }

    if (!this.data.endTime) {
      showToast('请先选择时长');
      return;
    }

    if (!this.data.duration || this.data.duration.length < 2) {
      showToast('请选择时长（最小时长1小时）');
      return;
    }

    this.setData({ submitting: true });

    try {
      showLoading('发布中...');

      // 获取当前用户信息
      const openid = app.globalData.openid || wx.getStorageSync('openid');

      // 1. 先创建车位信息到parkings集合
      const parkingsRes = await app.getDB().collection('parkings').add({
        data: {
          spot_number: this.data.spotNumber,
          owner_id: openid,
          create_time: new Date().getTime()
        }
      });

      const parkingId = parkingsRes._id;

      // 2. 检查时间段冲突
      const hasConflict = await this.checkConflict(
        this.data.spotNumber,
        this.data.date,
        this.data.startTime,
        this.data.endTime
      );

      if (hasConflict) {
        hideLoading();
        showToast('该车位在此时间段已被占用');
        this.setData({ submitting: false });
        return;
      }

      // 3. 获取用户信息
      const userRes = await app.getDB().collection('users')
        .where({ openid: openid })
        .get();

      const userInfo = userRes.data[0] || { nickname: '业主' };

      // 4. 创建发布记录
      await app.getDB().collection('parking_releases').add({
        data: {
          parking_id: {
            _id: parkingId,
            spot_number: this.data.spotNumber
          },
          owner_id: {
            openid: openid,
            nickname: userInfo.nickname || '业主'
          },
          date: this.data.date,
          start_time: this.data.startTime,
          end_time: this.data.endTime,
          duration: this.data.duration,
          status: 'available',
          create_time: new Date().getTime()
        }
      });

      hideLoading();
      showToast('发布成功');

      // 保存车位号到本地存储
      wx.setStorageSync(`last_spot_${openid}`, this.data.spotNumber);

      // 延迟后返回首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);
    } catch (err) {
      hideLoading();
      console.error('发布失败:', err);
      showToast('发布失败，请重试');
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 检查时间段冲突
   */
  async checkConflict(spotNumber, date, startTime, endTime) {
    try {
      const db = app.getDB();

      // 查询该车位在相同日期的其他发布
      const releases = await db.collection('parking_releases')
        .where({
          status: 'available',
          'parking_id.spot_number': spotNumber,
          date: date
        })
        .get();

      for (const release of releases.data) {
        if (isTimeRangeOverlap(startTime, endTime, release.start_time, release.end_time)) {
          return true; // 有冲突
        }
      }

      return false; // 无冲突
    } catch (err) {
      console.error('检查冲突失败:', err);
      return false;
    }
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
});
