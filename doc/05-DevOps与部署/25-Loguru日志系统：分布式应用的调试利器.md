# Loguru日志系统：分布式应用的调试利器

## 前言

良好的日志系统是生产环境调试的关键。本文介绍如何使用Loguru构建结构化日志系统。

**适合读者：** 后端开发者、运维工程师

---

## 一、Loguru配置

```python
# logger.py
from loguru import logger
import sys

# 移除默认handler
logger.remove()

# 添加控制台输出
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO"
)

# 添加文件输出
logger.add(
    "logs/app_{time:YYYY-MM-DD}.log",
    rotation="1 day",      # 每天轮转
    retention="30 days",   # 保留30天
    compression="zip",     # 压缩旧日志
    level="DEBUG"
)

# 添加错误日志
logger.add(
    "logs/error_{time:YYYY-MM-DD}.log",
    rotation="1 day",
    retention="90 days",
    level="ERROR"
)
```

---

## 二、日志使用

```python
from logger import logger

# 基础日志
logger.debug("调试信息")
logger.info("普通信息")
logger.warning("警告信息")
logger.error("错误信息")
logger.critical("严重错误")

# 带上下文的日志
logger.bind(user_id=123).info("用户登录")

# 异常日志
try:
    1 / 0
except Exception as e:
    logger.exception("发生异常")
```

---

## 三、请求日志中间件

```python
# middleware/logging.py
from fastapi import Request
import time

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    logger.bind(
        method=request.method,
        path=request.url.path,
        client=request.client.host
    ).info("请求开始")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.bind(
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        process_time=f"{process_time:.3f}s"
    ).info("请求完成")
    
    return response
```

---

## 四、结构化日志

```python
# 使用bind添加上下文
logger.bind(
    user_id=user.id,
    username=user.username,
    action="create_conversation"
).info("创建对话")

# 使用patch临时添加上下文
with logger.contextualize(request_id=request_id):
    logger.info("处理请求")
    # 所有日志都会包含request_id
```

**下一篇预告：** 《生产环境配置：环境变量与安全管理》
