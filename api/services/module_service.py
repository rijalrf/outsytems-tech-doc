import io
import json
import shutil
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional

import uuid
from sqlalchemy.orm import Session

from clients import outsystems_client
from core import cache
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

    # Invalidate backend cache karena ada modul baru / update
    cache.memory_cache.clear()

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
    Mengambil khusus response data JSON (parsed_data) dari tabel modules berdasarkan UUID modul
    dengan in-memory caching untuk mempercepat response.
    """
    cache_key = f"module_data:{module_id}"
    cached_data = cache.memory_cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    module = get_module_by_id(db=db, module_id=module_id)
    if module and module.parsed_data:
        cache.memory_cache.set(cache_key, module.parsed_data)
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
    cache_key = f"module_info:{module_id}"
    cached_info = cache.memory_cache.get(cache_key)
    if cached_info is not None:
        return cached_info

    module = get_module_by_id(db=db, module_id=module_id)
    if not module:
        return None

    info = {
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
    cache.memory_cache.set(cache_key, info)
    return info


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


def _filter_dict_or_list_by_search(
    data: Any,
    search: Optional[str],
    wrapper_key: str,
    search_fields: List[str],
) -> Any:
    """
    Helper untuk memfilter item dalam dict OutSystems (seperti {'Entity': [...]}) atau list.
    """
    if not search or not search.strip():
        return data

    query = search.strip().lower()

    # Jika data adalah dictionary yang membungkus list (misal: {'Entity': [...]})
    if isinstance(data, dict):
        target_list = None
        key_found = wrapper_key
        for k, v in data.items():
            if k.lower() == wrapper_key.lower():
                target_list = v
                key_found = k
                break

        if target_list is not None:
            if isinstance(target_list, dict):
                target_list = [target_list]
            if isinstance(target_list, list):
                filtered = []
                for item in target_list:
                    if not isinstance(item, dict):
                        continue
                    # Cek field utama
                    match = any(
                        query in str(item.get(f, "")).lower()
                        for f in search_fields
                        if item.get(f) is not None
                    )
                    # Cek nested attributes jika ada
                    if not match and "Attributes" in item:
                        attrs = item.get("Attributes", {}).get("Attribute", [])
                        if isinstance(attrs, dict):
                            attrs = [attrs]
                        if isinstance(attrs, list):
                            match = any(
                                isinstance(a, dict) and query in str(a.get("Name", "")).lower()
                                for a in attrs
                            )
                    # Cek nested static records jika ada
                    if not match and "StaticRecords" in item:
                        recs = item.get("StaticRecords", {}).get("StaticRecord", [])
                        if isinstance(recs, dict):
                            recs = [recs]
                        if isinstance(recs, list):
                            match = any(
                                isinstance(r, dict) and query in str(r.get("Name", "")).lower()
                                for r in recs
                            )
                    if match:
                        filtered.append(item)
                return {key_found: filtered}
        return data

    # Jika data langsung list
    elif isinstance(data, list):
        filtered = []
        for item in data:
            if isinstance(item, dict):
                match = any(
                    query in str(item.get(f, "")).lower()
                    for f in search_fields
                    if item.get(f) is not None
                )
                if match:
                    filtered.append(item)
        return filtered

    return data


def get_module_actions(
    db: Session,
    module_id: uuid.UUID,
    search: Optional[str] = None,
) -> Optional[Any]:
    """
    Mengambil daftar 'Actions' (Server Actions / Client Actions) dari tabel modules dengan search dan cache.
    """
    cache_key = f"module_actions:{module_id}:{search or ''}"
    cached = cache.memory_cache.get(cache_key)
    if cached is not None:
        return cached

    raw_actions = get_module_section_data(db=db, module_id=module_id, section_key="Actions")
    if raw_actions is None:
        return None

    filtered = _filter_dict_or_list_by_search(
        data=raw_actions,
        search=search,
        wrapper_key="Action",
        search_fields=["Name", "Description", "LastModifiedBy"],
    )
    cache.memory_cache.set(cache_key, filtered)
    return filtered


def get_module_service_api_methods(
    db: Session,
    module_id: uuid.UUID,
    search: Optional[str] = None,
) -> Optional[Any]:
    """
    Mengambil daftar 'ServiceAPIMethods' (Service Actions / API Endpoints) dengan search dan cache.
    """
    cache_key = f"module_service_actions:{module_id}:{search or ''}"
    cached = cache.memory_cache.get(cache_key)
    if cached is not None:
        return cached

    raw_methods = get_module_section_data(db=db, module_id=module_id, section_key="ServiceAPIMethods")
    if raw_methods is None:
        raw_methods = get_module_section_data(db=db, module_id=module_id, section_key="ServiceActions")
    if raw_methods is None:
        return None

    filtered = _filter_dict_or_list_by_search(
        data=raw_methods,
        search=search,
        wrapper_key="ServiceAction",
        search_fields=["Name", "Description", "LastModifiedBy"],
    )
    cache.memory_cache.set(cache_key, filtered)
    return filtered


def filter_entities_data(
    entities_data: Any,
    search: Optional[str] = None,
    is_static: Optional[bool] = None,
) -> Any:
    """
    Memfilter entities (baik list maupun dictionary {'Entity': [...]}) berdasarkan:
    - search: mencocokkan Entity Name, Description, LastModifiedBy, Attribute Name, Attribute DataType, StaticRecord Name, atau StaticRecord values.
    - is_static: jika True hanya return static entity, jika False hanya return database entity biasa.
    """
    if entities_data is None:
        return None

    # Normalisasi ke list entity items
    entity_list = []
    wrapper_key = "Entity"
    is_wrapped_dict = False

    if isinstance(entities_data, dict):
        for k, v in entities_data.items():
            if k.lower() == "entity":
                wrapper_key = k
                is_wrapped_dict = True
                if isinstance(v, list):
                    entity_list = v
                elif isinstance(v, dict):
                    entity_list = [v]
                break
        if not is_wrapped_dict:
            entity_list = [entities_data]
    elif isinstance(entities_data, list):
        entity_list = entities_data
    else:
        return entities_data

    query = search.strip().lower() if search and search.strip() else None

    filtered_list = []
    for item in entity_list:
        if not isinstance(item, dict):
            continue

        # 1. Filter is_static jika diberikan
        item_is_static_raw = item.get("IsStaticEntity") or item.get("isStaticEntity") or item.get("IsStatic")
        item_is_static = item_is_static_raw == "Yes" or item_is_static_raw is True or str(item_is_static_raw).lower() == "true"

        if is_static is not None:
            if is_static and not item_is_static:
                continue
            if not is_static and item_is_static:
                continue

        # 2. Filter search keyword jika diberikan
        if query:
            match = False

            # Cek field entity langsung: Name, Description, LastModifiedBy, Key
            name_val = str(item.get("Name", "")).lower()
            desc_val = str(item.get("Description", "")).lower()
            mod_val = str(item.get("LastModifiedBy", "")).lower()
            key_val = str(item.get("Key", "")).lower()

            if query in name_val or query in desc_val or query in mod_val or query in key_val:
                match = True

            # Cek attributes: Name, DataType, Description
            if not match and "Attributes" in item:
                attrs = item.get("Attributes", {})
                attr_list = []
                if isinstance(attrs, dict):
                    attr_obj = attrs.get("Attribute", [])
                    if isinstance(attr_obj, list):
                        attr_list = attr_obj
                    elif isinstance(attr_obj, dict):
                        attr_list = [attr_obj]
                elif isinstance(attrs, list):
                    attr_list = attrs

                for a in attr_list:
                    if isinstance(a, dict):
                        a_name = str(a.get("Name", "")).lower()
                        a_dtype = str(a.get("DataType", "")).lower()
                        a_desc = str(a.get("Description", "")).lower()
                        if query in a_name or query in a_dtype or query in a_desc:
                            match = True
                            break

            # Cek static records: Name, AttributeValues
            if not match and "StaticRecords" in item:
                recs = item.get("StaticRecords", {})
                rec_list = []
                if isinstance(recs, dict):
                    rec_obj = recs.get("StaticRecord", [])
                    if isinstance(rec_obj, list):
                        rec_list = rec_obj
                    elif isinstance(rec_obj, dict):
                        rec_list = [rec_obj]
                elif isinstance(recs, list):
                    rec_list = recs

                for r in rec_list:
                    if isinstance(r, dict):
                        r_name = str(r.get("Name", "")).lower()
                        if query in r_name:
                            match = True
                            break
                        # Cek attribute values di static record
                        attr_vals = r.get("AttributeValues", {})
                        if isinstance(attr_vals, dict):
                            val_items = attr_vals.get("StaticRecordAttributeValue", [])
                            if isinstance(val_items, dict):
                                val_items = [val_items]
                            if isinstance(val_items, list):
                                for v in val_items:
                                    if isinstance(v, dict) and query in str(v.get("Value", "")).lower():
                                        match = True
                                        break
                        if match:
                            break

            if not match:
                continue

        filtered_list.append(item)

    if is_wrapped_dict:
        return {wrapper_key: filtered_list}
    return filtered_list


def get_module_entities(
    db: Session,
    module_id: uuid.UUID,
    search: Optional[str] = None,
    is_static: Optional[bool] = None,
) -> Optional[Any]:
    """
    Mengambil data 'Entities' (Database Entities, Attributes, Static Records) dengan search, filter is_static, dan cache.
    """
    cache_key = f"module_entities:{module_id}:{search or ''}:{is_static}"
    cached = cache.memory_cache.get(cache_key)
    if cached is not None:
        return cached

    raw_entities = get_module_section_data(db=db, module_id=module_id, section_key="Entities")
    if raw_entities is None:
        return None

    filtered = filter_entities_data(
        entities_data=raw_entities,
        search=search,
        is_static=is_static,
    )
    cache.memory_cache.set(cache_key, filtered)
    return filtered


def get_application_entities(
    db: Session,
    application_id: uuid.UUID,
    search: Optional[str] = None,
    is_static: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    """
    Mengambil dan mencari entities di semua modul dalam satu aplikasi dengan caching.
    """
    cache_key = f"app_entities:{application_id}:{search or ''}:{is_static}"
    cached = cache.memory_cache.get(cache_key)
    if cached is not None:
        return cached

    modules = get_modules_by_application_id(db=db, application_id=application_id)
    result = []

    for mod in modules:
        entities = get_module_entities(
            db=db,
            module_id=mod.id,
            search=search,
            is_static=is_static,
        )
        if entities is not None:
            ent_list = []
            if isinstance(entities, dict):
                for k, v in entities.items():
                    if k.lower() == "entity":
                        ent_list = v if isinstance(v, list) else [v]
                        break
            elif isinstance(entities, list):
                ent_list = entities

            if ent_list:
                result.append({
                    "module_id": str(mod.id),
                    "module_name": mod.name,
                    "suffix": mod.suffix,
                    "total_entities": len(ent_list),
                    "entities": ent_list,
                })

    cache.memory_cache.set(cache_key, result)
    return result


def get_module_structures(
    db: Session,
    module_id: uuid.UUID,
    search: Optional[str] = None,
) -> Optional[Any]:
    """
    Mengambil data 'Structures' (Data Structures & DTOs) dengan search dan cache.
    """
    cache_key = f"module_structures:{module_id}:{search or ''}"
    cached = cache.memory_cache.get(cache_key)
    if cached is not None:
        return cached

    raw_structures = get_module_section_data(db=db, module_id=module_id, section_key="Structures")
    if raw_structures is None:
        return None

    filtered = _filter_dict_or_list_by_search(
        data=raw_structures,
        search=search,
        wrapper_key="Structure",
        search_fields=["Name", "LastModifiedBy", "Description"],
    )
    cache.memory_cache.set(cache_key, filtered)
    return filtered


def get_module_site_properties(
    db: Session,
    module_id: uuid.UUID,
    search: Optional[str] = None,
) -> Optional[Any]:
    """
    Mengambil data 'SiteProperties' (Site Properties / Configurations) dengan search dan cache.
    """
    cache_key = f"module_site_properties:{module_id}:{search or ''}"
    cached = cache.memory_cache.get(cache_key)
    if cached is not None:
        return cached

    raw_props = get_module_section_data(db=db, module_id=module_id, section_key="SiteProperties")
    if raw_props is None:
        return None

    filtered = _filter_dict_or_list_by_search(
        data=raw_props,
        search=search,
        wrapper_key="SiteProperty",
        search_fields=["Name", "Description", "DataType"],
    )
    cache.memory_cache.set(cache_key, filtered)
    return filtered


def get_module_system_roles(
    db: Session,
    module_id: uuid.UUID,
    search: Optional[str] = None,
) -> Optional[Any]:
    """
    Mengambil data 'SystemRoles' (Role dan Permission) dengan search dan cache.
    """
    cache_key = f"module_system_roles:{module_id}:{search or ''}"
    cached = cache.memory_cache.get(cache_key)
    if cached is not None:
        return cached

    raw_roles = get_module_section_data(db=db, module_id=module_id, section_key="SystemRoles")
    if raw_roles is None:
        return None

    filtered = _filter_dict_or_list_by_search(
        data=raw_roles,
        search=search,
        wrapper_key="SystemRole",
        search_fields=["Name", "Description"],
    )
    cache.memory_cache.set(cache_key, filtered)
    return filtered


def get_module_exceptions(
    db: Session,
    module_id: uuid.UUID,
    search: Optional[str] = None,
) -> Optional[Any]:
    """
    Mengambil data 'Exceptions' (User Defined Exceptions) dengan search dan cache.
    """
    cache_key = f"module_exceptions:{module_id}:{search or ''}"
    cached = cache.memory_cache.get(cache_key)
    if cached is not None:
        return cached

    raw_exceptions = get_module_section_data(db=db, module_id=module_id, section_key="Exceptions")
    if raw_exceptions is None:
        return None

    if not search or not search.strip():
        cache.memory_cache.set(cache_key, raw_exceptions)
        return raw_exceptions

    query = search.strip().lower()
    filtered = {}
    if isinstance(raw_exceptions, dict):
        for cat, items in raw_exceptions.items():
            if isinstance(items, dict):
                items = [items]
            if isinstance(items, list):
                matched = [
                    item for item in items
                    if isinstance(item, dict) and (
                        query in str(item.get("Name", "")).lower() or
                        query in cat.lower() or
                        query in str(item.get("LastModifiedBy", "")).lower()
                    )
                ]
                if matched:
                    filtered[cat] = matched
    else:
        filtered = raw_exceptions

    cache.memory_cache.set(cache_key, filtered)
    return filtered



