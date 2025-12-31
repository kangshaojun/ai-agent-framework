# FastAPI异步编程：高性能API服务的秘密

## 前言

FastAPI的异步特性是其高性能的核心。本文将深入讲解FastAPI异步编程的原理和实践，帮助你构建高并发的API服务。

**适合读者：** 后端开发者、Python工程师、架构师

---

## 一、同步vs异步

### 1.1 同步阻塞的问题

```python
# ❌ 同步代码 - 阻塞
import time
import requests

def get_user(user_id):
    # 阻塞1秒
    response = requests.get(f"https://api.example.com/users/{user_id}")
    return response.json()

def get_multiple_users():
    users = []
    for i in range(10):
        user = get_user(i)  # 每次阻塞1秒
        users.append(user)
    return users  # 总共需要10秒

# 性能：10个请求 = 10秒
```

### 1.2 异步非阻塞的优势

```python
# ✅ 异步代码 - 非阻塞
import asyncio
import httpx

async def get_user(user_id):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.example.com/users/{user_id}")
        return response.json()

async def get_multiple_users():
    tasks = [get_user(i) for i in range(10)]
    users = await asyncio.gather(*tasks)  # 并发执行
    return users  # 总共需要1秒

# 性能：10个请求 = 1秒（并发）
```

---

## 二、FastAPI异步基础

### 2.1 异步路由

```python
from fastapi import FastAPI
import httpx

app = FastAPI()

# 同步路由
@app.get("/sync/users/{user_id}")
def get_user_sync(user_id: int):
    # 阻塞操作
    response = requests.get(f"https://api.example.com/users/{user_id}")
    return response.json()

# 异步路由
@app.get("/async/users/{user_id}")
async def get_user_async(user_id: int):
    # 非阻塞操作
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.example.com/users/{user_id}")
        return response.json()
```

### 2.2 何时使用异步

```python
# ✅ 应该使用异步的场景
@app.get("/data")
async def get_data():
    # 1. 数据库查询
    result = await db.execute(query)
    
    # 2. HTTP请求
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
    
    # 3. 文件I/O
    async with aiofiles.open('file.txt', 'r') as f:
        content = await f.read()
    
    # 4. 缓存操作
    value = await redis.get(key)
    
    return result

# ❌ 不需要异步的场景
@app.get("/calculate")
def calculate():
    # CPU密集型计算
    result = sum(range(1000000))
    return {"result": result}
```

---

## 三、异步数据库操作

### 3.1 SQLAlchemy异步配置

```python
# database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import declarative_base

DATABASE_URL = "postgresql+asyncpg://user:password@localhost/dbname"

# 创建异步引擎
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    pool_size=20,
    max_overflow=0
)

# 创建异步会话工厂
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

# 依赖注入
async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

### 3.2 异步CRUD操作

```python
# crud/user.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import User
from schemas import UserCreate, UserUpdate

async def create_user(db: AsyncSession, user: UserCreate) -> User:
    """创建用户"""
    db_user = User(**user.dict())
    db.add(db_user)
    await db.flush()
    await db.refresh(db_user)
    return db_user

async def get_user(db: AsyncSession, user_id: int) -> User | None:
    """获取用户"""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()

async def get_users(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100
) -> list[User]:
    """获取用户列表"""
    result = await db.execute(
        select(User).offset(skip).limit(limit)
    )
    return result.scalars().all()

async def update_user(
    db: AsyncSession,
    user_id: int,
    user_update: UserUpdate
) -> User | None:
    """更新用户"""
    db_user = await get_user(db, user_id)
    if not db_user:
        return None
    
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(db_user, field, value)
    
    await db.flush()
    await db.refresh(db_user)
    return db_user

async def delete_user(db: AsyncSession, user_id: int) -> bool:
    """删除用户"""
    db_user = await get_user(db, user_id)
    if not db_user:
        return False
    
    await db.delete(db_user)
    return True
```

### 3.3 API路由实现

```python
# api/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from crud import user as crud_user
from schemas import User, UserCreate, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("", response_model=User)
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建用户"""
    return await crud_user.create_user(db, user)

@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """获取用户"""
    db_user = await crud_user.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return db_user

@router.get("", response_model=list[User])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """获取用户列表"""
    return await crud_user.get_users(db, skip, limit)

@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新用户"""
    db_user = await crud_user.update_user(db, user_id, user_update)
    if not db_user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return db_user

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """删除用户"""
    success = await crud_user.delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="用户不存在")
    return {"msg": "删除成功"}
```

---

## 四、异步HTTP请求

### 4.1 使用httpx

```python
import httpx
from fastapi import APIRouter

router = APIRouter()

@router.get("/proxy/users/{user_id}")
async def proxy_user(user_id: int):
    """代理请求到第三方API"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.example.com/users/{user_id}",
            timeout=10.0
        )
        return response.json()

@router.post("/batch/users")
async def batch_get_users(user_ids: list[int]):
    """批量获取用户（并发）"""
    async with httpx.AsyncClient() as client:
        tasks = [
            client.get(f"https://api.example.com/users/{uid}")
            for uid in user_ids
        ]
        responses = await asyncio.gather(*tasks)
        return [r.json() for r in responses]
```

### 4.2 错误处理

```python
@router.get("/safe/users/{user_id}")
async def safe_proxy_user(user_id: int):
    """带错误处理的代理请求"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.example.com/users/{user_id}",
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="请求超时")
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"上游服务错误: {e}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 五、异步Redis操作

### 5.1 Redis配置

```python
# cache.py
import redis.asyncio as redis
from typing import Optional

class RedisCache:
    def __init__(self, url: str = "redis://localhost:6379/0"):
        self.redis = redis.from_url(url, decode_responses=True)
    
    async def get(self, key: str) -> Optional[str]:
        """获取缓存"""
        return await self.redis.get(key)
    
    async def set(
        self,
        key: str,
        value: str,
        expire: int = 3600
    ) -> bool:
        """设置缓存"""
        return await self.redis.set(key, value, ex=expire)
    
    async def delete(self, key: str) -> bool:
        """删除缓存"""
        return await self.redis.delete(key) > 0
    
    async def exists(self, key: str) -> bool:
        """检查键是否存在"""
        return await self.redis.exists(key) > 0
    
    async def close(self):
        """关闭连接"""
        await self.redis.close()

# 全局实例
cache = RedisCache()
```

### 5.2 缓存装饰器

```python
import json
import functools
from typing import Callable

def cached(expire: int = 3600):
    """缓存装饰器"""
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # 生成缓存键
            cache_key = f"{func.__name__}:{args}:{kwargs}"
            
            # 尝试从缓存获取
            cached_value = await cache.get(cache_key)
            if cached_value:
                return json.loads(cached_value)
            
            # 执行函数
            result = await func(*args, **kwargs)
            
            # 存入缓存
            await cache.set(cache_key, json.dumps(result), expire)
            
            return result
        return wrapper
    return decorator

# 使用示例
@router.get("/cached/users/{user_id}")
@cached(expire=300)  # 缓存5分钟
async def get_cached_user(user_id: int):
    # 这个函数的结果会被缓存
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.example.com/users/{user_id}")
        return response.json()
```

---

## 六、后台任务

### 6.1 BackgroundTasks

```python
from fastapi import BackgroundTasks
import asyncio

async def send_email(email: str, message: str):
    """发送邮件（模拟耗时操作）"""
    await asyncio.sleep(2)  # 模拟发送邮件
    print(f"邮件已发送到 {email}: {message}")

@router.post("/register")
async def register_user(
    user: UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """注册用户并发送欢迎邮件"""
    # 创建用户
    db_user = await crud_user.create_user(db, user)
    
    # 添加后台任务
    background_tasks.add_task(
        send_email,
        user.email,
        "欢迎注册！"
    )
    
    return db_user
```

### 6.2 Celery集成

```python
# tasks.py
from celery import Celery

celery_app = Celery(
    "tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

@celery_app.task
def process_data(data: dict):
    """处理数据（CPU密集型任务）"""
    # 复杂的数据处理
    result = heavy_computation(data)
    return result

# API中使用
@router.post("/process")
async def process_data_endpoint(data: dict):
    """提交数据处理任务"""
    task = process_data.delay(data)
    return {"task_id": task.id}

@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """查询任务状态"""
    task = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": task.status,
        "result": task.result if task.ready() else None
    }
```

---

## 七、并发控制

### 7.1 信号量限流

```python
import asyncio

# 限制并发数
semaphore = asyncio.Semaphore(10)

@router.get("/limited/users/{user_id}")
async def limited_get_user(user_id: int):
    """限制并发的请求"""
    async with semaphore:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.example.com/users/{user_id}"
            )
            return response.json()
```

### 7.2 超时控制

```python
@router.get("/timeout/users/{user_id}")
async def timeout_get_user(user_id: int):
    """带超时控制的请求"""
    try:
        async with asyncio.timeout(5.0):  # 5秒超时
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://api.example.com/users/{user_id}"
                )
                return response.json()
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="请求超时")
```

---

## 八、性能优化

### 8.1 连接池配置

```python
# 数据库连接池
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,        # 连接池大小
    max_overflow=10,     # 最大溢出连接数
    pool_timeout=30,     # 获取连接超时
    pool_recycle=3600,   # 连接回收时间
)

# HTTP客户端连接池
http_client = httpx.AsyncClient(
    limits=httpx.Limits(
        max_connections=100,
        max_keepalive_connections=20
    )
)
```

### 8.2 批量操作

```python
@router.post("/batch/create")
async def batch_create_users(
    users: list[UserCreate],
    db: AsyncSession = Depends(get_db)
):
    """批量创建用户"""
    db_users = [User(**user.dict()) for user in users]
    db.add_all(db_users)
    await db.flush()
    
    for db_user in db_users:
        await db.refresh(db_user)
    
    return db_users
```

---

## 九、错误处理

### 9.1 全局异常处理

```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理"""
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "msg": "服务器内部错误",
            "detail": str(exc)
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP异常处理"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.status_code,
            "msg": exc.detail
        }
    )
```

---

## 十、测试

### 10.1 异步测试

```python
# test_api.py
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_create_user():
    """测试创建用户"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/users",
            json={
                "username": "test",
                "email": "test@example.com",
                "password": "password123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "test"

@pytest.mark.asyncio
async def test_get_user():
    """测试获取用户"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/users/1")
        assert response.status_code == 200
```

---

## 十一、总结

FastAPI异步编程的核心要点：

✅ **异步路由** - 使用async/await  
✅ **异步数据库** - SQLAlchemy异步ORM  
✅ **异步HTTP** - httpx并发请求  
✅ **异步缓存** - Redis异步操作  
✅ **并发控制** - 信号量和超时  

**下一篇预告：** 《SQLAlchemy 2.0异步ORM实战指南》

---

**作者简介：** 资深开发者，创业者。专注于视频通讯技术领域。国内首本Flutter著作《Flutter技术入门与实战》作者,另著有《Dart语言实战》及《WebRTC音视频开发》等书籍。多年从事视频会议、远程教育等技术研发，对于Android、iOS以及跨平台开发技术有比较深入的研究和应用，作为主要程序员开发了多个应用项目，涉及医疗、交通、银行等领域。

**学习资料：**
- [ai-agent-framework](https://www.bilibili.com/cheese/play/ep2187729)
- [作者GitHub](https://github.com/kangshaojun)

**欢迎交流：** 如有问题欢迎在评论区讨论 🚀
