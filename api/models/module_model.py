import uuid
from datetime import datetime
from typing import Any, Dict, Optional, TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core import database

if TYPE_CHECKING:
    from models import application_model


class Module(database.Base):
    """
    Tabel untuk menyimpan metadata modul dan data response JSON di bawah Aplikasi.
    """
    __tablename__ = "modules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    suffix: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)  # contoh: 'CS', 'WEB', 'BL', 'CW'
    module_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    espace_key: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    user_provider_espace: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    default_transition: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    use_cookies: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    web_screen_rendering_mode: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    module_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Kolom JSONB menampung seluruh isi response API (> 200.000 karakter, kapasitas s/d 1GB)
    parsed_data: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relasi Many-to-1 ke Application
    application: Mapped["Application"] = relationship("Application", back_populates="modules")

    __table_args__ = (
        # GIN Index untuk pencarian cepat di dalam struktur JSONB (Actions, Entities, Structures, dll.)
        Index("idx_modules_parsed_data_gin", "parsed_data", postgresql_using="gin"),
    )
