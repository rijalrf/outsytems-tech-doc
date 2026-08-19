import sys
from urllib.parse import urlparse
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
API_DIR = BASE_DIR / "api"
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from core import config, database
from models import application_model, module_model, project_model



def init_db():
    db_url = config.settings.database_url
    parsed = urlparse(db_url)
    target_db = parsed.path.lstrip("/")
    user = parsed.username or "postgres"
    password = parsed.password or ""
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432

    print(f"=== Menghubungkan ke PostgreSQL ({host}:{port}) ===")

    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user=user,
            password=password,
            host=host,
            port=port,
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{target_db}'")
        if not cursor.fetchone():
            cursor.execute(f'CREATE DATABASE "{target_db}"')
            print(f"-> Database '{target_db}' berhasil dibuat!")
        else:
            print(f"-> Database '{target_db}' sudah tersedia.")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Perhatian: {e}")

    print("=== Menginisialisasi Tabel 'applications' & 'oml_modules' ===")
    try:
        database.Base.metadata.create_all(bind=database.engine)
        print("-> Tabel 'applications' dan 'oml_modules' berhasil dibuat/diverifikasi di PostgreSQL!")
        print("=== Database Siap Digunakan ===")
    except Exception as e:
        print(f"Error saat membuat tabel: {e}")


if __name__ == "__main__":
    init_db()
