# Server - 精简框架版
## 特性

- ✅ **FastAPI** - 现代化的异步 Web 框架
- ✅ **SQLAlchemy 2.0** - 异步 ORM
- ✅ **Redis** - 缓存支持
- ✅ **JWT** - 认证系统
- ✅ **Loguru** - 结构化日志
- ✅ **Docker** - 数据库容器化
- ✅ **Alembic** - 数据库迁移

## 数据库迁移

### Model 更新完整流程

当你修改或添加数据库模型（Model）后，需要执行以下两步：

#### 1. 生成迁移文件（检测 model 变化并创建迁移脚本）

```bash
alembic revision --autogenerate -m "描述你的更改"
```

#### 2. 应用迁移到数据库（执行迁移脚本更新数据库）

```bash
alembic upgrade head
```

### 说明

- `alembic revision --autogenerate` - 对比你的 model 定义和当前数据库结构，自动生成迁移文件
- `alembic upgrade head` - 执行已有的迁移文件，将数据库更新到最新版本
- ⚠️ **注意**：只执行 `upgrade head` 不会检测新的 model 变化，必须先生成迁移文件
alembic revision --autogenerate -m "add nickname to user"

### 其他迁移命令

```bash
# 回滚到上一个版本
alembic downgrade -1

# 查看当前版本
alembic current

# 查看迁移历史
alembic history
```

## 注意事项
如果同时设置 reload=True 和 workers > 1，Uvicorn 会忽略 workers 参数，
只启动单个进程。这是因为热重载功能与多进程不兼容。