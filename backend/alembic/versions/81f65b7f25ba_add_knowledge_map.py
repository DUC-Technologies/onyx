"""add knowledge map

Revision ID: 81f65b7f25ba
Revises: e58d392624d2
Create Date: 2024-10-07 12:52:27.434928

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '81f65b7f25ba'
down_revision = 'e58d392624d2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('knowledge_map',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('document_set_id', sa.Integer(), nullable=False),
    sa.Column('flowise_pipeline_id', sa.String(), nullable=False),
    sa.Column('description', sa.String(), nullable=False),
    sa.ForeignKeyConstraint(['document_set_id'], ['document_set.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('knowledge_map_answer',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('document_id', sa.String(), nullable=False),
    sa.Column('knowledge_map_id', sa.Integer(), nullable=False),
    sa.Column('topic', sa.String(), nullable=False),
    sa.Column('answer', sa.String(), nullable=False),
    sa.ForeignKeyConstraint(['document_id'], ['document.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['knowledge_map_id'], ['knowledge_map.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('knowledge_map_answer')
    op.drop_table('knowledge_map')
    # ### end Alembic commands ###
