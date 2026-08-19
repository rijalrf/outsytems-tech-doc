import io
import json
import shutil
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional

import uuid
from sqlalchemy.orm import Session

from clients import outsystems_client
from models import application_model, module_model
from services import application_service


def _parse_data_field(data: Any) -> Any:
    """Helper untuk mem-parsing string JSON menjadi dict/list jika diperlukan."""
    if isinstance(data, (bytes, bytearray)):
        try:
            data = data.decode("utf-8")
        except Exception:
            return data

    if isinstance(data, str):
        trimmed = data.strip()
        if (trimmed.startswith("{") and trimmed.endswith("}")) or (trimmed.startswith("[") and trimmed.endswith("]")):
            try:
                parsed = json.loads(trimmed)
                return _parse_data_field(parsed)
            except (json.JSONDecodeError, TypeError):
                return data
        # Cek jika string adalah string yang di-encode JSON (misal JSON string dalam string)
        if trimmed.startswith('"') and trimmed.endswith('"'):
            try:
                parsed = json.loads(trimmed)
                return _parse_data_field(parsed)
            except (json.JSONDecodeError, TypeError):
                return data
    elif isinstance(data, dict):
        return {k: _parse_data_field(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [_parse_data_field(item) for item in data]
    return data


def _find_field_value(data: Any, target_keys: List[str]) -> Optional[Any]:
    """Helper untuk mencari nilai key tertentu baik di root level maupun di nested dict."""
    target_keys_lower = [k.lower() for k in target_keys]
    if isinstance(data, dict):
        for k, v in data.items():
            if k.lower() in target_keys_lower and v is not None and v != "":
                return v
        for v in data.values():
            if isinstance(v, (dict, list)):
                res = _find_field_value(v, target_keys)
                if res is not None:
                    return res
    elif isinstance(data, list):
        for item in data:
            res = _find_field_value(item, target_keys)
            if res is not None:
                return res
    return None


ALLOWED_KEYS = [
    "Key",
    "Name",
    "UserProviderEspace",
    "DefaultTransition",
    "UseCookies",
    "WebScreenRenderingMode",
    "ModuleType",
    "Actions",
    "ServiceAPIMethods",
    "Entities",
    "Structures",
    "SiteProperties",
    "SystemRoles",
    "Exceptions",
]


def extract_module_info(data: Any) -> Dict[str, Any]:
    """
    Mengekstrak informasi metadata modul OML dari data yang sudah di-parse.
    Hanya menyaring key yang diminta:
    - Key, Name, UserProviderEspace, DefaultTransition, UseCookies, WebScreenRenderingMode, ModuleType
    - Actions, ServiceAPIMethods, Entities, Structures, SiteProperties, SystemRoles, Exceptions
    """
    key_val = _find_field_value(data, ["Key", "key", "ESpaceKey", "eSpaceKey", "espace_key"])
    name_val = _find_field_value(data, ["Name", "name", "ModuleName", "module_name", "eSpaceName"])
    user_provider_val = _find_field_value(data, ["UserProviderEspace", "user_provider_espace", "UserProvider", "user_provider"])
    default_trans_val = _find_field_value(data, ["DefaultTransition", "default_transition", "Transition"])
    use_cookies_val = _find_field_value(data, ["UseCookies", "use_cookies", "Cookies"])
    web_rendering_val = _find_field_value(data, ["WebScreenRenderingMode", "web_screen_rendering_mode", "RenderingMode"])
    module_type_val = _find_field_value(data, ["ModuleType", "module_type", "Kind", "kind", "Type"])

    actions_val = _find_field_value(data, ["Actions", "actions"])
    service_api_val = _find_field_value(data, ["ServiceAPIMethods", "service_api_methods", "ServiceActions", "service_actions"])
    entities_val = _find_field_value(data, ["Entities", "entities"])
    structures_val = _find_field_value(data, ["Structures", "structures"])
    site_properties_val = _find_field_value(data, ["SiteProperties", "site_properties"])
    system_roles_val = _find_field_value(data, ["SystemRoles", "system_roles", "Roles", "roles"])
    exceptions_val = _find_field_value(data, ["Exceptions", "exceptions"])

    # Normalisasi boolean use_cookies jika berupa bool
    if isinstance(use_cookies_val, bool):
        use_cookies_str = "Yes" if use_cookies_val else "No"
    elif use_cookies_val is not None:
        use_cookies_str = str(use_cookies_val)
    else:
        use_cookies_str = None

    return {
        "Key": str(key_val) if key_val is not None else None,
        "Name": str(name_val) if name_val is not None else None,
        "UserProviderEspace": str(user_provider_val) if user_provider_val is not None else None,
        "DefaultTransition": str(default_trans_val) if default_trans_val is not None else None,
        "UseCookies": use_cookies_str,
        "WebScreenRenderingMode": str(web_rendering_val) if web_rendering_val is not None else None,
        "ModuleType": str(module_type_val) if module_type_val is not None else None,
        "Actions": actions_val,
        "ServiceAPIMethods": service_api_val,
        "Entities": entities_val,
        "Structures": structures_val,
        "SiteProperties": site_properties_val,
        "SystemRoles": system_roles_val,
        "Exceptions": exceptions_val,
    }


def print_module_info_to_console(info: Dict[str, Any], filename: str = "") -> None:
    """Mencetak informasi modul ke console sesuai format hanya untuk key yang diminta."""
    print("--------------------------------------------------")
    if filename:
        print(f"File\t\n{filename}")

    # 1. Header info dari perintah awal
    header_keys = [
        "Key",
        "Name",
        "UserProviderEspace",
        "DefaultTransition",
        "UseCookies",
        "WebScreenRenderingMode",
        "ModuleType",
    ]
    for k in header_keys:
        val = info.get(k)
        print(f"{k}\t\n{val if val is not None else '-'}")

    # 2. Section keys dari API response
    section_keys = [
        "Actions",
        "ServiceAPIMethods",
        "Entities",
        "Structures",
        "SiteProperties",
        "SystemRoles",
        "Exceptions",
    ]
    for k in section_keys:
        val = info.get(k)
        if val is not None:
            if isinstance(val, (dict, list)):
                formatted_val = json.dumps(val, indent=2)
            else:
                formatted_val = str(val)
            print(f"{k}\t\n{formatted_val}")
        else:
            print(f"{k}\t\n{{}}")
    print("--------------------------------------------------")


def extract_oml_from_bytes(zip_bytes: bytes) -> Dict[str, bytes]:
    """
    Mengekstrak semua file .oml dari file .oap langsung dari memory (bytes).
    Mengembalikan dict: { 'nama_modul.oml': b'file_bytes' }
    """
    extracted_files: Dict[str, bytes] = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as archive:
        for file_info in archive.infolist():
            if file_info.filename.lower().endswith(".oml"):
                filename = Path(file_info.filename).name
                extracted_files[filename] = archive.read(file_info)

    return extracted_files


def extract_oml_from_oap_file(
    file_path: str | Path,
    output_dir: str | Path = "extracted_oml",
) -> List[Path]:
    """
    Mengekstrak file .oml dari file .oap (ZIP) dan menyimpannya ke folder output di disk.
    Mengembalikan list Path file yang berhasil diekstrak.
    """
    input_path = Path(file_path)
    if not input_path.exists():
        raise FileNotFoundError(f"File tidak ditemukan di: {input_path}")

    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    extracted_files: List[Path] = []
    with zipfile.ZipFile(input_path, "r") as archive:
        for file_info in archive.infolist():
            if file_info.filename.lower().endswith(".oml"):
                filename = Path(file_info.filename).name
                destination = out_dir / filename
                with archive.open(file_info) as source, open(destination, "wb") as target:
                    shutil.copyfileobj(source, target)
                extracted_files.append(destination)

    return extracted_files


def process_oml(
    file_bytes: bytes | None = None,
    file_path: str | Path | None = None,
    filename: str = "module.oml",
    client: Optional[outsystems_client.OutsystemsClient] = None,
) -> Dict[str, Any]:
    """
    Mengirim file OML ke Outsystems API via client, mem-parse hasilnya,
    mengekstrak metadata modul yang diminta, dan mencetak format ke console.
    """
    api_client = client or outsystems_client.outsystems_client
    res_json = api_client.send_oml(
        file_bytes=file_bytes,
        file_path=file_path,
        filename=filename,
    )

    # Parse data field jika string JSON
    if isinstance(res_json, dict) and "data" in res_json and res_json["data"] is not None:
        res_json["data"] = _parse_data_field(res_json["data"])
    elif isinstance(res_json, str):
        res_json = _parse_data_field(res_json)

    # Ekstrak metadata modul dan cetak ke console
    module_info = extract_module_info(res_json)
    print_module_info_to_console(module_info, filename=filename)

    # Filter data agar hanya berisi key yang diminta
    filtered_data = {k: module_info.get(k) for k in ALLOWED_KEYS if module_info.get(k) is not None}

    if isinstance(res_json, dict):
        res_json["data"] = filtered_data
        res_json["module_info"] = module_info

    return res_json



# Alias untuk backwards compatibility
send_oml_to_api = process_oml


def extract_module_suffix(module_name: str, app_name: str = "") -> Optional[str]:
    """
    Mengekstrak suffix dari nama modul berdasarkan nama aplikasi / folder.
    Contoh:
    - module_name='BookingHotel_Bayu_CS', app_name='BookingHotel_Bayu' -> 'CS'
    - module_name='BookingHotel_Bayu_WEB', app_name='BookingHotel_Bayu' -> 'WEB'
    """
    clean_mod = Path(module_name).stem
    if app_name and clean_mod.startswith(app_name):
        remaining = clean_mod[len(app_name):]
        if remaining:
            return remaining.lstrip("_")

    if "_" in clean_mod:
        parts = clean_mod.split("_")
        if len(parts) > 1 and parts[-1]:
            return parts[-1]
    return None


def save_parsed_result(
    db: Session,
    filename: str,
    file_bytes: bytes,
    file_type: str,
    module_results: List[Dict[str, Any]],
    app_name: Optional[str] = None,
    project_id: Optional[uuid.UUID] = None,
    status: str = "COMPLETED",
    error_message: Optional[str] = None,
) -> application_model.Application:
    """
    Menyimpan metadata Aplikasi (.oap / .oml) dan seluruh modul (beserta suffix & response JSON) ke database.
    Bisa langsung dihubungkan ke project_id jika diberikan.
    """
    derived_name = app_name or application_service.extract_app_name_from_filename(filename)

    app_record = application_model.Application(
        id=uuid.uuid4(),
        project_id=project_id,
        name=derived_name,
        filename=filename,
        file_type=file_type,
        file_size_bytes=len(file_bytes),
        file_hash=application_service.calculate_sha256(file_bytes),
        total_modules=len(module_results),
        status=status,
        error_message=error_message,
    )
    db.add(app_record)
    db.flush()

    for res in module_results:
        module_name = res.get("filename", filename)
        module_info = res.get("module_info", {}) or {}
        parsed_data = res.get("data", {}) or {}

        if not isinstance(parsed_data, dict):
            parsed_data = {"raw": parsed_data}

        raw_mod_name = module_info.get("Name") or Path(module_name).stem
        mod_suffix = extract_module_suffix(raw_mod_name, derived_name)

        module_record = module_model.Module(
            id=uuid.uuid4(),
            application_id=app_record.id,
            name=raw_mod_name,
            suffix=mod_suffix,
            module_filename=module_name,
            espace_key=module_info.get("Key"),
            user_provider_espace=module_info.get("UserProviderEspace"),
            default_transition=module_info.get("DefaultTransition"),
            use_cookies=module_info.get("UseCookies"),
            web_screen_rendering_mode=module_info.get("WebScreenRenderingMode"),
            module_type=module_info.get("ModuleType"),
            parsed_data=parsed_data,
        )
        db.add(module_record)

    db.commit()
    db.refresh(app_record)
    return app_record


def get_modules_by_application_id(
    db: Session,
    application_id: uuid.UUID,
) -> List[module_model.Module]:
    """Mengambil seluruh daftar modul di bawah aplikasi tertentu."""
    return (
        db.query(module_model.Module)
        .filter(module_model.Module.application_id == application_id)
        .order_by(module_model.Module.created_at.asc())
        .all()
    )


def get_module_by_id(
    db: Session,
    module_id: uuid.UUID,
) -> Optional[module_model.Module]:
    """Mengambil record metadata modul dan respon datanya berdasarkan UUID modul."""
    return db.query(module_model.Module).filter(module_model.Module.id == module_id).first()


def get_module_response_data(
    db: Session,
    module_id: uuid.UUID,
) -> Optional[Dict[str, Any]]:
    """
    Mengambil khusus response data JSON (parsed_data) dari tabel modules berdasarkan UUID modul.
    """
    module = get_module_by_id(db=db, module_id=module_id)
    if module:
        return module.parsed_data
    return None


def get_module_by_espace_key(
    db: Session,
    espace_key: str,
) -> Optional[module_model.Module]:
    """Mengambil record modul dan respon datanya berdasarkan ESpace Key."""
    return db.query(module_model.Module).filter(module_model.Module.espace_key == espace_key).first()


def get_module_by_application_and_suffix(
    db: Session,
    application_id: uuid.UUID,
    suffix: str,
) -> Optional[module_model.Module]:
    """
    Mengambil modul berdasarkan application_id dan suffix (contoh: 'CS', 'WEB', 'BL').
    """
    return (
        db.query(module_model.Module)
        .filter(
            module_model.Module.application_id == application_id,
            module_model.Module.suffix.ilike(suffix),
        )
        .first()
    )


def get_module_project_info(
    db: Session,
    module_id: uuid.UUID,
) -> Optional[Dict[str, Any]]:
    """
    Mengambil 'Project Info' / metadata modul dari tabel modules
    (Key, Name, Suffix, UserProviderEspace, DefaultTransition, UseCookies, WebScreenRenderingMode, ModuleType, dll).
    """
    module = get_module_by_id(db=db, module_id=module_id)
    if not module:
        return None

    return {
        "id": str(module.id),
        "application_id": str(module.application_id),
        "Key": module.espace_key,
        "Name": module.name,
        "Suffix": module.suffix,
        "ModuleFilename": module.module_filename,
        "UserProviderEspace": module.user_provider_espace,
        "DefaultTransition": module.default_transition,
        "UseCookies": module.use_cookies,
        "WebScreenRenderingMode": module.web_screen_rendering_mode,
        "ModuleType": module.module_type,
        "created_at": module.created_at.isoformat() if module.created_at else None,
        "updated_at": module.updated_at.isoformat() if module.updated_at else None,
    }


def get_module_section_data(
    db: Session,
    module_id: uuid.UUID,
    section_key: str,
) -> Optional[Any]:
    """
    Helper untuk mengambil data section tertentu dari kolom 'parsed_data' (JSONB) di tabel modules.
    """
    parsed_data = get_module_response_data(db=db, module_id=module_id)
    if parsed_data is None or not isinstance(parsed_data, dict):
        return None

    # 1. Exact match
    if section_key in parsed_data:
        return parsed_data[section_key]

    # 2. Case-insensitive fallback match
    target_lower = section_key.lower()
    for k, v in parsed_data.items():
        if k.lower() == target_lower:
            return v

    return None


def get_module_actions(
    db: Session,
    module_id: uuid.UUID,
) -> Optional[Any]:
    """
    Mengambil daftar 'Actions' (Server Actions / Client Actions) dari tabel modules.
    """
    return get_module_section_data(db=db, module_id=module_id, section_key="Actions")


def get_module_service_api_methods(
    db: Session,
    module_id: uuid.UUID,
) -> Optional[Any]:
    """
    Mengambil daftar 'ServiceAPIMethods' (Service Actions / API Endpoints) dari tabel modules.
    """
    return get_module_section_data(db=db, module_id=module_id, section_key="ServiceAPIMethods")


def get_module_entities(
    db: Session,
    module_id: uuid.UUID,
) -> Optional[Any]:
    """
    Mengambil data 'Entities' (Database Entities, Attributes, Static Records) dari tabel modules.
    """
    return get_module_section_data(db=db, module_id=module_id, section_key="Entities")


def get_module_structures(
    db: Session,
    module_id: uuid.UUID,
) -> Optional[Any]:
    """
    Mengambil data 'Structures' (Data Structures & DTOs) dari tabel modules.
    """
    return get_module_section_data(db=db, module_id=module_id, section_key="Structures")


def get_module_site_properties(
    db: Session,
    module_id: uuid.UUID,
) -> Optional[Any]:
    """
    Mengambil data 'SiteProperties' (Site Properties / Configurations) dari tabel modules.
    """
    return get_module_section_data(db=db, module_id=module_id, section_key="SiteProperties")


def get_module_system_roles(
    db: Session,
    module_id: uuid.UUID,
) -> Optional[Any]:
    """
    Mengambil data 'SystemRoles' (Role dan Permission) dari tabel modules.
    """
    return get_module_section_data(db=db, module_id=module_id, section_key="SystemRoles")


def get_module_exceptions(
    db: Session,
    module_id: uuid.UUID,
) -> Optional[Any]:
    """
    Mengambil data 'Exceptions' (User Defined Exceptions) dari tabel modules.
    """
    return get_module_section_data(db=db, module_id=module_id, section_key="Exceptions")



