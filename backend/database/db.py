import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./disaster_coord.db")

# Automatically configure appropriate connect_args for SQLite
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    # Test connection
    with engine.connect() as conn:
        pass
except Exception as e:
    logger.warning(f"Could not connect to {DATABASE_URL}: {e}. Falling back to local SQLite.")
    DATABASE_URL = "sqlite:///./disaster_coord.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def auto_migrate_sqlite(engine_obj):
    """
    Safely adds any missing columns to existing SQLite tables without wiping data.
    """
    if not DATABASE_URL.startswith("sqlite"):
        return

    expected_columns = {
        "incidents": [
            ("casualties_count", "INTEGER DEFAULT 0"),
            ("people_affected", "INTEGER DEFAULT 1"),
            ("voice_transcript", "TEXT"),
            ("backup_team_id", "INTEGER"),
            ("deadline_at", "DATETIME"),
            ("estimated_arrival_at", "DATETIME"),
            ("actual_arrival_at", "DATETIME"),
            ("resolved_at", "DATETIME"),
            ("deadline_status", "VARCHAR(30) DEFAULT 'Pending'"),
            ("deadline_extended_reason", "TEXT"),
            ("backup_requested", "BOOLEAN DEFAULT 0"),
            ("delay_reason", "TEXT"),
            ("delay_category", "VARCHAR(80)"),
            ("delay_reviewed", "BOOLEAN DEFAULT 0"),
            ("media_url", "TEXT"),
            ("media_type", "VARCHAR(20)"),
        ],
        "rescue_teams": [
            ("average_rating", "FLOAT DEFAULT 5.0"),
            ("total_ratings", "INTEGER DEFAULT 0"),
            ("completed_rescues", "INTEGER DEFAULT 0"),
            ("on_time_rescues", "INTEGER DEFAULT 0"),
            ("delayed_rescues", "INTEGER DEFAULT 0"),
            ("is_restricted", "BOOLEAN DEFAULT 0"),
            ("restriction_reason", "VARCHAR(250)"),
        ]
    }

    try:
        with engine_obj.connect() as conn:
            for table_name, cols in expected_columns.items():
                # Check if table exists
                tbl_check = conn.execute(text(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")).fetchone()
                if not tbl_check:
                    continue
                # Get existing columns
                pragma_res = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
                existing_cols = {row[1] for row in pragma_res}
                for col_name, col_def in cols:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_def}"))
                        logger.info(f"Auto-migrated column: {table_name}.{col_name}")
            conn.commit()
    except Exception as e:
        logger.warning(f"Auto-migration check note: {e}")

def init_db():
    from . import models  # noqa
    Base.metadata.create_all(bind=engine)
    auto_migrate_sqlite(engine)
