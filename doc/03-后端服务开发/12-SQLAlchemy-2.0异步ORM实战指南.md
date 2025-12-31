# SQLAlchemy 2.0异步ORM实战指南

## 前言

SQLAlchemy 2.0引入了原生异步支持，为高性能数据库操作提供了强大工具。本文将详细介绍如何使用SQLAlchemy 2.0构建异步数据访问层。

**适合读者：** 后端开发者、数据库工程师

---

## 一、模型定义

```python
# models/user.py
from sqlalchemy import String, Integer, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Conversation(Base):
    __tablename__ = "conversations"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

---

## 二、CRUD操作

```python
# crud/user.py
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

async def create_user(db: AsyncSession, username: str, email: str, password_hash: str):
    user = User(username=username, email=email, password_hash=password_hash)
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user

async def get_user_by_id(db: AsyncSession, user_id: int):
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(User).offset(skip).limit(limit))
    return result.scalars().all()

async def update_user(db: AsyncSession, user_id: int, **kwargs):
    await db.execute(
        update(User).where(User.id == user_id).values(**kwargs)
    )
    return await get_user_by_id(db, user_id)

async def delete_user(db: AsyncSession, user_id: int):
    await db.execute(delete(User).where(User.id == user_id))
```

---

## 三、关系查询

```python
# 一对多关系
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="user")

class Conversation(Base):
    __tablename__ = "conversations"
    id: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    user: Mapped["User"] = relationship(back_populates="conversations")

# 查询用户及其对话
async def get_user_with_conversations(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(User)
        .options(selectinload(User.conversations))
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()
```

---

## 四、事务管理

```python
async def transfer_conversation(
    db: AsyncSession,
    conversation_id: str,
    from_user_id: int,
    to_user_id: int
):
    async with db.begin():
        # 检查对话是否存在
        conv = await get_conversation(db, conversation_id)
        if not conv or conv.user_id != from_user_id:
            raise ValueError("对话不存在或无权限")
        
        # 更新对话所有者
        conv.user_id = to_user_id
        await db.flush()
```

---

## 五、性能优化

```python
# 批量插入
async def batch_create_messages(db: AsyncSession, messages: list[dict]):
    db.add_all([Message(**msg) for msg in messages])
    await db.flush()

# 预加载关系
from sqlalchemy.orm import selectinload, joinedload

async def get_conversations_with_messages(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.user_id == user_id)
    )
    return result.scalars().all()
```

**下一篇预告：** 《Redis缓存策略：提升API响应速度10倍》
