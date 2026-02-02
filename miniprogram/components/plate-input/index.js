// components/plate-input/index.js
const validator = require('../../utils/validator.js')
const cache = require('../../utils/cache.js')

// 省份简称（3行x10列）
const PROVINCES = [
  ['京', '沪', '粤', '津', '渝', '冀', '豫', '云', '辽', '黑'],
  ['湘', '皖', '鲁', '新', '苏', '浙', '赣', '鄂', '桂', '甘'],
  ['晋', '蒙', '陕', '吉', '闽', '贵', '川', '青', '藏', '琼']
]

// 字母数字键盘布局
const NUMBER_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
const LETTER_ROW1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'P']
const LETTER_ROW2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K']
const LETTER_ROW3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'L']

Component({
  /**
   * 组件属性
   */
  properties: {
    value: {
      type: String,
      value: ''
    },
    maxlength: {
      type: Number,
      value: 8
    },
    placeholder: {
      type: String,
      value: '请输入车牌号'
    }
  },

  /**
   * 组件数据
   */
  data: {
    // 分段显示数组
    segments: ['', '', '', '', '', '', '', ''],
    // 当前输入位置
    currentIndex: 0,
    // 键盘类型：'province' | 'alphanumeric'
    keyboardType: 'province',
    // 是否显示键盘
    showKeyboard: false,
    // 是否新能源车牌
    isNewEnergy: false,
    // 省份键盘（3行）
    provinceRows: PROVINCES,
    // 数字键
    numberKeys: NUMBER_KEYS,
    // 字母键（3行）
    letterRow1: LETTER_ROW1,
    letterRow2: LETTER_ROW2,
    letterRow3: LETTER_ROW3,
    // 历史车牌
    plateHistory: []
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.loadPlateHistory()
      // 如果有初始值，解析并显示
      if (this.properties.value) {
        this.parseValue(this.properties.value)
      }
    }
  },

  /**
   * 属性监听器
   */
  observers: {
    'value': function(newVal) {
      if (newVal && newVal !== this.getFullPlate()) {
        this.parseValue(newVal)
      }
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 解析初始值
     */
    parseValue(value) {
      // 去除点号和空格，转大写
      const normalized = value.toUpperCase().replace(/[·.\s]/g, '')
      const segments = ['', '', '', '', '', '', '', '']
      const isNewEnergy = normalized.length === 8

      for (let i = 0; i < normalized.length && i < 8; i++) {
        segments[i] = normalized[i]
      }

      this.setData({
        segments,
        isNewEnergy,
        currentIndex: normalized.length < 8 ? normalized.length : 7
      })
    },

    /**
     * 加载历史车牌
     */
    loadPlateHistory() {
      try {
        const history = cache.get('plateHistory') || []
        this.setData({ plateHistory: history })
      } catch (err) {
        console.error('加载历史车牌失败:', err)
      }
    },

    /**
     * 保存历史车牌
     */
    savePlateHistory(plate) {
      try {
        let history = cache.get('plateHistory') || []
        // 去重，最多保存10条
        history = history.filter(item => item !== plate)
        history.unshift(plate)
        if (history.length > 10) {
          history = history.slice(0, 10)
        }
        cache.set('plateHistory', history)
        this.setData({ plateHistory: history })
      } catch (err) {
        console.error('保存历史车牌失败:', err)
      }
    },

    /**
     * 点击输入框
     */
    onBoxTap(e) {
      const index = parseInt(e.currentTarget.dataset.index)

      // 如果是第8位且未启用新能源，不允许点击
      if (index === 7 && !this.data.isNewEnergy) {
        return
      }

      this.setData({
        currentIndex: index,
        showKeyboard: true,
        keyboardType: index === 0 ? 'province' : 'alphanumeric'
      })
    },

    /**
     * 键盘按键点击
     */
    onKeyPress(e) {
      const key = e.currentTarget.dataset.key
      const { currentIndex, segments, isNewEnergy } = this.data

      // 检查按键是否有效
      if (!this.isValidForPosition(key)) {
        return
      }

      // 更新当前位
      segments[currentIndex] = key
      this.setData({ segments })

      // 触发输入事件
      const fullPlate = this.getFullPlate()
      const validation = validator.validatePlateNumber(fullPlate)
      this.triggerEvent('input', {
        value: fullPlate,
        valid: validation.valid
      })

      // 移动到下一位
      this.moveToNextPosition()
    },

    /**
     * 删除键
     */
    onDelete() {
      const { currentIndex, segments } = this.data

      if (currentIndex > 0) {
        // 清空当前位
        segments[currentIndex] = ''
        // 移动到上一位
        const newIndex = currentIndex - 1
        segments[newIndex] = ''

        this.setData({
          segments,
          currentIndex: newIndex,
          keyboardType: newIndex === 0 ? 'province' : 'alphanumeric'
        })

        // 触发输入事件
        const fullPlate = this.getFullPlate()
        const validation = validator.validatePlateNumber(fullPlate)
        this.triggerEvent('input', {
          value: fullPlate,
          valid: validation.valid
        })
      }
    },

    /**
     * 移动到下一个输入位置
     */
    moveToNextPosition() {
      const { currentIndex, isNewEnergy } = this.data
      const maxLength = isNewEnergy ? 8 : 7

      if (currentIndex < maxLength - 1) {
        const newIndex = currentIndex + 1
        this.setData({
          currentIndex: newIndex
        })

        // 如果到达第8位且未启用新能源，自动启用
        if (newIndex === 7 && !isNewEnergy) {
          this.setData({ isNewEnergy: true })
        }
      } else {
        // 输入完成
        this.onInputComplete()
      }
    },

    /**
     * 输入完成
     */
    onInputComplete() {
      const fullPlate = this.getFullPlate()
      const validation = validator.validatePlateNumber(fullPlate)

      if (validation.valid) {
        // 保存到历史记录
        this.savePlateHistory(fullPlate)

        // 隐藏键盘
        this.setData({ showKeyboard: false })

        // 触发完成事件
        this.triggerEvent('complete', {
          value: fullPlate,
          normalized: validation.normalized
        })
      } else {
        wx.showToast({
          title: validation.message || '车牌号格式不正确',
          icon: 'none'
        })
      }
    },

    /**
     * 切换新能源模式
     */
    onToggleNewEnergy() {
      const isNewEnergy = !this.data.isNewEnergy
      const { segments } = this.data

      // 如果关闭新能源，清空第8位
      if (!isNewEnergy) {
        segments[7] = ''
        if (this.data.currentIndex === 7) {
          this.setData({ currentIndex: 6 })
        }
      }

      this.setData({
        isNewEnergy,
        segments
      })

      // 触发输入事件
      const fullPlate = this.getFullPlate()
      const validation = validator.validatePlateNumber(fullPlate)
      this.triggerEvent('input', {
        value: fullPlate,
        valid: validation.valid
      })
    },

    /**
     * 选择历史车牌
     */
    onSelectHistory(e) {
      const plate = e.currentTarget.dataset.plate
      this.parseValue(plate)

      // 触发完成事件
      const validation = validator.validatePlateNumber(plate)
      this.triggerEvent('complete', {
        value: plate,
        normalized: validation.normalized
      })
    },

    /**
     * 检查按键在当前位置是否有效
     */
    isValidForPosition(key) {
      const { currentIndex, segments } = this.data

      // 第1位：必须是省份
      if (currentIndex === 0) {
        return PROVINCES.flat().includes(key)
      }

      // 第2位：必须是字母
      if (currentIndex === 1) {
        return LETTER_ROW1.concat(LETTER_ROW2, LETTER_ROW3).includes(key)
      }

      // 第3-8位：可以是字母或数字
      const allValidChars = NUMBER_KEYS.concat(
        LETTER_ROW1,
        LETTER_ROW2,
        LETTER_ROW3,
        ['挂', '学', '警', '港', '澳']
      )
      return allValidChars.includes(key)
    },

    /**
     * 获取完整车牌号
     */
    getFullPlate() {
      const { segments, isNewEnergy } = this.data
      const maxLength = isNewEnergy ? 8 : 7
      const plate = segments.slice(0, maxLength).join('')
      return plate
    },

    /**
     * 公共方法：聚焦输入框
     */
    focus() {
      this.setData({
        showKeyboard: true,
        currentIndex: this.getFirstEmptyIndex()
      })
    },

    /**
     * 公共方法：清空输入
     */
    clear() {
      this.setData({
        segments: ['', '', '', '', '', '', '', ''],
        currentIndex: 0,
        isNewEnergy: false,
        showKeyboard: false
      })
      this.triggerEvent('input', {
        value: '',
        valid: false
      })
    },

    /**
     * 公共方法：设置值
     */
    setValue(value) {
      this.parseValue(value)
    },

    /**
     * 获取第一个空位索引
     */
    getFirstEmptyIndex() {
      const { segments, isNewEnergy } = this.data
      const maxLength = isNewEnergy ? 8 : 7

      for (let i = 0; i < maxLength; i++) {
        if (!segments[i]) {
          return i
        }
      }
      return maxLength - 1
    }
  }
})
