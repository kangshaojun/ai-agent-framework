# Redis缓存策略：提升API响应速度10倍

## 前言

合理的缓存策略能显著提升API性能。本文介绍如何使用Redis实现高效的缓存系统。

**适合读者：** 后端开发者、性能优化工程师

---

## 一、Redis配置

```python
# cache.py
import redis.asyncio as redis
import json
from typing import Any, Optional

class RedisCache:
    def __init__(self, url: str = "redis://localhost:6379/0"):
        self.redis = redis.from_url(url, decode_responses=True)
    
    async def get(self, key: str) -> Optional[Any]:
        value = await self.redis.get(key)
        return json.loads(value) if value else None
    
    async def set(self, key: str, value: Any, expire: int = 3600):
        await self.redis.set(key, json.dumps(value), ex=expire)
    
    async def delete(self, key: str):
        await self.redis.delete(key)
    
    async def exists(self, key: str) -> bool:
        return await self.redis.exists(key) > 0

cache = RedisCache()
```

---

## 二、缓存策略

### 2.1 Cache-Aside模式

```python
async def get_user(user_id: int):
    # 1. 尝试从缓存获取
    cache_key = f"user:{user_id}"
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    # 2. 缓存未命中，从数据库查询
    user = await db_get_user(user_id)
    if not user:
        return None
    
    # 3. 写入缓存
    await cache.set(cache_key, user, expire=300)
    return user
```

### 2.2 Write-Through模式

```python
async def update_user(user_id: int, data: dict):
    # 1. 更新数据库
    user = await db_update_user(user_id, data)
    
    # 2. 同时更新缓存
    cache_key = f"user:{user_id}"
    await cache.set(cache_key, user, expire=300)
    
    return user
```

### 2.3 缓存失效策略

```python
async def delete_user(user_id: int):
    # 1. 删除数据库记录
    await db_delete_user(user_id)
    
    # 2. 删除缓存
    await cache.delete(f"user:{user_id}")
    
    # 3. 删除相关缓存
    await cache.delete(f"user:{user_id}:conversations")
```

---

## 三、缓存装饰器

```python
import functools
from typing import Callable

def cached(prefix: str, expire: int = 3600):
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # 生成缓存键
            cache_key = f"{prefix}:{args}:{kwargs}"
            
            # 尝试获取缓存
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 执行函数
            result = await func(*args, **kwargs)
            
            # 存入缓存
            await cache.set(cache_key, result, expire)
            
            return result
        return wrapper
    return decorator

# 使用示例
@cached(prefix="user", expire=300)
async def get_user_profile(user_id: int):
    return await db.get_user(user_id)
```

---

## 四、缓存预热

```python
async def warm_up_cache():
    """预热热门数据"""
    # 获取热门用户
    hot_users = await db.get_hot_users(limit=100)
    
    for user in hot_users:
        cache_key = f"user:{user.id}"
        await cache.set(cache_key, user, expire=3600)
```

---

## 五、缓存穿透防护

```python
async def get_user_safe(user_id: int):
    cache_key = f"user:{user_id}"
    
    # 检查缓存
    cached = await cache.get(cache_key)
    if cached is not None:
        return cached if cached != "NULL" else None
    
    # 查询数据库
    user = await db_get_user(user_id)
    
    if user:
        await cache.set(cache_key, user, expire=300)
    else:
        # 缓存空值，防止穿透
        await cache.set(cache_key, "NULL", expire=60)
    
    return user
```

**下一篇预告：** 《JWT双Token机制实现》
