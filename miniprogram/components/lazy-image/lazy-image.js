// components/lazy-image/lazy-image.js
Component({
  /**
   * 组件属性
   */
  properties: {
    src: {
      type: String,
      value: ''
    },
    mode: {
      type: String,
      value: 'aspectFill'
    },
    width: {
      type: String,
      value: '100%'
    },
    height: {
      type: String,
      value: '100%'
    },
    radius: {
      type: String,
      value: '0'
    }
  },

  /**
   * 组件数据
   */
  data: {
    loaded: false,
    error: false,
    showImage: false
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 监听图片变化
      this.observerImage();
    },

    detached() {
      // 清除监听
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
      }
    }
  },

  /**
   * 属性监听器
   */
  observers: {
    'src': function(newSrc) {
      if (newSrc) {
        this.setData({
          loaded: false,
          error: false,
          showImage: false
        });
        this.observerImage();
      }
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 监听图片是否进入视口
     */
    observerImage() {
      const query = this.createSelectorQuery();
      query.select('.lazy-image-container').boundingClientRect();
      query.exec((res) => {
        if (res && res[0]) {
          // 使用 IntersectionObserver 实现懒加载
          this.intersectionObserver = wx.createIntersectionObserver(this, {
            thresholds: [0.01]
          });

          this.intersectionObserver.relativeToViewport().observe('.lazy-image-container', (intersection) => {
            if (intersection.intersectionRatio > 0) {
              this.loadImage();
              this.intersectionObserver.disconnect();
            }
          });
        } else {
          // 如果获取不到位置，直接加载
          this.loadImage();
        }
      });
    },

    /**
     * 加载图片
     */
    loadImage() {
      if (!this.data.src || this.data.showImage) return;

      // 预加载图片
      const img = wx.createImage();
      img.onload = () => {
        this.setData({
          loaded: true,
          showImage: true,
          error: false
        });
      };

      img.onerror = () => {
        this.setData({
          error: true,
          loaded: true,
          showImage: false
        });
      };

      img.src = this.data.src;
    },

    /**
     * 图片加载错误
     */
    onImageError() {
      this.setData({
        error: true,
        showImage: false
      });
    }
  }
});
