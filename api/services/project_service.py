import uuid
from typing import List, Optional
from sqlalchemy.orm import Session

from models import application_model, project_model
from schemas import project_schema


def create_project(
    db: Session,
    project_in: project_schema.ProjectCreate,
) -> project_model.Project:
    """
    Membuat record Project baru di database.
    """
    project_record = project_model.Project(
        id=uuid.uuid4(),
        project_name=project_in.project_name,
        platform=project_in.platform,
        business_unit=project_in.business_unit,
        project_manager=project_in.project_manager,
        technical_leader=project_in.technical_leader,
        start_date=project_in.start_date,
        go_live_date=project_in.go_live_date,
        doc_version=project_in.doc_version or "1.0",
        doc_status=project_in.doc_status or "Draft",
        background=project_in.background,
        objectives=project_in.objectives,
    )
    db.add(project_record)
    db.commit()
    db.refresh(project_record)
    return project_record


def get_all_projects(
    db: Session,
    skip: int = 0,
    limit: int = 100,
) -> List[project_model.Project]:
    """
    Mengambil semua record Project dari database.
    """
    return (
        db.query(project_model.Project)
        .order_by(project_model.Project.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_project_by_id(
    db: Session,
    project_id: uuid.UUID,
) -> Optional[project_model.Project]:
    """
    Mengambil record Project berdasarkan ID (beserta relasi applications).
    """
    return db.query(project_model.Project).filter(project_model.Project.id == project_id).first()


def update_project(
    db: Session,
    project_id: uuid.UUID,
    project_in: project_schema.ProjectUpdate,
) -> Optional[project_model.Project]:
    """
    Memperbarui informasi record Project.
    """
    project = get_project_by_id(db=db, project_id=project_id)
    if not project:
        return None

    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project


def delete_project(
    db: Session,
    project_id: uuid.UUID,
) -> bool:
    """
    Menghapus record Project dari database.
    """
    project = get_project_by_id(db=db, project_id=project_id)
    if not project:
        return False

    db.delete(project)
    db.commit()
    return True


def assign_application_to_project(
    db: Session,
    project_id: uuid.UUID,
    application_id: uuid.UUID,
) -> Optional[application_model.Application]:
    """
    Menghubungkan Aplikasi (.oap / .oml) ke Project tertentu.
    """
    project = get_project_by_id(db=db, project_id=project_id)
    if not project:
        return None

    app_record = db.query(application_model.Application).filter(application_model.Application.id == application_id).first()
    if not app_record:
        return None

    app_record.project_id = project.id
    db.commit()
    db.refresh(app_record)
    return app_record


def get_applications_by_project_id(
    db: Session,
    project_id: uuid.UUID,
) -> List[application_model.Application]:
    """
    Mengambil semua Aplikasi yang terhubung ke Project tertentu.
    """
    return (
        db.query(application_model.Application)
        .filter(application_model.Application.project_id == project_id)
        .order_by(application_model.Application.created_at.desc())
        .all()
    )
