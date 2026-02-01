// pages/publish/publish.js - 车位发布页面
const app = getApp();
const { showToast, showModal, showLoading, hideLoading, formatDuration, isTimeRangeOverlap } = require('../../utils/common');
const { Validator } = require('../../utils/validator');
const ErrorHandler = require('../../utils/errorHandler');

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
    submitting: false,
    // 表单验证状态
    formErrors: {
      spotNumber: '',
      date: '',
      startTime: '',
      duration: ''
    },
    // 冲突检查状态
    checkingConflict: false,
    hasConflict: false,
    conflictMessage: '',
    // 草稿恢复提示
    showDraftTip: false
  },

  // 草稿保存定时器
  draftTimer: null,
  // 冲突检查防抖定时器
  conflictTimer: null,

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const today = app.getUtils().getCurrentDate();
    const currentTime = app.getUtils().getCurrentTime();

    // 生成1-24小时时长选项
    const durationOptions = this.generateDurationOptions();

    // 尝试恢复草稿
    const draft = this.loadDraft();

    // 获取当前用户上次使用的车位号
    const openid = app.globalData.openid || wx.getStorageSync('openid');
    const lastSpotNumber = wx.getStorageSync(`last_spot_${openid}`);

    this.setData({
      today: today,
      currentTime: currentTime,
      date: draft?.date || today,
      startTime: draft?.startTime || currentTime,
      spotNumber: draft?.spotNumber || lastSpotNumber || '',
      durationTexts: durationOptions.displayTexts,
      durationOptions: durationOptions.options,
      durationIndex: draft?.durationIndex || 0,
      selectedDuration: { hours: 1, minutes: 0 },
      showDraftTip: !!draft
    });

    // 自动计算结束时间
    this.calculateDurationFromStartTime();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清除定时器
    if (this.draftTimer) {
      clearTimeout(this.draftTimer);
    }
    if (this.conflictTimer) {
      clearTimeout(this.conflictTimer);
    }
  },

  /**
   * 保存草稿
   */
  saveDraft() {
    const draft = {
      spotNumber: this.data.spotNumber,
      date: this.data.date,
      startTime: this.data.startTime,
      durationIndex: this.data.durationIndex
    };
    wx.setStorageSync('publish_draft', draft);
  },

  /**
   * 加载草稿
   */
  loadDraft() {
    try {
      const draft = wx.getStorageSync('publish_draft');
      // 草稿有效期1小时
      if (draft && Date.now() - draft.timestamp < 60 * 60 * 1000) {
        return draft;
      }
    } catch (e) {
      console.error('加载草稿失败:', e);
    }
    return null;
  },

  /**
   * 清除草稿
   */
  clearDraft() {
    wx.removeStorageSync('publish_draft');
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
   * 车位号输入 - 带实时验证
   */
  onSpotNumberInput(e) {
    const value = e.detail.value.trim();
    this.setData({ spotNumber: value, hasConflict: false });

    // 实时验证
    if (value) {
      const result = Validator.spotNumber(value, { required: true, minLength: 1, maxLength: 10 });
      this.setData({
        'formErrors.spotNumber': result.valid ? '' : result.message
      });
    } else {
      this.setData({ 'formErrors.spotNumber': '' });
    }

    // 防抖保存草稿
    this.debouncedSaveDraft();
  },

  /**
   * 防抖保存草稿
   */
  debouncedSaveDraft() {
    if (this.draftTimer) {
      clearTimeout(this.draftTimer);
    }
    this.draftTimer = setTimeout(() => {
      this.saveDraft();
    }, 1000);
  },

  /**
   * 日期选择
   */
  onDateChange(e) {
    const date = e.detail.value;
    this.setData({ date, hasConflict: false });

    // 验证日期
    const result = Validator.date(date, { required: true, allowPast: false });
    this.setData({
      'formErrors.date': result.valid ? '' : result.message
    });

    this.debouncedSaveDraft();
    this.debouncedCheckConflict();
  },

  /**
   * 开始时间选择
   */
  onStartTimeChange(e) {
    const startTime = e.detail.value;
    this.setData({ startTime, hasConflict: false });

    // 验证时间格式
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime)) {
      this.setData({ 'formErrors.startTime': '时间格式不正确' });
    } else {
      this.setData({ 'formErrors.startTime': '' });
    }

    this.calculateDuration();
    this.debouncedSaveDraft();
    this.debouncedCheckConflict();
  },

  /**
   * 结束时间选择
   */
  onEndTimeChange(e) {
    const endTime = e.detail.value;
    this.setData({ endTime, hasConflict: false });

    this.calculateDurationFromEndTime();
    this.debouncedCheckConflict();
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
      endTime: '', // 清空结束时间
      hasConflict: false,
      'formErrors.duration': ''
    });

    this.calculateDurationFromStartTime();
    this.debouncedSaveDraft();
    this.debouncedCheckConflict();
  },

  /**
   * 防抖检查冲突
   */
  debouncedCheckConflict() {
    if (this.conflictTimer) {
      clearTimeout(this.conflictTimer);
    }

    // 只有当必要字段都填写时才检查冲突
    if (!this.data.spotNumber || !this.data.date || !this.data.startTime || !this.data.endTime) {
      return;
    }

    this.setData({ checkingConflict: true });

    this.conflictTimer = setTimeout(() => {
      this.checkConflictDisplay();
    }, 800);
  },

  /**
   * 检查冲突并显示提示（不阻止用户继续操作）
   */
  async checkConflictDisplay() {
    try {
      const hasConflict = await this.checkConflict(
        this.data.spotNumber,
        this.data.date,
        this.data.startTime,
        this.data.endTime
      );

      if (hasConflict) {
        this.setData({
          hasConflict: true,
          conflictMessage: `⚠️ ${this.data.spotNumber}号车位在${this.data.startTime}-${this.data.endTime}已被占用`,
          checkingConflict: false
        });
      } else {
        this.setData({
          hasConflict: false,
          conflictMessage: '',
          checkingConflict: false
        });
      }
    } catch (err) {
      console.error('检查冲突失败:', err);
      this.setData({ checkingConflict: false });
    }
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
        this.setData({ 'formErrors.startTime': '结束时间必须大于开始时间' });
        return;
      }

      this.setData({ 'formErrors.startTime': '' });

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
        this.setData({ 'formErrors.startTime': '结束时间必须大于开始时间' });
        return;
      }

      this.setData({ 'formErrors.startTime': '' });

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
        durationIndex: index >= 0 ? index : -1
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
   * 验证表单
   */
  validateForm() {
    const errors = { spotNumber: '', date: '', startTime: '', duration: '' };
    let isValid = true;

    // 验证车位号
    const spotResult = Validator.spotNumber(this.data.spotNumber, { required: true });
    if (!spotResult.valid) {
      errors.spotNumber = spotResult.message;
      isValid = false;
    }

    // 验证日期
    const dateResult = Validator.date(this.data.date, { required: true });
    if (!dateResult.valid) {
      errors.date = dateResult.message;
      isValid = false;
    }

    // 验证开始时间
    if (!this.data.startTime) {
      errors.startTime = '请选择开始时间';
      isValid = false;
    }

    // 验证时长
    if (!this.data.endTime || !this.data.duration) {
      errors.duration = '请选择时长';
      isValid = false;
    }

    // 验证时间范围
    if (this.data.startTime && this.data.endTime) {
      const timeResult = Validator.timeRange(this.data.startTime, this.data.endTime, { minDuration: 60 });
      if (!timeResult.valid) {
        errors.duration = timeResult.message;
        isValid = false;
      }
    }

    this.setData({ formErrors: errors });
    return isValid;
  },

  /**
   * 提交发布
   */
  async onSubmit() {
    // 表单验证
    if (!this.validateForm()) {
      showToast('请检查表单填写');
      return;
    }

    // 冲突检查
    if (this.data.hasConflict) {
      showToast(this.data.conflictMessage || '该车位在此时间段已被占用');
      return;
    }

    this.setData({ submitting: true });

    try {
      showLoading('发布中...');

      // 获取当前用户信息
      const openid = app.globalData.openid || wx.getStorageSync('openid');

      // 1. 检查车位是否已存在，避免重复创建
      let parkingId;
      const existingParking = await app.getDB().collection('parkings')
        .where({
          spot_number: this.data.spotNumber,
          owner_id: openid
        })
        .get();

      if (existingParking.data.length > 0) {
        // 车位已存在，使用已有的parking_id
        parkingId = existingParking.data[0]._id;
      } else {
        // 车位不存在，创建新的parking记录
        const parkingsRes = await app.getDB().collection('parkings').add({
          data: {
            spot_number: this.data.spotNumber,
            owner_id: openid,
            create_time: new Date().getTime()
          }
        });
        parkingId = parkingsRes._id;
      }

      // 2. 再次检查时间段冲突（防止并发）
      const hasConflict = await this.checkConflict(
        this.data.spotNumber,
        this.data.date,
        this.data.startTime,
        this.data.endTime
      );

      if (hasConflict) {
        hideLoading();
        showModal({
          title: '发布失败',
          content: '该车位在此时间段刚刚被其他用户占用，请重新选择时间',
          showCancel: false
        });
        this.setData({ submitting: false, hasConflict: true });
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

      // 清除草稿
      this.clearDraft();

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
      ErrorHandler.handle(err, {
        context: 'publish.onSubmit',
        showToast: true,
        onRetry: () => this.onSubmit()
      });
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
    // 检查是否有未提交的内容
    if (this.data.spotNumber || this.data.date !== this.data.today) {
      showModal({
        title: '确认离开',
        content: '您有未发布的内容，确定要离开吗？',
        confirmText: '离开',
        cancelText: '继续编辑',
        success: (res) => {
          if (res.confirm) {
            this.saveDraft();
            wx.navigateBack();
          }
        }
      });
    } else {
      wx.navigateBack();
    }
  }
});
