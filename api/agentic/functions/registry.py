import json
from typing import Any, Callable, Dict, List, Optional
from sqlalchemy.orm import Session

from agentic.functions import (
    application_functions,
    module_functions,
    project_functions,
)

# ---------------------------------------------------------------------------
# DEFINISI OPENAI TOOL CALLING SCHEMAS
# Setiap parameter dijelaskan secara rinci agar LLM dapat memahami kapan dan
# bagaimana cara memanggil fungsi secara akurat.
# ---------------------------------------------------------------------------

OPENAI_TOOLS: List[Dict[str, Any]] = [
    # 1. Project Level Tools
    {
        "type": "function",
        "function": {
            "name": "list_projects",
            "description": "Mengambil daftar seluruh proyek yang ada di sistem, termasuk nama proyek, platform, business unit, project manager, dan jumlah aplikasi di dalamnya. Gunakan fungsi ini jika pengguna menanyakan daftar proyek atau ingin melihat proyek apa saja yang tersedia.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Jumlah maksimal data project yang ingin diambil (default: 20).",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_project_detail",
            "description": "Mengambil informasi detail dan komprehensif tentang satu proyek tertentu berdasarkan ID proyek (UUID), termasuk latar belakang, sasaran, dokumen versi, serta daftar aplikasi (.oap/.oml) yang ada di dalamnya.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "UUID dari project yang ingin diperiksa (contoh: '4ef01824-2c6e-4c7b-914b-577503957f1c').",
                    }
                },
                "required": ["project_id"],
            },
        },
    },

    # 2. Application Level Tools
    {
        "type": "function",
        "function": {
            "name": "list_applications",
            "description": "Mengambil seluruh daftar aplikasi OutSystems (.oap atau .oml) yang telah diunggah dan disimpan ke database, beserta total modul dan status prosesnya. Gunakan jika pengguna bertanya aplikasi apa saja yang sudah di-upload/tersedia.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Batas jumlah aplikasi yang ingin ditampilkan (default: 30).",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_application_detail",
            "description": "Mengambil informasi lengkap satu aplikasi OutSystems beserta daftar modul di dalamnya (nama modul, suffix layer arsitektur seperti CS, WEB, BL, espace_key, dll). Gunakan ini untuk mengetahui modul apa saja yang menyusun suatu aplikasi.",
            "parameters": {
                "type": "object",
                "properties": {
                    "application_id": {
                        "type": "string",
                        "description": "UUID dari aplikasi yang ingin diperiksa.",
                    }
                },
                "required": ["application_id"],
            },
        },
    },

    # 3. Module Level Tools
    {
        "type": "function",
        "function": {
            "name": "get_module_info",
            "description": "Mengambil metadata profil modul OutSystems (Key, Name, Suffix layer arsitektur, UserProviderEspace, UseCookies, WebScreenRenderingMode, ModuleType). Gunakan untuk memahami tipe dan konfigurasi modul.",
            "parameters": {
                "type": "object",
                "properties": {
                    "module_id": {
                        "type": "string",
                        "description": "UUID dari modul yang ingin diperiksa.",
                    }
                },
                "required": ["module_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_module_entities",
            "description": "Mengambil data Entities (tabel database, atribut/kolom, tipe data seperti Text/Integer/Identifier/DateTime, mandatory/opsional, default value, dan Static Records) pada modul tertentu. Sangat penting digunakan ketika pengguna bertanya seputar database schema, tabel, field, kolom, atau entitas.",
            "parameters": {
                "type": "object",
                "properties": {
                    "module_id": {
                        "type": "string",
                        "description": "UUID dari modul yang ingin diperiksa entitasnya.",
                    },
                    "search": {
                        "type": "string",
                        "description": "Kata kunci pencarian spesifik (misal nama entitas seperti 'Booking', nama kolom seperti 'CustomerId', atau tipe data). Jika dikosongkan akan mengembalikan seluruh entitas.",
                    },
                    "is_static": {
                        "type": "boolean",
                        "description": "Filter khusus: Set True jika hanya ingin melihat Static Entities (lookup/enum), False jika hanya ingin melihat Database Entity biasa, atau kosongkan untuk melihat keduanya.",
                    },
                },
                "required": ["module_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_application_entities",
            "description": "Mencari entitas atau atribut di SELURUH modul dalam satu aplikasi sekaligus. Sangat berguna jika pengguna menanyakan keberadaan suatu tabel/data di aplikasi tapi tidak tahu berada di modul mana (misal: 'Di mana tabel Booking disimpan?').",
            "parameters": {
                "type": "object",
                "properties": {
                    "application_id": {
                        "type": "string",
                        "description": "UUID dari aplikasi yang ingin dicari entitasnya.",
                    },
                    "search": {
                        "type": "string",
                        "description": "Kata kunci pencarian nama entitas, atribut kolom, atau deskripsi.",
                    },
                    "is_static": {
                        "type": "boolean",
                        "description": "Filter opsional: True untuk static entity, False untuk database entity reguler.",
                    },
                },
                "required": ["application_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_module_actions",
            "description": "Mengambil daftar Server Actions dan Client Actions pada modul OutSystems, termasuk nama action, deskripsi, parameter input, parameter output, dan alur logika di dalamnya. Gunakan jika pengguna bertanya mengenai fungsi, proses bisnis, action CRUD, atau logic pada modul.",
            "parameters": {
                "type": "object",
                "properties": {
                    "module_id": {
                        "type": "string",
                        "description": "UUID dari modul yang ingin diperiksa actions-nya.",
                    },
                    "search": {
                        "type": "string",
                        "description": "Kata kunci pencarian untuk menyaring action tertentu (misal: 'CreateBooking', 'CalculateTotal').",
                    },
                },
                "required": ["module_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_module_service_actions",
            "description": "Mengambil daftar Service Actions / API Methods (endpoint publik OutSystems untuk komunikasi antar modul service-oriented atau microservices).",
            "parameters": {
                "type": "object",
                "properties": {
                    "module_id": {
                        "type": "string",
                        "description": "UUID dari modul yang ingin diperiksa Service Actions-nya.",
                    },
                    "search": {
                        "type": "string",
                        "description": "Kata kunci pencarian untuk menyaring Service Action tertentu.",
                    },
                },
                "required": ["module_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_module_structures",
            "description": "Mengambil daftar Data Structures / DTOs (Data Transfer Objects) beserta attribute dan tipe datanya yang didefinisikan pada modul.",
            "parameters": {
                "type": "object",
                "properties": {
                    "module_id": {
                        "type": "string",
                        "description": "UUID dari modul yang ingin diperiksa structures-nya.",
                    },
                    "search": {
                        "type": "string",
                        "description": "Kata kunci pencarian nama structure.",
                    },
                },
                "required": ["module_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_module_site_properties",
            "description": "Mengambil daftar Site Properties (variabel lingkungan / konfigurasi runtime) pada modul OutSystems beserta tipe data dan nilai default.",
            "parameters": {
                "type": "object",
                "properties": {
                    "module_id": {
                        "type": "string",
                        "description": "UUID dari modul yang ingin diperiksa Site Properties-nya.",
                    },
                    "search": {
                        "type": "string",
                        "description": "Kata kunci pencarian nama Site Property.",
                    },
                },
                "required": ["module_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_module_system_roles",
            "description": "Mengambil daftar System Roles (hak akses security & roles pengguna) yang didefinisikan pada modul OutSystems.",
            "parameters": {
                "type": "object",
                "properties": {
                    "module_id": {
                        "type": "string",
                        "description": "UUID dari modul yang ingin diperiksa roles-nya.",
                    },
                    "search": {
                        "type": "string",
                        "description": "Kata kunci pencarian nama role.",
                    },
                },
                "required": ["module_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_module_exceptions",
            "description": "Mengambil daftar User Defined Exceptions (custom error handling exceptions) yang terdaftar pada modul.",
            "parameters": {
                "type": "object",
                "properties": {
                    "module_id": {
                        "type": "string",
                        "description": "UUID dari modul yang ingin diperiksa custom exceptions-nya.",
                    },
                    "search": {
                        "type": "string",
                        "description": "Kata kunci pencarian nama exception.",
                    },
                },
                "required": ["module_id"],
            },
        },
    },
]


# ---------------------------------------------------------------------------
# FUNCTION DISPATCHER MAP
# ---------------------------------------------------------------------------

FUNCTION_HANDLERS: Dict[str, Callable[..., Any]] = {
    "list_projects": project_functions.list_projects,
    "get_project_detail": project_functions.get_project_detail,
    "list_applications": application_functions.list_applications,
    "get_application_detail": application_functions.get_application_detail,
    "get_module_info": module_functions.get_module_info,
    "get_module_entities": module_functions.get_module_entities,
    "search_application_entities": module_functions.search_application_entities,
    "get_module_actions": module_functions.get_module_actions,
    "get_module_service_actions": module_functions.get_module_service_actions,
    "get_module_structures": module_functions.get_module_structures,
    "get_module_site_properties": module_functions.get_module_site_properties,
    "get_module_system_roles": module_functions.get_module_system_roles,
    "get_module_exceptions": module_functions.get_module_exceptions,
}


def execute_tool_call(db: Session, tool_name: str, arguments: Dict[str, Any]) -> Any:
    """
    Mengeksekusi pemanggilan tool function berdasarkan nama dan argumen dictionary.
    """
    handler = FUNCTION_HANDLERS.get(tool_name)
    if not handler:
        return {"error": f"Tool function '{tool_name}' tidak terdaftar pada registry sistem."}

    try:
        # Masukkan session database (db) sebagai parameter pertama
        return handler(db=db, **arguments)
    except TypeError as te:
        return {"error": f"Parameter tidak valid untuk tool '{tool_name}': {str(te)}"}
    except Exception as e:
        return {"error": f"Gagal mengeksekusi tool '{tool_name}': {str(e)}"}
