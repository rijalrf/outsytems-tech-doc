import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core import database
from schemas import application_schema, project_schema
from services import project_service

router = APIRouter()


@router.post(
    "/projects",
    response_model=project_schema.ProjectSummaryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Buat Project Baru",
)
def create_project_endpoint(
    project_in: project_schema.ProjectCreate,
    db: Session = Depends(database.get_db),
):
    return project_service.create_project(db=db, project_in=project_in)


@router.get(
    "/projects",
    response_model=List[project_schema.ProjectSummaryResponse],
    summary="List Semua Project",
)
def list_projects_endpoint(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
):
    return project_service.get_all_projects(db=db, skip=skip, limit=limit)


@router.get(
    "/projects/{project_id}",
    response_model=project_schema.ProjectDetailResponse,
    summary="Detail Project beserta Daftar Aplikasinya",
)
def get_project_detail_endpoint(
    project_id: uuid.UUID,
    db: Session = Depends(database.get_db),
):
    project = project_service.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project dengan ID '{project_id}' tidak ditemukan.",
        )
    return project


@router.put(
    "/projects/{project_id}",
    response_model=project_schema.ProjectSummaryResponse,
    summary="Update Informasi Project",
)
def update_project_endpoint(
    project_id: uuid.UUID,
    project_in: project_schema.ProjectUpdate,
    db: Session = Depends(database.get_db),
):
    updated = project_service.update_project(db=db, project_id=project_id, project_in=project_in)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project dengan ID '{project_id}' tidak ditemukan.",
        )
    return updated


@router.delete(
    "/projects/{project_id}",
    summary="Hapus Project",
)
def delete_project_endpoint(
    project_id: uuid.UUID,
    db: Session = Depends(database.get_db),
):
    success = project_service.delete_project(db=db, project_id=project_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project dengan ID '{project_id}' tidak ditemukan.",
        )
    return {"message": f"Project dengan ID '{project_id}' berhasil dihapus."}


@router.post(
    "/projects/{project_id}/applications/{application_id}",
    response_model=application_schema.ApplicationSummaryResponse,
    summary="Hubungkan Aplikasi ke Project",
)
def assign_application_endpoint(
    project_id: uuid.UUID,
    application_id: uuid.UUID,
    db: Session = Depends(database.get_db),
):
    assigned = project_service.assign_application_to_project(
        db=db,
        project_id=project_id,
        application_id=application_id,
    )
    if not assigned:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project ID '{project_id}' atau Application ID '{application_id}' tidak ditemukan.",
        )
    return assigned


@router.get(
    "/projects/{project_id}/applications",
    response_model=List[application_schema.ApplicationSummaryResponse],
    summary="Daftar Aplikasi di Bawah Project Tertentu",
)
def get_project_applications_endpoint(
    project_id: uuid.UUID,
    db: Session = Depends(database.get_db),
):
    project = project_service.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project dengan ID '{project_id}' tidak ditemukan.",
        )
    return project.applications
