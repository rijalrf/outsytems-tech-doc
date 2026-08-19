import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ModuleSummaryResponse(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    name: Optional[str] = None
    suffix: Optional[str] = None  # contoh: 'CS', 'WEB', 'BL', 'CW'
    module_filename: str
    espace_key: Optional[str] = None
    user_provider_espace: Optional[str] = None
    default_transition: Optional[str] = None
    use_cookies: Optional[str] = None
    web_screen_rendering_mode: Optional[str] = None
    module_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ModuleDetailResponse(ModuleSummaryResponse):
    parsed_data: Dict[str, Any]


class ApplicationSummaryResponse(BaseModel):
    id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    name: str
    filename: str
    file_type: str
    file_size_bytes: int
    file_hash: Optional[str] = None
    total_modules: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplicationDetailResponse(ApplicationSummaryResponse):
    modules: List[ModuleSummaryResponse] = []
