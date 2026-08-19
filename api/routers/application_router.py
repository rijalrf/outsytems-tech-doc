import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core import database
from schemas import application_schema
from services import application_service, module_service

router = APIRouter()


@router.get(
    "/applications",
    response_model=List[application_schema.ApplicationSummaryResponse],
    summary="List Semua Aplikasi (.oap / .oml)",
)
def list_applications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
):
    apps = application_service.get_all_applications(db=db, skip=skip, limit=limit)
    return apps


@router.get(
    "/applications/{application_id}",
    response_model=application_schema.ApplicationDetailResponse,
    summary="Detail Aplikasi beserta Daftar Modulnya",
)
def get_application_detail(
    application_id: uuid.UUID,
    db: Session = Depends(database.get_db),
):
    app = application_service.get_application_by_id(db=db, application_id=application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aplikasi dengan ID '{application_id}' tidak ditemukan.",
        )
    return app


@router.get(
    "/applications/{application_id}/modules",
    response_model=List[application_schema.ModuleSummaryResponse],
    summary="Daftar Modul di Dalam Aplikasi Tertentu",
)
def get_application_modules(
    application_id: uuid.UUID,
    db: Session = Depends(database.get_db),
):
    app = application_service.get_application_by_id(db=db, application_id=application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aplikasi dengan ID '{application_id}' tidak ditemukan.",
        )
    return app.modules


@router.get(
    "/applications/{application_id}/modules/by-suffix/{suffix}",
    response_model=application_schema.ModuleDetailResponse,
    summary="Ambil Modul Berdasarkan Application ID & Suffix (misal: 'CS', 'WEB')",
)
def get_module_by_suffix(
    application_id: uuid.UUID,
    suffix: str,
    db: Session = Depends(database.get_db),
):
    module = module_service.get_module_by_application_and_suffix(
        db=db,
        application_id=application_id,
        suffix=suffix,
    )
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modul dengan suffix '{suffix}' pada aplikasi '{application_id}' tidak ditemukan.",
        )
    return module


@router.get(
    "/modules/{module_id}",
    response_model=application_schema.ModuleDetailResponse,
    summary="Detail Metadata Modul & Seluruh Response Datanya",
)
def get_module_detail(
    module_id: uuid.UUID,
    db: Session = Depends(database.get_db),
):
    module = module_service.get_module_by_id(db=db, module_id=module_id)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modul dengan ID '{module_id}' tidak ditemukan.",
        )
    return module


@router.get(
    "/modules/{module_id}/data",
    response_model=Dict[str, Any],
    summary="Ambil Khusus Response Data JSON dari Modul Tertentu",
)
def get_module_raw_data(
    module_id: uuid.UUID,
    db: Session = Depends(database.get_db),
):
    data = module_service.get_module_response_data(db=db, module_id=module_id)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modul dengan ID '{module_id}' tidak ditemukan.",
        )
    return data


@router.get(
    "/modules/by-key/{espace_key}",
    response_model=application_schema.ModuleDetailResponse,
    summary="Cari Modul & Response Datanya Berdasarkan ESpace Key",
)
def get_module_by_espace_key(
    espace_key: str,
    db: Session = Depends(database.get_db),
):
    module = module_service.get_module_by_espace_key(db=db, espace_key=espace_key)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modul dengan ESpace Key '{espace_key}' tidak ditemukan.",
        )
    return module


@router.get(
    "/modules/{module_id}/project-info",
    response_model=Dict[str, Any],
    summary="Ambil Khusus 'Project Info' / Metadata dari Modul Tertentu",
)
def get_module_project_info_endpoint(
    module_id: uuid.UUID,
    db: Session = Depends(database.get_db),
):
    info = module_service.get_module_project_info(db=db, module_id=module_id)
    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modul dengan ID '{module_id}' tidak ditemukan.",
        )
    return info


@router.get(
    "/modules/{module_id}/actions",
    summary="Ambil Khusus 'Actions' dari Modul Tertentu",
)
def get_module_actions_endpoint(
    module_id: uuid.UUID,
    search: Optional[str] = Query(None, description="Opsional: Filter action berdasarkan kata kunci nama, deskripsi, atau modified by"),
    db: Session = Depends(database.get_db),
):
    actions = module_service.get_module_actions(db=db, module_id=module_id, search=search)
    if actions is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modul atau section 'Actions' untuk ID '{module_id}' tidak ditemukan.",
        )
    return actions


@router.get(
    "/modules/{module_id}/service-api-methods",
    summary="Ambil Khusus 'ServiceAPIMethods' dari Modul Tertentu",
)
def get_module_service_api_methods_endpoint(
    module_id: uuid.UUID,
    search: Optional[str] = Query(None, description="Opsional: Filter service action berdasarkan kata kunci"),
    db: Session = Depends(database.get_db),
):
    methods = module_service.get_module_service_api_methods(db=db, module_id=module_id, search=search)
    if methods is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modul atau section 'ServiceAPIMethods' untuk ID '{module_id}' tidak ditemukan.",
        )
    return methods


@router.get(
    "/applications/{application_id}/entities",
    summary="Cari & Ambil Khusus 'Entities' dari Seluruh Modul di Aplikasi",
    description="Mengambil semua entitas (database entities dan/atau static entities) di seluruh modul dalam satu aplikasi, lengkap dengan filter search dan filter is_static serta in-memory caching.",
)
def get_application_entities_endpoint(
    application_id: uuid.UUID,
    search: Optional[str] = Query(None, description="Opsional: Filter entity berdasarkan nama tabel, atribut kolom, record, atau deskripsi"),
    is_static: Optional[bool] = Query(None, description="Opsional: Filter entity biasa (false) atau static entity (true)"),
    db: Session = Depends(database.get_db),
):
    app = application_service.get_application_by_id(db=db, application_id=application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aplikasi dengan ID '{application_id}' tidak ditemukan.",
        )
    entities = module_service.get_application_entities(
        db=db,
        application_id=application_id,
        search=search,
        is_static=is_static,
    )
    return entities


@router.get(
    "/modules/{module_id}/entities",
    summary="Ambil Khusus 'Entities' dari Modul Tertentu",
)
def get_module_entities_endpoint(
    module_id: uuid.UUID,
    search: Optional[str] = Query(None, description="Opsional: Filter entity berdasarkan nama tabel, atribut kolom, record, atau deskripsi"),
    is_static: Optional[bool] = Query(None, description="Opsional: Filter entity biasa (false) atau static entity (true)"),
    db: Session = Depends(database.get_db),
):
    entities = module_service.get_module_entities(
        db=db,
        module_id=module_id,
        search=search,
        is_static=is_static,
    )
    if entities is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modul atau section 'Entities' untuk ID '{module_id}' tidak ditemukan.",
        )
    return entities


@router.get(
    "/modules/{module_id}/structures",
    summary="Ambil Khusus 'Structures' dari Modul Tertentu",
)
def get_module_structures_endpoint(
    module_id: uuid.UUID,
    search: Optional[str] = Query(None, description="Opsional: Filter structure berdasarkan nama atau atribut"),
    db: Session = Depends(database.get_db),
):
    structures = module_service.get_module_structures(db=db, module_id=module_id, search=search)
    if structures is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modul atau section 'Structures' untuk ID '{module_id}' tidak ditemukan.",
        )
    return structures


@router.get(
    "/modules/{module_id}/site-properties",
    summary="Ambil Khusus 'SiteProperties' dari Modul Tertentu",
)
def get_module_site_properties_endpoint(
    module_id: uuid.UUID,
    search: Optional[str] = Query(None, description="Opsional: Filter site property berdasarkan nama atau deskripsi"),
    db: Session = Depends(database.get_db),
):
    props = module_service.get_module_site_properties(db=db, module_id=module_id, search=search)
    if props is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modul atau section 'SiteProperties' untuk ID '{module_id}' tidak ditemukan.",
        )
    return props


@router.get(
    "/modules/{module_id}/system-roles",
    summary="Ambil Khusus 'SystemRoles' dari Modul Tertentu",
)
def get_module_system_roles_endpoint(
    module_id: uuid.UUID,
    search: Optional[str] = Query(None, description="Opsional: Filter system role berdasarkan nama atau deskripsi"),
    db: Session = Depends(database.get_db),
):
    roles = module_service.get_module_system_roles(db=db, module_id=module_id, search=search)
    if roles is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modul atau section 'SystemRoles' untuk ID '{module_id}' tidak ditemukan.",
        )
    return roles


@router.get(
    "/modules/{module_id}/exceptions",
    summary="Ambil Khusus 'Exceptions' dari Modul Tertentu",
)
def get_module_exceptions_endpoint(
    module_id: uuid.UUID,
    search: Optional[str] = Query(None, description="Opsional: Filter exception berdasarkan nama atau kategori"),
    db: Session = Depends(database.get_db),
):
    exceptions = module_service.get_module_exceptions(db=db, module_id=module_id, search=search)
    if exceptions is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modul atau section 'Exceptions' untuk ID '{module_id}' tidak ditemukan.",
        )
    return exceptions


@router.get(
    "/modules/{module_id}/sections/{section_name}",
    summary="Ambil Data Section Dinamis dari Modul (misal: Actions, Entities, Structures, dll)",
)
def get_module_section_endpoint(
    module_id: uuid.UUID,
    section_name: str,
    db: Session = Depends(database.get_db),
):
    section_data = module_service.get_module_section_data(
        db=db,
        module_id=module_id,
        section_key=section_name,
    )
    if section_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Section '{section_name}' tidak ditemukan pada modul dengan ID '{module_id}'.",
        )
    return section_data
