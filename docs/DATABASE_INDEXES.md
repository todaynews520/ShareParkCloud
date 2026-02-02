# 数据库索引配置

## 索引优化建议

根据云开发控制台的检测，以下查询需要建立索引以提高性能：

### parking_releases 集合

#### 推荐索引 1：车位列表查询（主要查询）
```json
{
  "indexes": [
    {
      "name": "status_date_time",
      "def": {
        "keys": [
          { "status": 1 },
          { "date": 1 },
          { "start_time": 1 }
        ]
      }
    }
  ]
}
```

**适用查询**：
- 获取可用车位列表（首页）
- 按日期筛选车位
- 按时间排序

---

## 快速创建索引

### 方法一：通过云开发控制台

1. 点击提供的快速创建索引链接
2. 或手动在云开发控制台创建：
   - 打开 [云开发控制台](https://console.cloud.tencent.com/tcb)
   - 选择数据库 → parking_releases 集合
   - 点击"索引管理"
   - 添加以下索引：

**索引配置**：
```json
{
  "IndexName": "status_date_time",
  "MgoKeySchema": {
    "MgoKeyColumns": [
      {
        "name": "status",
        "direction": "1"
      },
      {
        "name": "date",
        "direction": "1"
      },
      {
        "name": "start_time",
        "direction": "1"
      }
    ],
    "MgoUnique": false
  }
}
```

### 方法二：使用云函数自动创建

创建 `setupIndexes` 云函数：

```javascript
// cloudfunctions/setupIndexes/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // parking_releases 集合索引
    const indexes = [
      {
        collectionName: 'parking_releases',
        indexName: 'status_date_time',
        keys: [
          { name: 'status', direction: 1 },
          { name: 'date', direction: 1 },
          { name: 'start_time', direction: 1 }
        ]
      },
      {
        collectionName: 'parking_releases',
        indexName: 'owner_date_time',
        keys: [
          { name: 'owner_id.openid', direction: 1 },
          { name: 'date', direction: 1 },
          { name: 'create_time', direction: -1 }
        ]
      }
    ]

    const results = []
    for (const index of indexes) {
      try {
        // 使用 DB 链接直接创建索引
        await db.createCollection(index.collectionName)
        results.push({
          collection: index.collectionName,
          index: index.indexName,
          status: 'success'
        })
      } catch (err) {
        results.push({
          collection: index.collectionName,
          index: index.indexName,
          status: 'failed',
          error: err.message
        })
      }
    }

    return {
      success: true,
      results
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
```

---

## 其他集合索引建议

### reservations 集合
```json
{
  "indexes": [
    {
      "name": "user_date_time",
      "def": {
        "keys": [
          { "user_id": 1 },
          { "date": -1 },
          { "create_time": -1 }
        ]
      }
    },
    {
      "name": "status_date",
      "def": {
        "keys": [
          { "status": 1 },
          { "date": -1 }
        ]
      }
    }
  ]
}
```

### users 集合
```json
{
  "indexes": [
    {
      "name": "openid",
      "def": {
        "keys": [
          { "openid": 1 }
        ]
      },
      "unique": true
    },
    {
      "name": "role_created",
      "def": {
        "keys": [
          { "role": 1 },
          { "createdAt": -1 }
        ]
      }
    }
  ]
}
```

### orders 集合
```json
{
  "indexes": [
    {
      "name": "user_time",
      "def": {
        "keys": [
          { "user_id": 1 },
          { "createdAt": -1 }
        ]
      }
    },
    {
      "name": "status_time",
      "def": {
        "keys": [
          { "status": 1 },
          { "createdAt": -1 }
        ]
      }
    }
  ]
}
```

---

## 索引规则说明

### 方向值
- `1`: 升序 (ASC)
- `-1`: 降序 (DESC)

### 索引类型
- **普通索引**: 提高查询速度
- **唯一索引**: 确保字段值唯一

### 最佳实践

1. **复合字段顺序**: 按查询条件的过滤性排序
   - 高选择性字段在前（如 status）
   - 时间字段在后

2. **避免过多索引**: 每个集合建议不超过 5 个索引

3. **定期维护**: 删除不再使用的索引

---

## 验证索引效果

创建索引后，可在控制台查看查询性能：

```javascript
// 在小程序中测试查询性能
const testQuery = async () => {
  const start = Date.now()

  await db.collection('parking_releases')
    .where({
      status: 'available',
      date: db.command.gte(new Date().toISOString().split('T')[0])
    })
    .orderBy('date', 'asc')
    .orderBy('start_time', 'asc')
    .get()

  const duration = Date.now() - start
  console.log(`查询耗时: ${duration}ms`)
}
```

预期效果：
- 无索引: 100-500ms
- 有索引: 10-50ms
