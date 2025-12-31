# JWT双Token机制：access_token + refresh_token实现

## 前言

双Token机制是现代Web应用的标准认证方案。本文介绍如何在FastAPI中实现安全的JWT双Token认证。

**适合读者：** 后端开发者、安全工程师

---

## 一、Token生成

```python
# auth/jwt.py
from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

def create_access_token(user_id: int, username: str) -> str:
    """生成Access Token（30分钟有效）"""
    expire = datetime.utcnow() + timedelta(minutes=30)
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": expire,
        "type": "access"
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: int) -> str:
    """生成Refresh Token（7天有效）"""
    expire = datetime.utcnow() + timedelta(days=7)
    payload = {
        "user_id": user_id,
        "exp": expire,
        "type": "refresh"
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str, token_type: str = "access") -> dict:
    """验证Token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != token_type:
            raise ValueError("Token类型错误")
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token已过期")
    except jwt.JWTError:
        raise ValueError("Token无效")
```

---

## 二、登录接口

```python
# api/auth.py
from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/login")
async def login(username: str, password: str, db: AsyncSession = Depends(get_db)):
    # 验证用户
    user = await get_user_by_username(db, username)
    if not user or not pwd_context.verify(password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    # 生成Token
    access_token = create_access_token(user.id, user.username)
    refresh_token = create_refresh_token(user.id)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }
```

---

## 三、Token刷新

```python
@router.post("/refresh")
async def refresh_token(refresh_token: str, db: AsyncSession = Depends(get_db)):
    # 验证Refresh Token
    try:
        payload = verify_token(refresh_token, token_type="refresh")
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    
    # 获取用户
    user = await get_user_by_id(db, payload["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
    
    # 生成新的Access Token
    new_access_token = create_access_token(user.id, user.username)
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }
```

---

## 四、认证依赖

```python
# dependencies/auth.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    
    try:
        payload = verify_token(token, token_type="access")
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    
    user = await get_user_by_id(db, payload["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
    
    return user
```

---

## 五、保护路由

```python
@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email
    }

@router.post("/conversations")
async def create_conversation(
    title: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    conversation = await create_conversation_for_user(db, current_user.id, title)
    return conversation
```

**下一篇预告：** 《Alembic数据库迁移：团队协作的最佳实践》
