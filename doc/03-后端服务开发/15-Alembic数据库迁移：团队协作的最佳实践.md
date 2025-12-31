# Alembic数据库迁移：团队协作的最佳实践

## 前言

Alembic是SQLAlchemy的数据库迁移工具，帮助团队管理数据库schema变更。

**适合读者：** 后端开发者、DBA

---

## 一、初始化Alembic

```bash
# 安装Alembic
pip install alembic

# 初始化
alembic init alembic

# 配置数据库连接
# alembic.ini
sqlalchemy.url = postgresql+asyncpg://user:password@localhost/dbname
```

---

## 二、创建迁移

```bash
# 自动生成迁移文件
alembic revision --autogenerate -m "create users table"

# 手动创建迁移文件
alembic revision -m "add email column"
```

---

## 三、迁移文件示例

```python
# alembic/versions/001_create_users_table.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('username', sa.String(50), unique=True, nullable=False),
        sa.Column('email', sa.String(100), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )
    op.create_index('ix_users_username', 'users', ['username'])
    op.create_index('ix_users_email', 'users', ['email'])

def downgrade():
    op.drop_index('ix_users_email')
    op.drop_index('ix_users_username')
    op.drop_table('users')
```

---

## 四、执行迁移

```bash
# 升级到最新版本
alembic upgrade head

# 降级一个版本
alembic downgrade -1

# 查看当前版本
alembic current

# 查看迁移历史
alembic history
```

---

## 五、团队协作最佳实践

```bash
# 1. 拉取最新代码
git pull

# 2. 执行迁移
alembic upgrade head

# 3. 创建新迁移
alembic revision --autogenerate -m "add new feature"

# 4. 检查生成的迁移文件
# 5. 提交代码
git add alembic/versions/*.py
git commit -m "Add database migration for new feature"
git push
```

**下一篇预告：** 《LangChain入门：构建你的第一个RAG应用》
