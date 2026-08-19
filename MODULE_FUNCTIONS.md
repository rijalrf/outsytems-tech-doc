# Dokumentasi Fungsi Modul (`module_service.py`)

Dokumen ini berisi daftar lengkap fungsi yang tersedia pada modul [`api/services/module_service.py`](file:///c:/Users/Jerry/Documents/CODING/out-gen/api/services/module_service.py), lengkap dengan deskripsi fungsional, parameter input, dan return value (output).

---

## 📑 Daftar Isi
1. [Ringkasan Fungsi](#-ringkasan-fungsi)
2. [Ekstraksi File & Arsip](#1-ekstraksi-file--arsip)
   - [`extract_oml_from_bytes`](#extract_oml_from_bytes)
   - [`extract_oml_from_oap_file`](#extract_oml_from_oap_file)
3. [Pemrosesan & Parsing OML](#2-pemrosesan--parsing-oml)
   - [`process_oml` (alias `send_oml_to_api`)](#process_oml--send_oml_to_api)
   - [`extract_module_info`](#extract_module_info)
   - [`extract_module_suffix`](#extract_module_suffix)
   - [`print_module_info_to_console`](#print_module_info_to_console)
4. [Operasi Database & Penyimpanan](#3-operasi-database--penyimpanan)
   - [`save_parsed_result`](#save_parsed_result)
   - [`get_modules_by_application_id`](#get_modules_by_application_id)
   - [`get_module_by_id`](#get_module_by_id)
   - [`get_module_by_espace_key`](#get_module_by_espace_key)
   - [`get_module_by_application_and_suffix`](#get_module_by_application_and_suffix)
5. [Pengambilan Metadata & Section Modul](#4-pengambilan-metadata--section-modul)
   - [`get_module_response_data`](#get_module_response_data)
   - [`get_module_project_info`](#get_module_project_info)
   - [`get_module_section_data`](#get_module_section_data)
   - [`get_module_actions`](#get_module_actions)
   - [`get_module_service_api_methods`](#get_module_service_api_methods)
   - [`get_module_structures`](#get_module_structures)
   - [`get_module_site_properties`](#get_module_site_properties)
   - [`get_module_system_roles`](#get_module_system_roles)
   - [`get_module_exceptions`](#get_module_exceptions)
6. [Pengolahan & Pencarian Entity](#5-pengolahan--pencarian-entity)
   - [`filter_entities_data`](#filter_entities_data)
   - [`get_module_entities`](#get_module_entities)
   - [`get_application_entities`](#get_application_entities)
7. [Helper Internal](#6-helper-internal)
   - [`_parse_data_field`](#_parse_data_field)
   - [`_find_field_value`](#_find_field_value)
   - [`_filter_dict_or_list_by_search`](#_filter_dict_or_list_by_search)

---

## 📊 Ringkasan Fungsi

| Nama Fungsi | Kategori | Deskripsi Singkat |
| :--- | :--- | :--- |
| [`extract_oml_from_bytes`](#extract_oml_from_bytes) | Ekstraksi | Mengekstrak file `.oml` dari bytes file `.oap` di memory. |
| [`extract_oml_from_oap_file`](#extract_oml_from_oap_file) | Ekstraksi | Mengekstrak file `.oml` dari file `.oap` fisik ke direktori disk. |
| [`process_oml`](#process_oml--send_oml_to_api) | Parsing | Mengirim file OML ke client parser eksternal dan memformat respons. |
| [`extract_module_info`](#extract_module_info) | Parsing | Menyaring metadata utama modul dari hasil parsing OML. |
| [`extract_module_suffix`](#extract_module_suffix) | Parsing | Mendeteksi arsitektur/tipe layer modul (CS, WEB, BL, dll) dari nama file/modul. |
| [`print_module_info_to_console`](#print_module_info_to_console) | Utility | Menampilkan ringkasan metadata modul ke terminal. |
| [`save_parsed_result`](#save_parsed_result) | Database | Menyimpan data aplikasi dan seluruh modul hasil parse ke database PostgreSQL. |
| [`get_modules_by_application_id`](#get_modules_by_application_id) | Database Query | Mengambil seluruh record modul milik suatu aplikasi. |
| [`get_module_by_id`](#get_module_by_id) | Database Query | Mengambil record modul berdasarkan ID (UUID). |
| [`get_module_by_espace_key`](#get_module_by_espace_key) | Database Query | Mengambil record modul berdasarkan OutSystems eSpace Key. |
| [`get_module_by_application_and_suffix`](#get_module_by_application_and_suffix) | Database Query | Mengambil modul spesifik berdasarkan App ID dan layer suffix (mis. 'CS'). |
| [`get_module_response_data`](#get_module_response_data) | Data Query | Mengambil seluruh JSON `parsed_data` modul (didukung in-memory cache). |
| [`get_module_project_info`](#get_module_project_info) | Data Query | Mengambil metadata info modul (Name, Key, Suffix, Cookies, dll) dengan cache. |
| [`get_module_section_data`](#get_module_section_data) | Data Query | Helper ekstraksi section tertentu (mis. Entities, Actions) dari JSON modul. |
| [`get_module_actions`](#get_module_actions) | Data Query | Mengambil data Server/Client Actions modul dengan filter pencarian & cache. |
| [`get_module_service_api_methods`](#get_module_service_api_methods) | Data Query | Mengambil Service Actions / API Methods modul dengan filter pencarian & cache. |
| [`get_module_structures`](#get_module_structures) | Data Query | Mengambil Data Structures & DTOs modul dengan filter pencarian & cache. |
| [`get_module_site_properties`](#get_module_site_properties) | Data Query | Mengambil konfigurasi Site Properties modul dengan filter pencarian & cache. |
| [`get_module_system_roles`](#get_module_system_roles) | Data Query | Mengambil Security System Roles modul dengan filter pencarian & cache. |
| [`get_module_exceptions`](#get_module_exceptions) | Data Query | Mengambil User Defined Exceptions modul dengan filter pencarian & cache. |
| [`filter_entities_data`](#filter_entities_data) | Entity Engine | Memfilter data entitas berdasarkan keyword pencarian dan tipe entitas (Static vs Regular). |
| [`get_module_entities`](#get_module_entities) | Entity Engine | Mengambil daftar Entities pada satu modul spesifik dengan filter & cache. |
| [`get_application_entities`](#get_application_entities) | Entity Engine | Mengambil dan mengagregasi seluruh Entities dari semua modul dalam 1 aplikasi. |
| [`_parse_data_field`](#_parse_data_field) | Helper | Rekursif parser untuk menangani nested string JSON / bytes. |
| [`_find_field_value`](#_find_field_value) | Helper | Pencari nilai key secara rekursif dalam dictionary/list bertingkat. |
| [`_filter_dict_or_list_by_search`](#_filter_dict_or_list_by_search) | Helper | Helper generik penyaring struktur data OutSystems list/dict berdasarkan query. |

---

## 1. Ekstraksi File & Arsip

### `extract_oml_from_bytes`
Mengekstrak file `.oml` dari arsip `.oap` (format ZIP) langsung dari memory tanpa menulis file ke disk terlebih dahulu.

- **Input Parameters:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `zip_bytes` | `bytes` | Ya | Data byte mentah dari file `.oap`. |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Dict[str, bytes]` | Dictionary dengan key berupa nama file (`nama_modul.oml`) dan value berupa data binary `bytes` dari file tersebut. |

---

### `extract_oml_from_oap_file`
Mengekstrak seluruh file `.oml` dari file `.oap` fisik di disk dan menyimpannya ke folder output tujuan.

- **Input Parameters:**
  | Parameter | Tipe | Default | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `file_path` | `str \| Path` | - | Path lokasi file `.oap` berada. |
  | `output_dir` | `str \| Path` | `"extracted_oml"` | Folder tujuan untuk menyimpan file `.oml` yang diekstrak. |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `List[Path]` | List objek `Path` yang merepresentasikan file-file `.oml` yang berhasil ditulis ke disk. |

---

## 2. Pemrosesan & Parsing OML

### `process_oml` / `send_oml_to_api`
Mengirim binary atau path file `.oml` ke service parser OutSystems, mem-parsing struktur JSON, menyaring metadata yang diizinkan (`ALLOWED_KEYS`), dan mencetak log ke console.

- **Input Parameters:**
  | Parameter | Tipe | Default | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `file_bytes` | `bytes \| None` | `None` | Byte data file OML jika dikirim via memory. |
  | `file_path` | `str \| Path \| None` | `None` | Path file OML jika dikirim dari disk. |
  | `filename` | `str` | `"module.oml"` | Nama file modul untuk logging dan identifikasi. |
  | `client` | `Optional[OutsystemsClient]` | `None` | Instance custom HTTP client (default: singleton client). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Dict[str, Any]` | Dictionary hasil parsing yang berisi status respons, `module_info`, dan `data` JSON yang sudah difilter. |

---

### `extract_module_info`
Mengekstrak informasi metadata penting dari raw response parser OutSystems (seperti Key, Name, UserProviderEspace, ModuleType, Actions, Entities, dll).

- **Input Parameters:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `data` | `Any` | Ya | Objek data hasil parse OML (dict/list/string). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Dict[str, Any]` | Dictionary berisi key terstandarisasi (`Key`, `Name`, `UserProviderEspace`, `DefaultTransition`, `UseCookies`, `WebScreenRenderingMode`, `ModuleType`, `Actions`, `ServiceAPIMethods`, `Entities`, `Structures`, `SiteProperties`, `SystemRoles`, `Exceptions`). |

---

### `extract_module_suffix`
Mendeteksi layer atau suffix arsitektur OutSystems (misal: `CS`, `WEB`, `CW`, `BL`, `API`, `TH`) dari nama modul.

- **Input Parameters:**
  | Parameter | Tipe | Default | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `module_name` | `str` | - | Nama modul (misal: `BookingHotel_CS`). |
  | `app_name` | `str` | `""` | Nama aplikasi induk sebagai prefix pembanding. |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[str]` | String suffix modul (misal: `"CS"`, `"WEB"`), atau `None` jika tidak ditemukan pola suffix. |

---

### `print_module_info_to_console`
Mencetak informasi metadata modul dan struktur section ke console dengan format tabulasi yang rapi.

- **Input Parameters:**
  | Parameter | Tipe | Default | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `info` | `Dict[str, Any]` | - | Dictionary metadata modul (hasil dari `extract_module_info`). |
  | `filename` | `str` | `""` | Nama file modul untuk ditampilkan pada header log. |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `None` | Fungsi hanya melakukan logging ke standard output (console). |

---

## 3. Operasi Database & Penyimpanan

### `save_parsed_result`
Menyimpan data aplikasi (beserta hash file, ukuran, status) dan setiap modul yang ada di dalamnya ke database PostgreSQL, serta membersihkan cache in-memory.

- **Input Parameters:**
  | Parameter | Tipe | Default | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | - | Session database SQLAlchemy. |
  | `filename` | `str` | - | Nama file arsip/modul yang di-upload. |
  | `file_bytes` | `bytes` | - | Isi binary file untuk kalkulasi hash SHA-256 dan ukuran file. |
  | `file_type` | `str` | - | Tipe file (`"oap"` atau `"oml"`). |
  | `module_results` | `List[Dict[str, Any]]` | - | List hasil parse tiap modul yang akan disimpan ke tabel `modules`. |
  | `app_name` | `Optional[str]` | `None` | Nama aplikasi kustom (opsional, jika tidak ada diinferensi dari filename). |
  | `project_id` | `Optional[uuid.UUID]` | `None` | ID project untuk mengelompokkan aplikasi. |
  | `status` | `str` | `"COMPLETED"` | Status proses aplikasi (`"COMPLETED"`, `"FAILED"`, dll). |
  | `error_message` | `Optional[str]` | `None` | Pesan error jika proses parsing mengalami kegagalan. |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `application_model.Application` | Record model ORM `Application` yang telah tersimpan di database. |

---

### `get_modules_by_application_id`
Mengambil semua data record modul yang berelasi dengan suatu `application_id`.

- **Input Parameters:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | Ya | Session database SQLAlchemy. |
  | `application_id` | `uuid.UUID` | Ya | ID unik dari aplikasi. |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `List[module_model.Module]` | List objek ORM `Module` yang diurutkan berdasarkan tanggal dibuat (`created_at`). |

---

### `get_module_by_id`
Mencari dan mengembalikan record modul berdasarkan UUID primary key-nya.

- **Input Parameters:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | Ya | Session database SQLAlchemy. |
  | `module_id` | `uuid.UUID` | Ya | ID unik dari modul. |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[module_model.Module]` | Objek ORM `Module` jika ditemukan, atau `None`. |

---

### `get_module_by_espace_key`
Mencari record modul berdasarkan string OutSystems eSpace Key (misal: `"38f38b16-..."`).

- **Input Parameters:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | Ya | Session database SQLAlchemy. |
  | `espace_key` | `str` | Ya | OutSystems eSpace Key. |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[module_model.Module]` | Objek ORM `Module` jika ditemukan, atau `None`. |

---

### `get_module_by_application_and_suffix`
Mengambil modul spesifik dalam suatu aplikasi berdasarkan suffix layer-nya (case-insensitive, misal: `"CS"`).

- **Input Parameters:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | Ya | Session database SQLAlchemy. |
  | `application_id` | `uuid.UUID` | Ya | ID aplikasi induk. |
  | `suffix` | `str` | Ya | Suffix layer modul (contoh: `"CS"`, `"WEB"`). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[module_model.Module]` | Objek ORM `Module` pertama yang cocok, atau `None`. |

---

## 4. Pengambilan Metadata & Section Modul

### `get_module_response_data`
Mengambil payload utuh JSON `parsed_data` dari sebuah modul dengan memanfaatkan sistem in-memory caching.

- **Input Parameters:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | Ya | Session database SQLAlchemy. |
  | `module_id` | `uuid.UUID` | Ya | ID unik modul. |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[Dict[str, Any]]` | Dictionary JSON `parsed_data`, atau `None` jika modul tidak ditemukan / data kosong. |

---

### `get_module_project_info`
Mengambil ringkasan Project Info modul (Key, Name, Suffix, UserProviderEspace, DefaultTransition, UseCookies, RenderingMode, ModuleType, timestamp) dengan caching.

- **Input Parameters:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | Ya | Session database SQLAlchemy. |
  | `module_id` | `uuid.UUID` | Ya | ID unik modul. |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[Dict[str, Any]]` | Dictionary berisi ringkasan info modul terformat, atau `None`. |

---

### `get_module_section_data`
Helper internal untuk mengekstrak key section tertentu dari JSON `parsed_data` modul (misal: `"Actions"`, `"Entities"`, `"Structures"`), dengan dukungan pencocokan case-insensitive.

- **Input Parameters:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | Ya | Session database SQLAlchemy. |
  | `module_id` | `uuid.UUID` | Ya | ID unik modul. |
  | `section_key` | `str` | Ya | Nama section yang dicari (misal: `"Actions"`, `"Entities"`). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[Any]` | Data konten dari section tersebut (bisa berupa `dict`, `list`, atau `None`). |

---

### `get_module_actions`
Mengambil daftar Server Actions dan Client Actions pada modul dengan filter kata kunci pencarian dan caching.

- **Input Parameters:**
  | Parameter | Tipe | Default | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | - | Session database SQLAlchemy. |
  | `module_id` | `uuid.UUID` | - | ID unik modul. |
  | `search` | `Optional[str]` | `None` | Kata kunci pencarian (mencocokkan `Name`, `Description`, `LastModifiedBy`). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[Any]` | Objek Actions yang sudah difilter atau `None` jika tidak ada actions. |

---

### `get_module_service_api_methods`
Mengambil daftar Service Actions / API Endpoints dari modul dengan filter pencarian dan caching.

- **Input Parameters:**
  | Parameter | Tipe | Default | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | - | Session database SQLAlchemy. |
  | `module_id` | `uuid.UUID` | - | ID unik modul. |
  | `search` | `Optional[str]` | `None` | Kata kunci pencarian (mencocokkan `Name`, `Description`, `LastModifiedBy`). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[Any]` | Data Service Actions / API Methods yang sudah difilter atau `None`. |

---

### `get_module_structures`
Mengambil data Structures (Data DTOs & Custom Types) dari modul dengan filter pencarian dan caching.

- **Input Parameters:**
  | Parameter | Tipe | Default | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | - | Session database SQLAlchemy. |
  | `module_id` | `uuid.UUID` | - | ID unik modul. |
  | `search` | `Optional[str]` | `None` | Kata kunci pencarian (mencocokkan `Name`, `LastModifiedBy`, `Description`). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[Any]` | Data Structures yang cocok atau `None`. |

---

### `get_module_site_properties`
Mengambil konfigurasi Site Properties (Environment Variables) dari modul dengan filter pencarian dan caching.

- **Input Parameters:**
  | Parameter | Tipe | Default | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | - | Session database SQLAlchemy. |
  | `module_id` | `uuid.UUID` | - | ID unik modul. |
  | `search` | `Optional[str]` | `None` | Kata kunci pencarian (mencocokkan `Name`, `Description`, `DataType`). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[Any]` | Data Site Properties yang cocok atau `None`. |

---

### `get_module_system_roles`
Mengambil Security Roles dari modul dengan filter pencarian dan caching.

- **Input Parameters:**
  | Parameter | Tipe | Default | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | - | Session database SQLAlchemy. |
  | `module_id` | `uuid.UUID` | - | ID unik modul. |
  | `search` | `Optional[str]` | `None` | Kata kunci pencarian (mencocokkan `Name`, `Description`). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[Any]` | Data System Roles yang cocok atau `None`. |

---

### `get_module_exceptions`
Mengambil User Defined Exceptions dari modul dengan filter pencarian dan caching.

- **Input Parameters:**
  | Parameter | Tipe | Default | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | - | Session database SQLAlchemy. |
  | `module_id` | `uuid.UUID` | - | ID unik modul. |
  | `search` | `Optional[str]` | `None` | Kata kunci pencarian (mencocokkan nama exception, kategori, atau `LastModifiedBy`). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[Any]` | Data Exceptions yang cocok atau `None`. |

---

## 5. Pengolahan & Pencarian Entity

### `filter_entities_data`
Engine inti untuk memfilter koleksi data Entity OutSystems (Database Entities, Attributes, Static Records). Mampu melakukan pencarian mendalam pada nama entity, deskripsi, nama kolom/attribute, tipe data kolom, hingga record static entity.

- **Input Parameters:**
  | Parameter | Tipe | Default | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `entities_data` | `Any` | - | Raw data entities (dict ber-wrapper `{'Entity': [...]}` atau `list`). |
  | `search` | `Optional[str]` | `None` | Kata kunci pencarian untuk entity name, attribute name/type, static records, dll. |
  | `is_static` | `Optional[bool]` | `None` | `True` (hanya static entities), `False` (hanya database entities biasa), `None` (semua). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Any` | Struktur entities yang telah difilter sesuai kriteria dan tipe pembungkus aslinya. |

---

### `get_module_entities`
Mengambil daftar Entities pada satu modul dengan dukungan filter pencarian, filter status static entity, dan in-memory cache.

- **Input Parameters:**
  | Parameter | Tipe | Default | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | - | Session database SQLAlchemy. |
  | `module_id` | `uuid.UUID` | - | ID unik modul. |
  | `search` | `Optional[str]` | `None` | Kata kunci pencarian entitas/atribut. |
  | `is_static` | `Optional[bool]` | `None` | Filter tipe entitas (`True` / `False` / `None`). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[Any]` | Data entities yang difilter atau `None` jika modul tidak memiliki entities. |

---

### `get_application_entities`
Mengambil dan mengagregasi semua Entities dari seluruh modul yang bernaung di bawah satu aplikasi, lengkap dengan informasi modul asal, suffix, dan total entity.

- **Input Parameters:**
  | Parameter | Tipe | Default | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `db` | `Session` | - | Session database SQLAlchemy. |
  | `application_id` | `uuid.UUID` | - | ID unik aplikasi induk. |
  | `search` | `Optional[str]` | `None` | Kata kunci pencarian entitas/atribut di seluruh modul. |
  | `is_static` | `Optional[bool]` | `None` | Filter tipe entitas (`True` / `False` / `None`). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `List[Dict[str, Any]]` | List objek ringkasan tiap modul yang memiliki entities, dengan format:<br>`[{"module_id": str, "module_name": str, "suffix": str, "total_entities": int, "entities": [...]}]` |

---

## 6. Helper Internal

### `_parse_data_field`
Fungsi rekursif internal untuk mem-parsing string JSON bertingkat (nested serialized JSON string) atau byte array menjadi Python `dict` / `list`.

- **Input Parameters:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `data` | `Any` | Ya | Input data yang berpotensi berupa string JSON, dict, list, atau bytes. |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Any` | Struktur data Python yang sudah ter-parse secara bersih. |

---

### `_find_field_value`
Helper pencari nilai field tertentu secara rekursif dalam dictionary atau list bersarang (*nested hierarchy*).

- **Input Parameters:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `data` | `Any` | Ya | Struktur dictionary atau list data. |
  | `target_keys` | `List[str]` | Ya | Daftar kandidat nama key yang dicari (case-insensitive). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Optional[Any]` | Nilai pertama dari key yang cocok dan tidak kosong, atau `None`. |

---

### `_filter_dict_or_list_by_search`
Helper generik untuk menyaring item-item dalam wrapper dictionary OutSystems (misal `{"Action": [...]}`) atau list biasa berdasarkan daftar nama field target.

- **Input Parameters:**
  | Parameter | Tipe | Wajib | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `data` | `Any` | Ya | Data mentah section OutSystems. |
  | `search` | `Optional[str]` | Ya | Kata kunci query pencarian. |
  | `wrapper_key` | `str` | Ya | Nama key pembungkus item (misal: `"Action"`, `"Structure"`, `"SiteProperty"`). |
  | `search_fields` | `List[str]` | Ya | Daftar nama field objek yang ingin dicocokkan (misal: `["Name", "Description"]`). |

- **Output:**
  | Tipe | Deskripsi |
  | :--- | :--- |
  | `Any` | Struktur data yang telah difilter sesuai query pencarian. |
