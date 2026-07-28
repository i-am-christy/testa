"""Add proctoring violations table

Revision ID: a1b2c3d4e5f6
Revises: 3ae79a5d68c0
Create Date: 2026-07-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '3ae79a5d68c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

violation_type_enum = postgresql.ENUM(
    'identity_mismatch',
    'look_away',
    'prohibited_object',
    'multiple_person',
    'voice_activity',
    'tab_switch',
    'window_blur',
    'devtools',
    'copy_paste',
    'unload_attempt',
    name='violationtype',
)


def upgrade() -> None:
    """Upgrade schema."""
    violation_type_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'proctoring_violations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('user_exam_sessions.id'), nullable=False),
        sa.Column('violation_type', violation_type_enum, nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('snapshot_url', sa.String(), nullable=True),
        sa.Column('audio_clip_url', sa.String(), nullable=True),
    )
    op.create_index('ix_proctoring_violations_session_id', 'proctoring_violations', ['session_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_proctoring_violations_session_id', table_name='proctoring_violations')
    op.drop_table('proctoring_violations')
    violation_type_enum.drop(op.get_bind(), checkfirst=True)
