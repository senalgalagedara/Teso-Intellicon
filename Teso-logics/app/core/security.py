from datetime import datetime, timedelta
from typing import Optional, Dict, List
import httpx
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# In-memory cache for JWKS keys to avoid querying Supabase on every request
_jwks_cache: Dict[str, Dict] = {}

class UserSession(BaseModel):
    user_id: str
    email: str
    role: str
    permissions: List[str] = []

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.JWT_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def get_key_from_jwks(kid: str) -> Dict:
    """
    Retrieves the JWK public key matching the given kid from Supabase's JWKS endpoint.
    Caches the keys in memory to minimize external network requests.
    """
    if kid in _jwks_cache:
        return _jwks_cache[kid]

    jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(jwks_url)
            response.raise_for_status()
            jwks = response.json()
            
            for key_data in jwks.get("keys", []):
                k_id = key_data.get("kid")
                if k_id:
                    _jwks_cache[k_id] = key_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not connect to authentication provider: {str(e)}"
        )

    if kid in _jwks_cache:
        return _jwks_cache[kid]

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid key identifier in token."
    )

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserSession:
    """
    FastAPI dependency that extracts and validates the Supabase JWT using RS256 and public keys.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Get kid from unverified header to locate the correct public key
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise credentials_exception

        # Retrieve the key from cached JWKS
        jwk_key = get_key_from_jwks(kid)

        # Decode and verify signature
        payload = jwt.decode(
            token,
            jwk_key,
            algorithms=["RS256"],
            audience="authenticated"
        )

        user_id: str = payload.get("sub")
        email: str = payload.get("email")

        # Parse App Metadata and Role details
        app_metadata = payload.get("app_metadata", {})
        user_metadata = payload.get("user_metadata", {})
        role: str = app_metadata.get("role", user_metadata.get("role", "student"))

        if user_id is None or email is None:
            raise credentials_exception

        return UserSession(
            user_id=user_id,
            email=email,
            role=role,
            permissions=app_metadata.get("permissions", [])
        )

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

class RoleChecker:
    """
    FastAPI dependency to authorize routes based on allowed roles.
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: UserSession = Depends(get_current_user)) -> UserSession:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )
        return user
