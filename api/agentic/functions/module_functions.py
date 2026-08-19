import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from services import module_service


def _safe_uuid(id_str: str) -> Optional[uuid.UUID]:
    try:
        return uuid.UUID(id_str)
    except (ValueError, AttributeError):
        return None


def get_module_info(db: Session, module_id: str) -> Dict[str, Any]:
    """
    Mengambil informasi profil & metadata modul (Key, Name, Suffix, UserProviderEspace, DefaultTransition, UseCookies, WebScreenRenderingMode, ModuleType).
    """
    mod_uuid = _safe_uuid(module_id)
    if not mod_uuid:
        return {"error": f"Invalid module_id format: '{module_id}'"}

    info = module_service.get_module_project_info(db=db, module_id=mod_uuid)
    if not info:
        return {"error": f"Modul dengan ID '{module_id}' tidak ditemukan"}
    return info


def get_module_entities(
    db: Session,
    module_id: str,
    search: Optional[str] = None,
    is_static: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    Mengambil data Entities (Database Entities, Attributes/Kolom, Data Types, Static Records) pada modul tertentu.
    Bisa difilter berdasarkan keyword pencarian (search) atau tipe entity (is_static: True untuk static entity, False untuk database entity biasa).
    """
    mod_uuid = _safe_uuid(module_id)
    if not mod_uuid:
        return {"error": f"Invalid module_id format: '{module_id}'"}

    entities = module_service.get_module_entities(
        db=db,
        module_id=mod_uuid,
        search=search,
        is_static=is_static,
    )
    if entities is None:
        return {"message": "Tidak ada data entities ditemukan pada modul ini", "entities": []}
    return {"module_id": module_id, "entities": entities}


def search_application_entities(
    db: Session,
    application_id: str,
    search: Optional[str] = None,
    is_static: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    Mencari seluruh Entity di semua modul dalam satu aplikasi (misal mencari 'Booking', 'Customer', atau atribut 'StatusId').
    """
    app_uuid = _safe_uuid(application_id)
    if not app_uuid:
        return {"error": f"Invalid application_id format: '{application_id}'"}

    app_entities = module_service.get_application_entities(
        db=db,
        application_id=app_uuid,
        search=search,
        is_static=is_static,
    )
    return {
        "application_id": application_id,
        "total_modules_with_entities": len(app_entities),
        "results": app_entities,
    }


def get_module_actions(
    db: Session,
    module_id: str,
    search: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Mengambil daftar Server Actions dan Client Actions pada modul beserta deskripsi, parameter input, parameter output, dan alur logika.
    """
    mod_uuid = _safe_uuid(module_id)
    if not mod_uuid:
        return {"error": f"Invalid module_id format: '{module_id}'"}

    actions = module_service.get_module_actions(db=db, module_id=mod_uuid, search=search)
    if actions is None:
        return {"message": "Tidak ada Actions ditemukan pada modul ini", "actions": []}
    return {"module_id": module_id, "actions": actions}


def get_module_service_actions(
    db: Session,
    module_id: str,
    search: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Mengambil daftar Service Actions / API Methods (endpoint publik yang diekspos modul untuk integrasi antar modul/layanan).
    """
    mod_uuid = _safe_uuid(module_id)
    if not mod_uuid:
        return {"error": f"Invalid module_id format: '{module_id}'"}

    methods = module_service.get_module_service_api_methods(db=db, module_id=mod_uuid, search=search)
    if methods is None:
        return {"message": "Tidak ada Service Actions / API Methods pada modul ini", "service_actions": []}
    return {"module_id": module_id, "service_actions": methods}


def get_module_structures(
    db: Session,
    module_id: str,
    search: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Mengambil daftar Data Structures / DTOs (Data Transfer Objects) beserta attribute dan tipe datanya.
    """
    mod_uuid = _safe_uuid(module_id)
    if not mod_uuid:
        return {"error": f"Invalid module_id format: '{module_id}'"}

    structures = module_service.get_module_structures(db=db, module_id=mod_uuid, search=search)
    if structures is None:
        return {"message": "Tidak ada Structures pada modul ini", "structures": []}
    return {"module_id": module_id, "structures": structures}


def get_module_site_properties(
    db: Session,
    module_id: str,
    search: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Mengambil daftar Site Properties (konfigurasi variabel lingkungan runtime) pada modul.
    """
    mod_uuid = _safe_uuid(module_id)
    if not mod_uuid:
        return {"error": f"Invalid module_id format: '{module_id}'"}

    props = module_service.get_module_site_properties(db=db, module_id=mod_uuid, search=search)
    if props is None:
        return {"message": "Tidak ada Site Properties pada modul ini", "site_properties": []}
    return {"module_id": module_id, "site_properties": props}


def get_module_system_roles(
    db: Session,
    module_id: str,
    search: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Mengambil daftar Security Roles (System Roles / Hak Akses Pengguna) yang didefinisikan pada modul.
    """
    mod_uuid = _safe_uuid(module_id)
    if not mod_uuid:
        return {"error": f"Invalid module_id format: '{module_id}'"}

    roles = module_service.get_module_system_roles(db=db, module_id=mod_uuid, search=search)
    if roles is None:
        return {"message": "Tidak ada System Roles pada modul ini", "system_roles": []}
    return {"module_id": module_id, "system_roles": roles}


def get_module_exceptions(
    db: Session,
    module_id: str,
    search: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Mengambil daftar User Defined Exceptions (kategori exception custom untuk error handling) pada modul.
    """
    mod_uuid = _safe_uuid(module_id)
    if not mod_uuid:
        return {"error": f"Invalid module_id format: '{module_id}'"}

    exceptions = module_service.get_module_exceptions(db=db, module_id=mod_uuid, search=search)
    if exceptions is None:
        return {"message": "Tidak ada Exceptions pada modul ini", "exceptions": []}
    return {"module_id": module_id, "exceptions": exceptions}
