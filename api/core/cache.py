import time
import threading
from typing import Any, Callable, Dict, Optional, Tuple


class SimpleMemoryCache:
    """
    Thread-safe in-memory cache dengan Time-To-Live (TTL) expiry
    untuk menyimpan data modul OutSystems yang jarang berubah.
    """

    def __init__(self, default_ttl: int = 3600):
        self.default_ttl = default_ttl
        self._store: Dict[str, Tuple[Any, float]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        """Mengambil data dari cache jika belum kadaluarsa."""
        with self._lock:
            if key not in self._store:
                return None
            val, expiry = self._store[key]
            if time.time() > expiry:
                del self._store[key]
                return None
            return val

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Menyimpan data ke cache dengan TTL tertentu (dalam detik)."""
        duration = ttl if ttl is not None else self.default_ttl
        expiry = time.time() + duration
        with self._lock:
            self._store[key] = (value, expiry)

    def delete(self, key: str) -> bool:
        """Menghapus key tertentu dari cache."""
        with self._lock:
            if key in self._store:
                del self._store[key]
                return True
            return False

    def invalidate_prefix(self, prefix: str) -> int:
        """Menghapus seluruh key yang berawalan prefix tertentu (misal: 'module:UUID')."""
        with self._lock:
            keys_to_del = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_del:
                del self._store[k]
            return len(keys_to_del)

    def clear(self) -> None:
        """Mengosongkan seluruh cache."""
        with self._lock:
            self._store.clear()

    def count(self) -> int:
        """Menghitung total entri aktif di cache."""
        with self._lock:
            now = time.time()
            return sum(1 for _, expiry in self._store.values() if expiry > now)


# Global singleton cache instance
memory_cache = SimpleMemoryCache(default_ttl=3600)
