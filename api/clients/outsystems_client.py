from pathlib import Path
from typing import Any, Dict
import requests

from core import config


class OutsystemsClient:
    """Client untuk menangani komunikasi HTTP ke Outsystems OML Parser API."""

    def __init__(self, base_url: str | None = None, api_key: str | None = None):
        self.base_url = base_url or config.settings.read_oml_base_url
        self.api_key = api_key if api_key is not None else config.settings.read_oml_api_key

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/json",
        }
        if self.api_key:
            headers["X-API-KEY"] = self.api_key
        return headers

    def send_oml(
        self,
        file_bytes: bytes | None = None,
        file_path: str | Path | None = None,
        filename: str = "module.oml",
        timeout: int = 60,
    ) -> Dict[str, Any]:
        """
        Mengirim file binary .oml ke API Outsystems sebagai multipart/form-data.
        Bisa menerima input file_bytes (memory) atau file_path (disk).
        """
        if file_path is not None:
            path = Path(file_path)
            if not path.exists():
                raise FileNotFoundError(f"File tidak ditemukan: {path}")
            with open(path, "rb") as f:
                payload = f.read()
            filename = path.name
        elif file_bytes is not None:
            payload = file_bytes
        else:
            raise ValueError("Harus menyertakan file_bytes atau file_path.")

        files = {
            "content": (filename, payload, "application/octet-stream")
        }

        try:
            response = requests.post(
                url=self.base_url,
                files=files,
                headers=self._get_headers(),
                timeout=timeout,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": str(e),
                "data": None,
            }


# Singleton instance untuk kemudahan penggunaan
outsystems_client = OutsystemsClient()
