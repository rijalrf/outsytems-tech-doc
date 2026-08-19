import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from schemas import application_schema


class ProjectCreate(BaseModel):
    project_name: str = Field(..., max_length=150, description="Nama lengkap aplikasi atau proyek yang dibangun.")
    platform: Optional[str] = Field(None, max_length=100, description="Teknologi atau framework yang digunakan (misal: OutSystems 11).")
    business_unit: Optional[str] = Field(None, max_length=100, description="Nama klien atau divisi perusahaan.")
    project_manager: Optional[str] = Field(None, max_length=100, description="Nama lengkap Project Manager.")
    technical_leader: Optional[str] = Field(None, max_length=100, description="Nama lengkap Technical Leader.")
    start_date: Optional[date] = Field(None, description="Tanggal mulai proyek (format YYYY-MM-DD).")
    go_live_date: Optional[date] = Field(None, description="Target tanggal rilis/Go-Live (format YYYY-MM-DD).")
    doc_version: Optional[str] = Field("1.0", max_length=20, description="Versi dokumen saat ini (misal: '1.0' atau '1.0.1').")
    doc_status: Optional[str] = Field("Draft", max_length=50, description="Status dokumen (misal: 'Draft', 'In Review', 'Final').")
    background: Optional[str] = Field(None, max_length=2000, description="Latar belakang masalah bisnis dan alasan pembuatan aplikasi.")
    objectives: Optional[str] = Field(None, max_length=2000, description="Tujuan utama aplikasi (bisa berupa poin-poin).")


class ProjectUpdate(BaseModel):
    project_name: Optional[str] = Field(None, max_length=150)
    platform: Optional[str] = Field(None, max_length=100)
    business_unit: Optional[str] = Field(None, max_length=100)
    project_manager: Optional[str] = Field(None, max_length=100)
    technical_leader: Optional[str] = Field(None, max_length=100)
    start_date: Optional[date] = None
    go_live_date: Optional[date] = None
    doc_version: Optional[str] = Field(None, max_length=20)
    doc_status: Optional[str] = Field(None, max_length=50)
    background: Optional[str] = Field(None, max_length=2000)
    objectives: Optional[str] = Field(None, max_length=2000)


class ProjectSummaryResponse(BaseModel):
    id: uuid.UUID
    project_name: str
    platform: Optional[str] = None
    business_unit: Optional[str] = None
    project_manager: Optional[str] = None
    technical_leader: Optional[str] = None
    start_date: Optional[date] = None
    go_live_date: Optional[date] = None
    doc_version: Optional[str] = None
    doc_status: Optional[str] = None
    background: Optional[str] = None
    objectives: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectDetailResponse(ProjectSummaryResponse):
    applications: List[application_schema.ApplicationSummaryResponse] = []
