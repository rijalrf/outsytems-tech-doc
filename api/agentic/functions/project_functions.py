import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from services import project_service


def list_projects(db: Session, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Mengambil daftar seluruh project yang tersimpan di sistem.
    """
    projects = project_service.get_all_projects(db=db, limit=limit)
    return [
        {
            "id": str(p.id),
            "project_name": p.project_name,
            "platform": p.platform,
            "business_unit": p.business_unit,
            "project_manager": p.project_manager,
            "technical_leader": p.technical_leader,
            "start_date": str(p.start_date) if p.start_date else None,
            "go_live_date": str(p.go_live_date) if p.go_live_date else None,
            "doc_version": p.doc_version,
            "doc_status": p.doc_status,
            "background": p.background,
            "total_applications": len(p.applications) if p.applications else 0,
        }
        for p in projects
    ]


def get_project_detail(db: Session, project_id: str) -> Dict[str, Any]:
    """
    Mengambil informasi detail project beserta daftar aplikasi yang tergabung di dalamnya.
    """
    try:
        p_uuid = uuid.UUID(project_id)
    except ValueError:
        return {"error": f"Invalid project_id format: '{project_id}'. Harus berupa UUID valid."}

    project = project_service.get_project_by_id(db=db, project_id=p_uuid)
    if not project:
        return {"error": f"Project dengan ID '{project_id}' tidak ditemukan."}

    return {
        "id": str(project.id),
        "project_name": project.project_name,
        "platform": project.platform,
        "business_unit": project.business_unit,
        "project_manager": project.project_manager,
        "technical_leader": project.technical_leader,
        "start_date": str(project.start_date) if project.start_date else None,
        "go_live_date": str(project.go_live_date) if project.go_live_date else None,
        "background": project.background,
        "objectives": project.objectives,
        "doc_version": project.doc_version,
        "doc_status": project.doc_status,
        "applications": [
            {
                "id": str(app.id),
                "name": app.name,
                "file_type": app.file_type,
                "status": app.status,
                "total_modules": app.total_modules,
            }
            for app in (project.applications or [])
        ],
    }
