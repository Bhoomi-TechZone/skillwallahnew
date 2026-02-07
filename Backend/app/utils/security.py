from passlib.context import CryptContext
import bcrypt
import random
import string
from datetime import datetime

# Configure bcrypt context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def truncate_password(password: str) -> str:
    """Truncate password to 72 bytes to comply with bcrypt requirements"""
    # Convert to bytes and truncate if necessary
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        # Truncate to 72 bytes while ensuring we don't break UTF-8 encoding
        truncated = password_bytes[:72]
        # Decode back to string, handling potential broken UTF-8 at the end
        try:
            password = truncated.decode('utf-8')
        except UnicodeDecodeError:
            # If decoding fails, truncate a bit more to avoid broken chars
            password = password_bytes[:70].decode('utf-8', errors='ignore')
    return password

def hash_password(password: str) -> str:
    """Hash a password after ensuring it meets bcrypt requirements"""
    password = truncate_password(password)
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password using bcrypt directly to avoid passlib issues"""
    try:
        # Debug logging
        print(f"[DEBUG] Verifying password - Length: {len(plain_password)} characters, {len(plain_password.encode('utf-8'))} bytes")
        print(f"[DEBUG] Hashed password format: {hashed_password[:20] if len(hashed_password) > 20 else hashed_password}...")
        
        # Check if it's a bcrypt hash
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$") or hashed_password.startswith("$2y$"):
            # Use bcrypt directly
            is_valid = bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
            print(f"[DEBUG] Bcrypt verification result: {is_valid}")
            return is_valid
        else:
            # Plain text password - direct comparison
            is_valid = (plain_password == hashed_password)
            print(f"[DEBUG] Plain text comparison result: {is_valid}")
            return is_valid
            
    except Exception as e:
        print(f"[ERROR] Password verification failed: {str(e)}")
        # Fallback to plain text comparison
        try:
            is_valid = (plain_password == hashed_password)
            print(f"[DEBUG] Fallback plain text comparison result: {is_valid}")
            return is_valid
        except:
            return False

def generate_branch_code(franchise_code: str, centre_name: str) -> str:
    """
    Generate a unique branch code based on franchise code and centre name
    Format: FC-CN-XXXX (where FC=franchise code prefix, CN=centre name prefix, XXXX=random)
    """
    # Take first 2 letters from franchise code
    fc_prefix = franchise_code[:2].upper() if len(franchise_code) >= 2 else franchise_code.upper()
    
    # Take first 2 letters from centre name (remove spaces and special chars)
    clean_centre = ''.join(c for c in centre_name if c.isalnum())
    cn_prefix = clean_centre[:2].upper() if len(clean_centre) >= 2 else clean_centre.upper()
    
    # Generate 4 random digits
    random_digits = ''.join(random.choices(string.digits, k=4))
    
    # Combine to create branch code
    branch_code = f"{fc_prefix}-{cn_prefix}-{random_digits}"
    
    return branch_code

def generate_unique_branch_code(franchise_code: str, centre_name: str, db_collection) -> str:
    """
    Generate a unique branch code by checking database for duplicates
    """
    max_attempts = 10
    for _ in range(max_attempts):
        branch_code = generate_branch_code(franchise_code, centre_name)
        # Check if code already exists
        existing = db_collection.find_one({"centre_info.code": branch_code})
        if not existing:
            return branch_code
    
    # If still not unique after 10 attempts, add timestamp
    timestamp = datetime.utcnow().strftime("%m%d")
    fc_prefix = franchise_code[:2].upper()
    return f"{fc_prefix}-BR-{timestamp}"