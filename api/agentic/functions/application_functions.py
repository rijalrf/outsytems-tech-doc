import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from services import application_service, module_service


def list_applications(db: Session, limit: int = 30) -> List[Dict[str, Any]]:
    """
    Mengambil daftar seluruh aplikasi (.oap / .oml) yang ada di database.
    """
    apps = application_service.get_all_applications(db=db, limit=limit)
    result = []
    for app in apps:
        result.append({
            "id": str(app.id),
            "name": app.name,
            "filename": app.filename,
            "file_type": app.file_type,
            "total_modules": app.total_modules,
            "status": app.status,
            "project_id": str(app.project_id) if app.project_id else None,
            "created_at": app.created_at.isoformat() if app.created_at else None,
        })
    return result


def get_application_detail(db: Session, application_id: str) -> Dict[str, Any]:
    """
    Mengambil detail aplikasi beserta seluruh modul di dalamnya (nama modul, suffix layer CS/WEB/BL, espace key, dll).
    """
    try:
        app_uuid = uuid.UUID(application_id)
    except ValueError:
        return {"error": f"Invalid application_id format: '{application_id}'. Harus berupa UUID valid."}

    app = application_service.get_application_by_id(db=db, application_id=app_uuid)
    if not app:
        return {"error": f"Aplikasi dengan ID '{application_id}' tidak ditemukan."}

    modules = module_service.get_modules_by_application_id(db=db, application_id=app_uuid)
    
    return {
        "id": str(app.id),
        "name": app.name,
        "filename": app.filename,
        "file_type": app.file_type,
        "status": app.status,
        "total_modules": len(modules),
        "project_id": str(app.project_id) if app.project_id else None,
        "modules": [
            {
                "id": str(m.id),
                "name": m.name,
                "suffix": m.suffix,
                "module_type": m.module_type,
                "espace_key": m.espace_key,
                "user_provider_espace": m.user_provider_espace,
            }
            for m in modules
        ],
    }
