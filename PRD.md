# 邻里车位 - 产品需求文档 (PRD)
**版本**: v1.1  
**日期**: 2026-02-01  
**格式**: Claude Code 标准 PRD  
**框架**: 微信小程序 (WeChat Mini Program)  
**UI框架**: Tailwind CSS  

---

## 1. 产品概述 (Overview)

### 1.1 核心功能
基于 LBS 的社区车位共享平台，允许实名认证业主发布闲置车位，访客在 500m-3km 范围内预约使用。支持**二维码人工核验**与**车牌自动识别**两种入场方式。

### 1.2 技术栈
- **前端**: 微信小程序原生 / Taro / Uni-app
- **样式**: Tailwind CSS (via CDN or build)
- **状态管理**: 全局状态管理用户登录态、当前位置、订单状态
- **地图**: 静态 CSS Grid 地图 (非腾讯地图API，性能优先)
- **图标**: Font Awesome 6.4
- **二维码**: 动态 JWT 生成，30秒刷新

### 1.3 设计规范 (Design System)
```css
/* 颜色体系 */
--color-primary: #0d9488;        /* Teal-600 */
--color-primary-light: #f0fdfa;  /* Teal-50 */
--color-secondary: #10b981;      /* Emerald-500 */
--color-accent: #f97316;         /* Orange-500 (价格) */
--color-danger: #ef4444;         /* Red-500 (过期/取消) */
--color-bg: #f0fdfa;             /* 页面背景 */
--color-card: #ffffff;           /* 卡片背景 */
--color-text-primary: #1f2937;   /* Gray-800 */
--color-text-secondary: #6b7280; /* Gray-500 */
--color-border: #e5e7eb;         /* Gray-200 */

/* 字体 */
--font-family: 'Inter', 'Noto Sans SC', sans-serif;

/* 圆角 */
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
--radius-full: 9999px;

/* 阴影 */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

---

## 2. 页面清单 (Page Inventory)

| 页面ID | 页面名称 | 路径 | 核心功能 | 优先级 |
|-------|---------|------|---------|-------|
| `P00` | TabBar 导航 | `app.json` | 底部固定导航栏，切换 3 个主页面 | P0 |
| `P01` | 发现页 (首页) | `/pages/home/index` | 地图视图、车位列表、筛选标签 | P0 |
| `P02` | 发布页 | `/pages/publish/index` | 车位信息录入、时间选择、定价 | P0 |
| `P03` | 预约页 | `/pages/book/index` | 订单确认、车牌输入、支付 | P0 |
| `P04` | 入场凭证页 | `/pages/book/entry-pass` | 二维码展示、道闸对接、核验 | P0 |
| `P05` | 个人中心 | `/pages/profile/index` | 我的发布/预约管理、数据统计 | P0 |
| `P06` | 预约成功 | `/pages/book/success` | 结果展示、跳转引导 | P1 |

---

## 3. 页面详细设计 (Page Specifications)

### P01. 发现页 (Home/Discovery)

#### 3.1.1 布局结构
```
┌─────────────────────────────────────┐
│ 状态栏 (20:04)      [通知Icon]        │  Header: 固定顶部, 高度 44px
├─────────────────────────────────────┤
│                                     │
│     [地图视图 - 40% 屏幕高度]         │  MapView: 相对定位, 渐变背景
│     • (我的位置)  • (可租车位)        │         CSS Grid 背景
│                                     │
│  [搜索卡片] - 绝对定位, bottom:16px  │
├─────────────────────────────────────┤
│  [筛选标签栏] - 横向滚动              │  Filter: padding 16px
├─────────────────────────────────────┤
│  附近车位 (数量Badge)   [筛选]        │  Title: flex justify-between
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ [车位卡片1]                    │  │  List: flex-col gap-12px
│  │ [车位卡片2]                    │  │       scroll-y
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
│        [TabBar - 底部固定]           │
└─────────────────────────────────────┘
```

#### 3.1.2 组件详情

**A. 地图视图区域 (Map Hero Section)**
- **高度**: `40vh` (min 280px, max 320px)
- **背景**: `bg-gradient-to-br from-teal-100 to-emerald-100`
- **网格**: 绝对定位, 30px 间隔的淡青色网格线 (opacity 0.1)
- **标记点**:
  - 我的位置: 中心蓝色圆点 (w-6 h-6), 脉冲动画 (`animate-ping`)
  - 可租车位: 橙色圆点 (w-4 h-4), 弹跳动画 (`animate-bounce`)
- **范围选择器**: 右上角浮动列, 3 个按钮 (500m active/1km/3km)

**B. 搜索卡 (Search Card)**
- **样式**: 白色背景, rounded-2xl, shadow-lg, margin 左右各 16px
- **内容**: 位置Icon + 小区名 + 可用数量 + 刷新按钮 (Teal-600)

**C. 筛选标签 (Filter Chips)**
- **容器**: `overflow-x-auto`, `hide-scrollbar`, padding 16px
- **标签项**: 
  - Default: `bg-gray-100 text-gray-600 rounded-full px-4 py-2 text-sm`
  - Active: `bg-teal-600 text-white shadow-md`
- **选项**: 全部/可充电/有监控/室内/立即入驻

**D. 车位卡片 (Spot Card)**
- **布局**: Flex row, gap 12px, padding 16px, `bg-white rounded-2xl shadow-sm border border-gray-100`
- **左侧**: 
  - 图标容器: 80x80px, `bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl`, icon `fa-car text-teal-600 text-2xl`
  - Badge: 绝对定位 top-right, "最近", `bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full`
- **右侧**:
  - Header: 车位名 (truncate) + 价格 (`text-orange-500 text-2xl font-bold`)
  - 位置: `fa-map-pin text-teal-500 mr-1` + 距离
  - 标签: 横向 flex wrap, gap 8px, `text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100`
  - Footer: 业主头像 (32px圆) + 星级评分 + 预约按钮 (`bg-teal-600 text-white text-xs px-4 py-1.5 rounded-full`)

#### 3.1.3 交互逻辑 (Interactions)
| 触发 | 动作 | 结果 |
|-----|------|-----|
| 点击范围按钮 (500m/1km/3km) | 切换范围 | 高亮选中按钮, 刷新列表数据 |
| 点击筛选标签 | 多选/单选切 | Active 状态切换, 列表过滤 |
| 点击车位卡片 | 导航跳转 | `wx.navigateTo` -> P03 预约页, 携带 spot_id |
| 点击发布按钮 (+) | Tab 切换 | `wx.switchTab` -> P02 发布页 |
| 下拉列表 | 刷新 | 显示 loading, reload spots data |

---

### P02. 发布页 (Publish)

#### 3.2.1 布局结构
```
┌─────────────────────────────────────┐
│ [←] 分享我的车位        [帮助Icon]    │  Header: 渐变背景, 返回按钮
│      让闲置车位帮助邻居...          │
├─────────────────────────────────────┤
│ [内容区域 - 垂直滚动]                 │
│ ┌─ 地图选址卡片 ─────────────────┐  │
│ │  [静态地图 preview]            │  │
│ │  [车位号 Input]                │  │
│ └────────────────────────────────┘  │
│ ┌─ 时间设置卡片 ─────────────────┐  │
│ │  [日期选择 - 7天横向]          │  │
│ │  [时间滑块]                    │  │
│ │  [时长快捷标签: 1/2/4/8小时]    │  │
│ │  [结束时间 - 绿色高亮卡片]      │  │
│ └────────────────────────────────┘  │
│ ┌─ 价格设置卡片 ─────────────────┐  │
│ │  [建议价标签] [Input ¥/小时]   │  │
│ │  [收益计算器 - 橙色]            │  │
│ └────────────────────────────────┘  │
│ ┌─ 特性标签卡片 ─────────────────┐  │
│ │  [多选 Grid: 充电桩/监控/室内]  │  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
│  [底部固定栏]  预计收益 ¥X  [发布]   │
└─────────────────────────────────────┘
```

#### 3.2.2 组件详情

**A. 日期选择器 (Date Picker)**
- **样式**: 横向 7 天 Grid, gap 8px
- **Item**: Flex-col, 星期(top) + 日期(bottom)
- **Active**: `bg-teal-600 text-white shadow-md transform scale-105`
- **今天**: 特殊标签 "今天"

**B. 时间滑块 (Time Slider)**
- **Input**: `type="range"`, min=0, max=23, step=1, class `time-slider`
- **样式**: 自定义 thumb (20px 圆形, teal-600), track height 6px
- **显示**: 实时更新 "开始时间" 文本 (24h格式)

**C. 快捷时长 (Quick Duration)**
- **选项**: 1小时(默认) / 2小时 / 4小时 / 半天(8小时)
- **逻辑**: 点击更新 `selectedDuration`, 自动计算并显示结束时间
- **计算**: `结束时间 = 开始时间 + 时长` (跨天提示)

**D. 价格与收益**
- **建议价**: 横向 3 个按钮 (¥3/4/5), 点击填充 input
- **Input**: Large text (text-2xl), 前缀 ¥, 后缀 /小时
- **收益计算**: 实时显示 `价格 * 时长 * 0.9` (扣除10%服务费)

**E. 特性多选 (Features)**
- **Grid**: 3 columns, gap 12px
- **Item**: Checkbox + Icon + Label, `border-2 rounded-xl p-3`
- **选中**: `border-teal-500 bg-teal-50`

#### 3.2.3 状态管理 (State)
```javascript
{
  form: {
    location: { lat: Number, lng: Number, name: String },
    spotNumber: String,
    date: DateString,
    startHour: Number (0-23),
    duration: Number (1/2/4/8),
    price: Number,
    features: {
      charger: Boolean,
      monitor: Boolean,
      indoor: Boolean,
      lock: Boolean,
      largeCar: Boolean
    }
  },
  ui: {
    calculatedEndTime: String,
    estimatedEarning: Number,
    selectedDateIndex: Number (0-6)
  }
}
```

#### 3.2.4 表单验证 (Validation)
- 车位号: 必填, 最长10字符
- 价格: 范围 1-50, 必填
- 日期: 默认今天, 不可选过去日期
- 提交: Loading 状态防重复提交

---

### P03. 预约页 (Booking)

#### 3.3.1 布局结构
```
┌─────────────────────────────────────┐
│ [←] 预约车位                        │  Header: 渐变背景
├─────────────────────────────────────┤
│ ┌─ 信息摘要 (紫色渐变卡片) ───────┐ │
│ │ 45号        可用      ¥5/时    │ │
│ │ 阳光花园 A区地下                 │ │
│ └────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─ 详情网格 ─────────────────────┐ │
│ │ [Icon] 日期: 2026-02-01        │ │
│ │ [Icon] 时段: 13:12-14:12       │ │
│ │ [Icon] 时长: 1小时             │ │
│ │ [Icon] 发布者: 鱼禾            │ │
│ └────────────────────────────────┘ │
│ ┌─ 地图导航预览 ─────────────────┐ │
│ │ [简化路线图] 步行3分钟 180米    │ │
│ └────────────────────────────────┘ │
│ ┌─ 车牌号输入 ───────────────────┐ │
│ │ [Input - 大字体居中]            │ │
│ │ [快捷车牌历史] [新能源按钮]      │ │
│ │ 提示: 请填写以便物业放行         │ │
│ └────────────────────────────────┘ │
│ ┌─ 费用明细 ─────────────────────┐ │
│ │ 车位费 ¥5.00                   │ │
│ │ 服务费 ¥0.50                   │ │
│ │ 合计   ¥5.50  (Orange bold)    │ │
│ └────────────────────────────────┘ │
│ ┌─ 通知授权 (蓝色卡片) ──────────┐ │
│ └────────────────────────────────┘ │
└─────────────────────────────────────┘
│ [底部固定]  需支付 ¥5.50 [预约]    │
└─────────────────────────────────────┘
```

#### 3.3.2 组件详情

**A. 信息摘要 (Info Card)**
- **背景**: `bg-white/10 backdrop-blur-md rounded-2xl border border-white/20`
- **布局**: Flex justify-between
- **元素**: 大号车位号 (text-3xl bold), status badge (可用), 价格 (橙色)

**B. 车牌输入 (Plate Input)**
- **Input**: Center text, large font (text-lg tracking-wider), uppercase
- **快捷历史**: 横向滚动, 过往车牌 Tag (点击填充)
- **新能源按钮**: 右侧 small button, 自动填充 "京A·DXXXXX" 格式
- **验证**: 正则 `/^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$/`

**C. 费用明细 (Pricing)**
- **列表**: Flex-col, space-y-2, `text-sm`
- **合计**: `border-t border-gray-100 pt-2 mt-2`, `text-orange-600 text-2xl font-bold`

#### 3.3.3 支付流程 (Payment Flow)
1. 用户点击"立即预约"
2. 前端校验: 车牌号正则验证
3. 调用微信支付 API (`wx.requestPayment`)
4. 成功后跳转 P04 入场凭证页 (自动跳转，非可选)

---

### P04. 入场凭证页 (Entry Pass) [核心新增]

#### 3.4.1 布局结构
```
┌─────────────────────────────────────┐
│ [←] 入场凭证              [刷新]    │  Header: 白色背景
├─────────────────────────────────────┤
│                                     │
│ ┌─ 状态卡片 ─────────────────────┐ │
│ │     [大图标: 进场或离场]        │ │
│ │  待入场 / 停车中 / 已完成       │ │
│ │  有效期: 13:12 - 14:12         │ │
│ └────────────────────────────────┘ │
│                                     │
│ ┌─ 二维码区域 (居中) ────────────┐ │
│ │                                 │ │
│ │    ┌───────────────────────┐   │ │
│ │    │ ▓▓▓▓ QR CODE ▓▓▓▓▓   │   │ │  200x200px
│ │    │ ▓▓▓▓ [动态生成] ▓▓▓▓▓ │   │ │  30秒刷新
│ │    │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │   │ │
│ │    └───────────────────────┘   │ │
│ │                                 │ │
│ │  [████████░░░░░░░░] 20秒后更新  │ │  倒计时进度条
│ │  请向保安出示，扫码核验         │ │
│ └────────────────────────────────┘ │
│                                     │
│ ┌─ 车牌信息栏 ───────────────────┐ │
│ │  🚗  京A·12345                  │ │
│ │     [新能源 | 蓝色牌照]          │ │
│ └────────────────────────────────┘ │
│                                     │
│ ┌─ 离线验证码 (折叠) ────────────┐ │
│ │  如二维码失效，请报: 8A3B9C      │ │
│ └────────────────────────────────┘ │
│                                     │
│ [导航去车位]     [联系业主]        │
│                                     │
└─────────────────────────────────────┘
│  ⚠️ 提示: 提前15分钟可入场          │
└─────────────────────────────────────┘
```

#### 3.4.2 二维码技术规范

**A. 二维码内容 (JWT 格式)**
```typescript
// Payload 结构
interface QRCodePayload {
  orderId: string;           // 订单唯一ID
  spotId: string;            // 车位ID
  plate: string;             // 车牌号 (大写无点)
  entryTime: string;         // ISO 8601, 允许入场时间
  exitTime: string;          // ISO 8601, 必须离场时间
  nonce: string;             // 6位随机数，防重放攻击
  iat: number;               // 签发时间 (unix timestamp)
  exp: number;               // 过期时间 (iat + 30s)
}

// JWT 签名: HS256 (或使用 RSA 如果物业端需要验证)
// QR 字符串: `https://neighborpark.com/verify?token=${JWT}`
```

**B. 刷新机制**
- **频率**: 每 30 秒自动刷新 (防止截图盗用)
- **动画**: 刷新时有 360° 旋转图标 (`animate-spin`) + 轻微缩放脉冲
- **倒计时**: 二维码下方显示进度条 (`h-1 bg-teal-200 rounded-full`)，30秒递减

**C. 离线容错 (Fallback)**
- **静态核验码**: 支付成功后生成 6 位字母数字混合码 (如 `8A3B9C`)，该区域网络波动时显示
- **人工输入**: 物业端支持手动输入 6 位码查询订单有效性

#### 3.4.3 道闸对接方案 (Dual Mode)

**方案 A: 车牌自动识别 (API 对接)**
```yaml
Endpoint: POST https://api.neighborpark.com/v1/gate/verify
Headers:
  X-API-Key: {物业分配给道闸的Key}
  Content-Type: application/json
Body:
  plate: "京A12345"
  gateId: "GATE_SUNSHINE_A_01"
  timestamp: 1706799600
  
Response 200:
  valid: true
  orderId: "ORD_20260201_001"
  type: "entry"              # entry 或 exit
  expireAt: "2026-02-01T14:12:00Z"
  remainingMinutes: 45
  allowOpen: true
  
Response 403:
  valid: false
  reason: "expired" | "invalid_plate" | "out_of_time"
  message: "预约已过期"
  
性能要求: 响应时间 < 200ms (确保通行流畅)
故障降级: 接口超时(>2s)或无响应时，道闸语音播报"请走人工通道"，LED显示"系统维护"
```

**方案 B: 二维码人工核验 (保安端)**
- **扫码工具**: 微信小程序扫一扫 / 专用物业端 APP
- **验证页显示**:
  1. 车牌号（大字体，红色高亮如果不匹配）
  2. 有效期时间条 (绿色: 有效, 红色: 过期)
  3. 业主信息（脱敏: 鱼*）
  4. 操作按钮: [确认放行] [拒绝入场]
- **记录**: 保安点击放行后，记录 `securityGuardId` 与 `timestamp`

#### 3.4.4 状态流转与凭证失效

| 订单状态 | 凭证显示 | 二维码颜色 | 道闸响应 | 备注 |
|---------|---------|-----------|---------|------|
| `paid` | 待入场 | 🟢 绿色 | 允许入场 | 提前15分钟可进 |
| `active` | 停车中 | 🔵 蓝色 | 允许离场 (只出不进) | 已入场未离场 |
| `completed` | 已完成 | ⚪ 灰色 | 🚫 禁止 | 正常结束 |
| `overstayed` | 已超时 | 🔴 红色 | 🚫 禁止 + 补缴提示 | 超时未离场，需补缴 |

**超时处理**:
- 超过 `exitTime` 后，二维码立即变红，显示 "已超时，请补缴"
- 点击 **"延长停车"** 按钮，按 1.5倍单价/小时 补缴，重新生成凭证

---

### P05. 个人中心 (Profile)

#### 3.5.1 布局结构
```
┌─────────────────────────────────────┐
│ 个人中心                [设置Icon]    │  Header: 渐变背景 (深色)
├─────────────────────────────────────┤
│ [头像] 鱼禾                          │
│ [实名认证] [优质车主]                 │
│ 阳光花园 · 3号楼2单元                 │
│                                     │
│ [发布12次] [收益¥256] [评分4.9]      │  统计行
├─────────────────────────────────────┤
│ [我的发布 3] │ [我的预约 1]          │  Tab 切换, 下划线动画
├─────────────────────────────────────┤
│                                     │
│ [列表内容根据 Tab 切换]               │
│                                     │
│ ┌─ 发布卡片 ─────────────────────┐ │
│ │ [45号] [进行中]        ¥5/时   │ │
│ │  2026-02-01 13:12-14:12        │ │
│ │ [查看详情] [取消发布]           │ │
│ └────────────────────────────────┘ │
│                                     │
│ ┌─ 预约卡片 (含入场按钮) ────────┐ │
│ │ [C区12号] [即将开始]            │ │
│ │  👉 [查看入场凭证] (醒目按钮)   │ │
│ └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### 3.5.2 组件详情

**A. 用户信息 (User Profile)**
- **头像**: 80px, `rounded-full border-4 border-white shadow-lg`
- **标签**: 横向 flex, gap-8px, `bg-white/20 backdrop-blur rounded-full px-2 py-0.5`

**B. Tab 切换 (Segmented Control)**
- **下划线**: 绝对定位 div, `h-1 bg-teal-600 rounded-full`, transition-all 300ms
- **控制**: 下方显示 `list-publish` vs `list-order`

**C. 预约卡片增强 (含入场凭证入口)**
- **状态**: 
  - `即将开始` (15分钟内): 显示 **绿色大按钮** "打开入场凭证"
  - `进行中`: 显示 **蓝色按钮** "查看停车凭证 (离场用)"
  - `已结束`: 显示评价按钮
- **点击**: 跳转到 P04 入场凭证页

---

## 4. 全局组件 (Global Components)

### G01. TabBar 导航
```yaml
Position: fixed bottom-0 left-0 right-0
Height: 80px (含安全区)
Background: white, border-t border-gray-200
Items:
  - Icon: fa-map-marked-alt, Label: "发现", Page: P01
  - Icon: fa-plus (特殊样式), Label: "发布", Page: P02
    Style: w-14 h-14, -mt-8, gradient bg, pulse-ring animation
  - Icon: fa-user, Label: "我的", Page: P05
ActiveColor: text-teal-600
InactiveColor: text-gray-400
```

### G02. 成功弹窗 (Success Modal)
- **触发**: 支付成功
- **内容**: SVG 打勾动画 + 订单摘要 + "查看入场凭证" / "返回首页" 双按钮
- **自动跳转**: 3秒后自动跳转到 P04 入场凭证页

---

## 5. 数据模型 (Data Models)

### 5.1 车位 (ParkingSpot)
```typescript
interface ParkingSpot {
  id: string;
  ownerId: string;
  spotNumber: string;
  location: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  schedule: {
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
  };
  price: {
    hourly: number;
    currency: 'CNY';
  };
  features: {
    hasCharger: boolean;
    hasMonitor: boolean;
    isIndoor: boolean;
    hasLock: boolean;
    largeVehicle: boolean;
  };
  status: 'available' | 'booked' | 'in_use' | 'completed';
  ratings: {
    score: number;
    count: number;
  };
}
```

### 5.2 订单 (Order)
```typescript
interface Order {
  id: string;
  spotId: string;
  renterId: string;
  plateNumber: string;        // 访客车牌
  timeRange: {
    start: string;
    end: string;
  };
  pricing: {
    baseFee: number;
    serviceFee: number;
    total: number;
  };
  status: 'pending' | 'paid' | 'awaiting_entry' | 'active' | 'completed' | 'cancelled' | 'overstayed';
  
  // 入场凭证相关
  entryPass: {
    qrToken: string;          // JWT Token
    staticCode: string;       // 6位离线验证码
    generatedAt: timestamp;
    expiresAt: timestamp;     // 比订单结束晚15分钟缓冲
    refreshInterval: number;  // 30 (秒)
  };
  
  // 通行记录
  entryLog: {
    entryTime: timestamp;
    entryGateId: string;
    exitTime: timestamp;
    exitGateId: string;
    verifiedBy: 'auto_plate' | 'manual_qr' | 'manual_code';
    securityGuardId: string;
  };
  
  createdAt: timestamp;
}
```

### 5.3 道闸记录 (GateLog) [新增]
```typescript
interface GateLog {
  id: string;
  gateId: string;
  orderId: string;
  plate: string;
  direction: 'entry' | 'exit';
  timestamp: timestamp;
  method: 'api_auto' | 'qr_scan' | 'manual_input';
  result: 'allowed' | 'denied';
  reason?: string;
  operatorId?: string;
}
```

### 5.4 用户 (User)
```typescript
interface User {
  id: string;
  nickname: string;
  avatar: string;
  phone: string;
  isVerified: boolean;
  isPropertyManager: boolean;  // 是否为物业人员
  community: {
    name: string;
    building: string;
    unit: string;
  };
  stats: {
    publishCount: number;
    totalEarning: number;
    rating: number;
  };
}
```

---

## 6. 业务流程 (Workflows)

### 6.1 标准预约与入场流程
```
访客打开小程序
    ↓
浏览车位 (P01) → 选择车位 → 进入预约页 (P03)
    ↓
填写车牌号 → 确认费用 → 微信支付
    ↓
支付成功 → 自动跳转入场凭证页 (P04)
    ↓
[并行]
├─ 方案A: 驾车到达道闸 → 车牌识别 → 调用API验证 → 开闸入场
└─ 方案B: 驾车到达门岗 → 出示二维码 → 保安扫码验证 → 手动放行
    ↓
停车时长监控 (系统后台计时)
    ↓
离场时 (同上，方向为 exit)
    ↓
订单完成，双方评价
```

### 6.2 异常处理流程
**超时未离场**:
1. 系统检测当前时间 > `exitTime` + 10分钟缓冲
2. 订单状态变为 `overstayed`
3. 二维码变红，道闸拒绝出场
4. 访客在 P04 页面点击"补缴费用"，按 1.5倍费率计算差额
5. 补缴后生成临时离场二维码 (15分钟有效)

**二维码失效**:
1. 网络中断 > 30秒，二维码无法刷新
2. 自动显示 6位静态核验码 (`staticCode`)
3. 保安在物业端输入代码查询订单信息
4. 手动核验后放行，记录 `manual_code`

---

## 7. 业务规则 (Business Rules)

### 7.1 费用计算
```
访客支付总额 = 车位费 (价格 × 时长) + 服务费 (车位费 × 10%)
业主净收益 = 车位费 × 90% (T+1到账)

超时费用 = 原价 × 1.5 × 超时小时数 (不足1小时按1小时计)
```

### 7.2 时间规则
- **最早入场**: 预约开始时间前 **15分钟**
- **最晚入场**: 预约开始时间后 **30分钟** (迟到宽限，超时自动取消并退款)
- **离场宽限**: 预约结束时间后 **10分钟** 内免费
- **二维码有效期**: 订单结束前持续有效，过期后变红

### 7.3 验证规则
**车牌一致性**:
- 道闸识别的车牌必须与订单 `plateNumber` 完全一致 (包括新能源车牌格式 `京AD12345`)
- 不一致时：道闸不开，LED显示"车牌不符，请走人工通道"

**二维码安全性**:
- 每 30 秒刷新，截图无效
- 包含 `nonce` 随机数，同一二维码只能使用一次 (防重放)
- 离场二维码与入场不同 (JWT 中 `type` 字段区分)

---

## 8. 交互状态与动画 (Animations)

### 8.1 页面转场
- **类型**: `fadeIn` (opacity 0->1, translateY 10px->0)
- **Duration**: 300ms ease-out

### 8.2 微交互
| 元素 | 触发 | 动画 | Duration |
|-----|------|-----|---------|
| 按钮按下 | active | scale(0.95) | 150ms |
| 卡片入场 | mount | slideUp (y:20->0) | 400ms stagger |
| 价格更新 | input | moneyPop (scale 1.1) | 300ms |
| 二维码刷新 | interval | rotate 360° + pulse | 500ms |
| 状态变更 | status change | color transition | 300ms |

---

## 9. 开发检查清单 (Dev Checklist)

### 9.1 功能完整性
- [ ] 四个主页面路由配置正确
- [ ] P04 入场凭证页支付后自动跳转逻辑
- [ ] 二维码 30 秒定时刷新机制 (`setInterval`)
- [ ] JWT 生成与签名验证 (使用 `jsonwebtoken` 或云函数)
- [ ] 车牌号大写自动转换与正则校验
- [ ] 道闸 API 接口预留 (POST /gate/verify)

### 9.2 安全性
- [ ] JWT 密钥存储在云函数环境变量，不暴露前端
- [ ] 二维码包含 `exp` 过期时间校验
- [ ] 道闸 API 限流 (Rate Limiting 100次/分钟/IP)
- [ ] 静态核验码 6 位随机生成 (A-Z, 0-9, 排除易混淆字符 I, O, 0)

### 9.3 物业对接兼容性
- [ ] 道闸 API 响应时间 < 200ms 测试
- [ ] 网络超时时 fallback 到人工模式
- [ ] LED 屏显示文本长度适配 (中文 8 个字符以内)
- [ ] 支持夜间高对比度模式 (黑白二维码)

### 9.4 异常处理
- [ ] 手机没电场景：静态码可供保安手动输入
- [ ] 网络中断：本地缓存最后一次有效二维码图片 (灰色显示，标注"离线模式")
- [ ] 重复扫码：同一二维码 5 分钟内重复扫提示"已使用"

---

## 10. 附录 (Appendix)

### 10.1 二维码数据结构示例
```json
{
  "orderId": "ORD_20260201_001",
  "spotId": "SPOT_45",
  "plate": "京A12345",
  "entryTime": "2026-02-01T13:12:00Z",
  "exitTime": "2026-02-01T14:12:00Z",
  "nonce": "a1b2c3",
  "iat": 1706799600,
  "exp": 1706799630,
  "type": "entry"
}
```

### 10.2 道闸对接错误码
| 错误码 | 含义 | 处理建议 |
|-------|------|---------|
| `GATE_001` | 车牌未识别 | 提示用户清洁车牌或走人工通道 |
| `GATE_002` | 预约已过期 | 引导用户补缴费用 |
| `GATE_003` | 时间未到 | 提示提前15分钟才能入场 |
| `GATE_004` | 系统超时 | 转人工处理 |

---

**文档结束**  
*如需求变更，请更新版本号并记录变更日志。*
```