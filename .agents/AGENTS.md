# Aturan dan Standar Pengembangan Proyek (Project Rules & Guidelines)

Dokumen ini berisi seluruh aturan arsitektur, konvensi penamaan, struktur folder, dan pola penulisan kode (*code conventions*) yang wajib dipatuhi oleh setiap AI Agent / Pengembang dalam proyek ini.

---

## 1. Konvensi Penamaan File (*File Suffix Conventions*)
Setiap file Python di dalam subfolder `api/` wajib menggunakan akhiran (*suffix*) sesuai dengan perannya:

| Folder | Suffix Wajib | Contoh File |
| :--- | :--- | :--- |
| `api/routers/` | `*_router.py` | `application_router.py`, `module_router.py` |
| `api/models/` | `*_model.py` | `application_model.py`, `module_model.py` |
| `api/schemas/` | `*_schema.py` | `application_schema.py`, `module_schema.py` |
| `api/services/` | `*_service.py` | `application_service.py`, `module_service.py` |
| `api/clients/` | `*_client.py` | `outsystems_client.py` |

> **Catatan Penamaan Modul OML**:
> Gunakan prefiks/nama `module_*` untuk entitas parsing modul OutSystems (misal: `module_router.py`, `module_schema.py`, `module_service.py`, `module_model.py`).

---

## 2. Struktur Folder & Core API
File konfigurasi dan inisialisasi database **dilarang berada di root folder `api/`**.
Semua konfigurasi sistem, database, dan utilitas inti diletakkan di bawah folder `api/core/`:
- `api/core/config.py` — Pengaturan environment (`Settings`, `settings`, `.env`).
- `api/core/database.py` — Koneksi database SQLAlchemy (`Base`, `engine`, `SessionLocal`, `get_db`).

Struktur `api/`:
```
api/
├── clients/
│   ├── __init__.py
│   └── outsystems_client.py
├── core/
│   ├── __init__.py
│   ├── config.py
│   └── database.py
├── models/
│   ├── __init__.py
│   ├── application_model.py
│   ├── module_model.py
│   └── project_model.py
├── routers/
│   ├── __init__.py
│   ├── application_router.py
│   ├── module_router.py
│   └── project_router.py
├── schemas/
│   ├── __init__.py
│   ├── application_schema.py
│   ├── module_schema.py
│   └── project_schema.py
├── services/
│   ├── __init__.py
│   ├── application_service.py
│   ├── module_service.py
│   └── project_service.py
├── .env
├── main.py
└── requirements.txt
```

---

## 3. Aturan File `__init__.py`
- Semua file `__init__.py` di seluruh package/folder **dilarang menggunakan `__all__`** dan **dilarang melakukan re-export class/fungsi**.
- `__init__.py` hanya berfungsi murni sebagai *package marker*.

---

## 4. Aturan Import & Module Namespacing (*Qualified Access*)
Saat mengimpor antar-modul di dalam proyek, **wajib mengimpor modulnya langsung dari package** dan memanggil method/class dengan menyertakan nama modul sebagai *namespace*:

### Contoh yang BENAR:
```python
# Import modul dari package
from core import config, database
from models import application_model, module_model
from schemas import application_schema, module_schema
from services import application_service, module_service
from routers import application_router, module_router
from clients import outsystems_client

# Pemanggilan di dalam kode
db = database.SessionLocal()
app = application_service.get_application_by_id(...)
result = module_service.process_oml(...)
saved_app = module_service.save_parsed_result(...)
app_model = db.query(application_model.Application).first()
response = module_schema.BatchProcessResponse(...)
app_host = config.settings.app_host
app.include_router(module_router.router)
```

### Contoh yang DILARANG:
```python
# JANGAN import langsung fungsi/class dari sub-modul:
from core.database import get_db          # ❌ DILARANG
from services.module_service import save_parsed_result # ❌ DILARANG
from models.application_model import Application   # ❌ DILARANG
from schemas.module_schema import BatchProcessResponse # ❌ DILARANG
```
