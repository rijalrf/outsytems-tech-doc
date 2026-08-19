import hashlib
import uuid
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session

from models import application_model


def calculate_sha256(content: bytes) -> str:
    """Menghitung SHA-256 hash dari bytes file."""
    return hashlib.sha256(content).hexdigest()


def extract_app_name_from_filename(filename: str) -> str:
    """Mengekstrak nama aplikasi dari nama file (misal BookingHotel_Bayu.oap -> BookingHotel_Bayu)."""
    return Path(filename).stem


def get_all_applications(
    db: Session,
    skip: int = 0,
    limit: int = 100,
) -> List[application_model.Application]:
    """Mengambil seluruh daftar aplikasi (.oap / .oml) dari database."""
    return (
        db.query(application_model.Application)
        .order_by(application_model.Application.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_application_by_id(
    db: Session,
    application_id: uuid.UUID,
) -> Optional[application_model.Application]:
    """Mengambil record aplikasi berdasarkan UUID."""
    return db.query(application_model.Application).filter(application_model.Application.id == application_id).first()
