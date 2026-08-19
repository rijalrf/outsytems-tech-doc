import uuid
from datetime import date, datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import Date, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core import database

if TYPE_CHECKING:
    from models import application_model


class Project(database.Base):
    """
    Tabel untuk menyimpan data Project / Master Informasi Proyek.
    1 Project dapat memiliki banyak Application (.oap / .oml).
    """
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    platform: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    business_unit: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    project_manager: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    technical_leader: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    go_live_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    doc_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="1.0")
    doc_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="Draft")
    background: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    objectives: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relasi 1-to-Many ke tabel applications
    applications: Mapped[List["application_model.Application"]] = relationship(
        "Application",
        back_populates="project",
        cascade="all",
        lazy="selectin",
    )
