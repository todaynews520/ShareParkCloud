# 正确的索引配置

## parking_releases 集合索引

### 索引 1：车位列表查询（推荐）
```json
{
  "IndexName": "status_date_startTime",
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

### 索引 2：车主发布查询
```json
{
  "IndexName": "owner_date",
  "MgoKeySchema": {
    "MgoKeyColumns": [
      {
        "name": "owner_id.openid",
        "direction": "1"
      },
      {
        "name": "date",
        "direction": "-1"
      },
      {
        "name": "create_time",
        "direction": "-1"
      }
    ],
    "MgoUnique": false
  }
}
```

## 手动创建步骤

1. 打开 [微信云开发控制台](https://console.cloud.tencent.com/tcb)
2. 选择环境：`cloud1-4gu1xbu13e161c48`
3. 数据库 → 集合 → `parking_releases`
4. 索引管理 → 添加索引
5. 粘贴上述 JSON 配置

## reservations 集合索引

```json
{
  "IndexName": "user_date_time",
  "MgoKeySchema": {
    "MgoKeyColumns": [
      {
        "name": "user_id",
        "direction": "1"
      },
      {
        "name": "date",
        "direction": "-1"
      },
      {
        "name": "create_time",
        "direction": "-1"
      }
    ],
    "MgoUnique": false
  }
}
```
