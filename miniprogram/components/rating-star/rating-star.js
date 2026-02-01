// components/rating-star/rating-star.js
Component({
  /**
   * 组件属性
   */
  properties: {
    value: {
      type: Number,
      value: 0
    },
    count: {
      type: Number,
      value: 5
    },
    size: {
      type: String,
      value: 'medium' // small, medium, large
    },
    readonly: {
      type: Boolean,
      value: false
    },
    allowHalf: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件数据
   */
  data: {
    stars: [],
    currentValue: 0,
    tempValue: 0
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.initStars(this.data.value);
    }
  },

  /**
   * 属性监听器
   */
  observers: {
    'value': function(newVal) {
      this.initStars(newVal);
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 初始化星星
     */
    initStars(value) {
      const stars = [];
      for (let i = 1; i <= this.data.count; i++) {
        if (this.data.allowHalf) {
          if (value >= i) {
            stars.push('full');
          } else if (value >= i - 0.5) {
            stars.push('half');
          } else {
            stars.push('empty');
          }
        } else {
          stars.push(value >= i ? 'full' : 'empty');
        }
      }
      this.setData({ stars, currentValue: value });
    },

    /**
     * 点击星星
     */
    onStarTap(e) {
      if (this.data.readonly) return;

      const index = e.currentTarget.dataset.index;
      const value = index + 1;

      this.setData({ currentValue: value });
      this.initStars(value);

      this.triggerEvent('change', { value });
    },

    /**
     * 获取当前评分
     */
    getValue() {
      return this.data.currentValue;
    }
  }
});
