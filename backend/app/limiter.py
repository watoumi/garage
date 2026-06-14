from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared rate limiter, keyed by client IP. In-memory storage is fine for a
# single-instance MVP; use Redis (storage_uri=...) when scaling horizontally.
limiter = Limiter(key_func=get_remote_address, default_limits=[])
