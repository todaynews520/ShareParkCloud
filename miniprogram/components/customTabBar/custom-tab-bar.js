// components/customTabBar/custom-tab-bar.js - 自定义底部导航栏组件
Component({
  name: 'custom-tab-bar',
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
      const index = data.index;
      const url = data.path;

      // 设置选中的 tab
      this.setData({
        selected: index
      });

      wx.switchTab({
        url: url
      });
    },

    publish() {
      // 发布按钮单独处理
      this.setData({
        selected: 1
      });
      wx.navigateTo({
        url: '/pages/publish/publish'
      });
    }
  }
});
