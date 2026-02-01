// components/customTabBar/customTabBar.js - 自定义底部导航栏组件
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    selected: {
      type: Number,
      value: 0
    },
    color: {
      type: String,
      value: '#667eea'
    },
    selectedColor: {
      type: String,
      value: '#667eea'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    list: [
      {
        pagePath: '/pages/index/index',
        text: '浏览',
        emoji: '🏠'
      },
      {
        pagePath: '/pages/publish/publish',
        text: '发布',
        emoji: '➕'
      },
      {
        pagePath: '/pages/personal/personal',
        text: '我的',
        emoji: '👤'
      }
    ]
  },

  /**
   * 组件的方法列表
   */
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;

      wx.switchTab({
        url: url
      });
    }
  }
});
