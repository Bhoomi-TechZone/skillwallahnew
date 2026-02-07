# Simple in-memory cache for frequently accessed data
from datetime import datetime, timedelta
from typing import Any, Optional
import logging

logger = logging.getLogger("uvicorn")

class SimpleCache:
    """Simple in-memory cache with TTL support"""
    
    def __init__(self):
        self._cache = {}
        self._expiry = {}
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key not in self._cache:
            return None
        
        # Check if expired
        if key in self._expiry and datetime.utcnow() > self._expiry[key]:
            self.delete(key)
            return None
        
        logger.debug(f"[Cache] HIT: {key}")
        return self._cache[key]
    
    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set value in cache with TTL (default 5 minutes)"""
        self._cache[key] = value
        self._expiry[key] = datetime.utcnow() + timedelta(seconds=ttl_seconds)
        logger.debug(f"[Cache] SET: {key} (TTL: {ttl_seconds}s)")
    
    def delete(self, key: str):
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]
        if key in self._expiry:
            del self._expiry[key]
        logger.debug(f"[Cache] DEL: {key}")
    
    def clear(self):
        """Clear entire cache"""
        self._cache.clear()
        self._expiry.clear()
        logger.debug("[Cache] CLEARED")
    
    def cleanup_expired(self):
        """Remove expired entries"""
        now = datetime.utcnow()
        expired_keys = [k for k, v in self._expiry.items() if now > v]
        for key in expired_keys:
            self.delete(key)
        if expired_keys:
            logger.debug(f"[Cache] Cleaned up {len(expired_keys)} expired entries")

# Global cache instance
app_cache = SimpleCache()
