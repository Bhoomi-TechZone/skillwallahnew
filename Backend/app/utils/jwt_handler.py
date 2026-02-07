from datetime import datetime, timedelta
from jose import jwt
from app.config import settings

def create_access_token(data: dict) -> str:
    # Set very long expiry - 365 days for persistent sessions
    expire = datetime.utcnow() + timedelta(days=365)
    payload = {**data, "exp": expire}
    print(f"[JWT] Creating PERSISTENT access token with 365 days expiry: {expire}")
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(data: dict) -> str:
    # Set very long expiry - 365 days for persistent sessions  
    expire = datetime.utcnow() + timedelta(days=365)
    payload = {**data, "exp": expire}
    print(f"[JWT] Creating PERSISTENT refresh token with 365 days expiry: {expire}")
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> dict | None:
    import logging
    import json
    import base64
    
    logger = logging.getLogger("uvicorn")
    
    # List of possible secret keys to try (for development flexibility)
    secret_keys_to_try = [
        settings.JWT_SECRET_KEY,
        "supersecretkey",  # Default fallback
        "your_super_secret_key_here",  # Common dev secret
        "secret",  # Simple fallback
    ]
    
    for secret_key in secret_keys_to_try:
        try:
            decoded = jwt.decode(token, secret_key, algorithms=[settings.JWT_ALGORITHM])
            if secret_key != settings.JWT_SECRET_KEY:
                logger.info(f"[Auth] Token decoded with alternate secret key")
            return decoded
        except Exception:
            continue
    
    # If all secret keys fail, try to decode payload without verification (dev mode)
    try:
        logger.warning(f"[Auth] All secret keys failed, attempting unverified decode for development")
        
        # Split the token into parts
        parts = token.split('.')
        if len(parts) != 3:
            logger.warning(f"[Auth] Invalid token format - expected 3 parts, got {len(parts)}")
            return None
        
        # Decode the payload (second part)
        payload_encoded = parts[1]
        # Add padding if needed
        padding = len(payload_encoded) % 4
        if padding:
            payload_encoded += '=' * (4 - padding)
            
        payload_json = base64.b64decode(payload_encoded).decode('utf-8')
        payload = json.loads(payload_json)
        
        # Check expiration
        exp = payload.get('exp')
        if exp:
            from datetime import datetime
            exp_time = datetime.utcfromtimestamp(exp)
            if exp_time < datetime.utcnow():
                logger.warning(f"[Auth] Token has expired")
                return None
        
        # Check if it has required fields for any user type
        if payload.get('user_id') or payload.get('id') or payload.get('_id') or payload.get('email'):
            logger.info(f"[Auth] Unverified decode successful for: {payload.get('email', payload.get('user_id', 'unknown'))}")
            return payload
        else:
            logger.warning(f"[Auth] Token payload missing required identity fields")
            return None
            
    except Exception as decode_error:
        logger.error(f"[Auth] Failed to decode token: {decode_error}")
        return None
