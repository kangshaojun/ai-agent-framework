"""Initial migration

Revision ID: initial_001
Revises: 
Create Date: 2024-11-06

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'initial_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Initial migration."""
    pass


def downgrade() -> None:
    """Downgrade migration."""
    pass
