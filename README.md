# 邻里车位小程序 - 实现计划

## 项目概述
基于微信小程序 + 云开发的社区车位共享平台，支持车位发布、预约、双模式入场验证（车牌识别 + 二维码核验）。

---

## 技术选型
- **前端**: 微信小程序原生
- **后端**: 微信云开发（云函数、云数据库）
- **样式**: Tailwind CSS (CDN)
- **支付**: 模拟支付流程（暂不集成真实支付）

---

## 一、项目目录结构

```
ShareParkCloud/
├── miniprogram/
│   ├── app.js                    # 应用入口（云开发初始化）
│   ├── app.json                  # 页面路由、TabBar配置
│   ├── app.wxss                  # 全局样式
│   │
│   ├── config/
│   │   ├── env.js                # 云环境配置
│   │   └── constants.js          # 常量定义
│   │
│   ├── styles/
│   │   ├── theme.wxss            # CSS变量（Teal色系）
│   │   ├── tailwind.wxss         # Tailwind类库
│   │   └── animations.wxss       # 动画定义
│   │
│   ├── utils/
│   │   ├── cache.js              # 本地缓存封装
│   │   ├── validator.js          # 车牌号验证
│   │   ├── errorHandler.js       # 错误处理
│   │   └── formatter.js          # 格式化工具
│   │
│   ├── services/
│   │   ├── cloud.js              # 云开发初始化
│   │   ├── userService.js        # 用户服务
│   │   ├── parkingService.js     # 车位服务
│   │   └── orderService.js       # 订单服务
│   │
│   ├── components/
│   │   ├── spot-card/            # 车位卡片组件
│   │   ├── map-hero/             # 地图视图组件
│   │   └── qr-code-display/      # 二维码展示组件
│   │
│   └── pages/
│       ├── home/                 # P01 发现页
│       ├── publish/              # P02 发布页
│       ├── book/                 # P03 预约页
│       ├── entry-pass/           # P04 入场凭证页
│       ├── profile/              # P05 个人中心
│       └── success/              # P06 预约成功页
│
└── cloudfunctions/
    ├── login/                    # 用户登录
    ├── publish/                  # 车位发布管理
    ├── book/                     # 预约下单
    ├── getQrCode/                # 生成二维码JWT
    └── verify/                   # 道闸验证接口
```

---

## 二、数据库集合设计

| 集合 | 用途 |
|-----|------|
| `users` | 用户信息（openid、昵称、统计） |
| `parking_releases` | 车位发布（位置、时间、价格、状态） |
| `orders` | 订单（车牌、时间、费用、入场凭证） |
| `gate_logs` | 道闸记录（验证日志） |

---

## 三、云函数列表

| 云函数 | 职责 |
|-------|------|
| `login` | 微信登录，获取openid |
| `publish` | 创建/取消车位发布 |
| `book` | 创建订单、模拟支付 |
| `getQrCode` | 生成JWT Token（30秒过期） |
| `verify` | 道闸验证（车牌/二维码） |

---

## 四、页面实现顺序

### 阶段一：基础架构
1. 更新 `app.json` - 配置页面路由和TabBar
2. 创建 `config/` 和 `utils/` 目录及基础文件
3. 创建 `styles/` 目录和主题样式
4. 更新 `app.js` - 初始化云开发

### 阶段二：核心页面
5. 创建 `pages/home/` - 发现页（地图+车位列表）
6. 创建 `pages/publish/` - 发布页（表单+时间选择）
7. 创建 `pages/book/` - 预约页（车牌输入+支付）
8. 部署 `login`、`publish`、`book` 云函数

### 阶段三：入场凭证
9. 创建 `pages/entry-pass/` - 入场凭证页（二维码30秒刷新）
10. 部署 `getQrCode`、`verify` 云函数

### 阶段四：个人中心
11. 创建 `pages/profile/` - 个人中心（发布/预约管理）
12. 创建 `pages/success/` - 预约成功页

### 阶段五：组件封装
13. 创建 `components/` 下的可复用组件
14. 性能优化和测试

---

## 五、关键技术实现

### 1. 静态CSS Grid地图
不使用地图API，用CSS Grid模拟地图背景和标记点。

### 2. JWT动态二维码
- 云函数生成JWT Token（30秒过期）
- 前端定时器每30秒刷新
- 包含随机nonce防重放攻击

### 3. 模拟支付
- 1.5秒延迟模拟支付过程
- 支付成功后自动跳转入场凭证页

### 4. 车牌号验证
- 正则验证：`/^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$/`
- 自动格式化显示（京A·12345）

---

## 六、设计规范

```css
/* 颜色体系 */
--color-primary: #0d9488;        /* Teal-600 */
--color-primary-light: #f0fdfa;  /* Teal-50 */
--color-secondary: #10b981;      /* Emerald-500 */
--color-accent: #f97316;         /* Orange-500 (价格) */
--color-danger: #ef4444;         /* Red-500 */
```

---

## 七、关键文件清单

| 文件 | 说明 |
|-----|------|
| `miniprogram/app.js` | 应用入口，云开发初始化 |
| `miniprogram/app.json` | 页面路由、TabBar配置 |
| `miniprogram/services/parkingService.js` | 车位服务封装 |
| `miniprogram/pages/book/index.js` | 预约流程核心 |
| `miniprogram/pages/entry-pass/index.js` | 二维码刷新逻辑 |
| `cloudfunctions/getQrCode/index.js` | JWT生成 |

---

## 八、验证方式

1. **功能测试**：完成发布→预约→支付→查看凭证全流程
2. **二维码测试**：验证30秒自动刷新机制
3. **车牌验证测试**：测试普通车牌和新能源车牌输入

---

## 九、注意事项

1. 首次运行需在微信开发者工具中开通云开发环境
2. 云函数部署后需在云开发控制台创建数据库集合
3. JWT_SECRET 需配置在云函数环境变量中
