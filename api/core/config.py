import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

# Load .env baik dari api/ maupun root workspace
api_dir = Path(__file__).resolve().parent.parent
env_file_path = api_dir / ".env"
load_dotenv(dotenv_path=env_file_path)
load_dotenv(dotenv_path=api_dir.parent / ".env")
load_dotenv()



def _get_required_env(env_name: str) -> str:
    """Mengambil nilai environment variable dan memastikan tidak kosong."""
    value = os.getenv(env_name)
    if not value or not value.strip():
        raise ValueError(f"Environment variable '{env_name}' tidak ditemukan atau kosong.")
    return value.strip()


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "Tech-Gen API")
    app_version: str = os.getenv("APP_VERSION", "1.0.0")
    app_host: str = os.getenv("APP_HOST", "0.0.0.0")
    app_port: int = int(os.getenv("APP_PORT", "8001"))
    read_oml_base_url: str = _get_required_env("READ_OML_BASE_URL")
    read_oml_api_key: str = os.getenv("X_API_KEY", os.getenv("X-API-KEY", os.getenv("READ_OML_API_KEY", "")))
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/outsystems_doc")


settings = Settings()

