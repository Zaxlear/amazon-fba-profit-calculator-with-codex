from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from sqlalchemy import ForeignKey, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


def get_database_path() -> str:
    env_path = os.getenv("DATABASE_PATH")
    if env_path:
        return env_path
    return str(Path(__file__).resolve().parent.parent / "fba_calculator.db")


def _create_engine():
    db_path = get_database_path()
    return create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )


engine = _create_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    parent_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("projects.id"), nullable=True
    )
    branch_path: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    input_json: Mapped[str] = mapped_column(Text, nullable=False)
    result_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[str] = mapped_column(String, nullable=False)


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)


def init_db() -> None:
    db_path = Path(get_database_path())
    db_path.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
