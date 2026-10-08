import os
import jwt
import requests
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-for-dev")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
JWKS_URL = f"{SUPABASE_URL}/jwt/v1/jwks" if SUPABASE_URL else None

security_bearer = HTTPBearer()

class UserClaims(BaseModel):
    id: str
    email: str
    role: str

# Cache for JWKs in case of RS256 verification
jwks_cache = None

def get_jwks():
    global jwks_cache
    if jwks_cache is None and JWKS_URL:
        try:
            response = requests.get(JWKS_URL, timeout=5)
            if response.status_code == 200:
                jwks_cache = response.json()
        except Exception as e:
            print(f"Failed to fetch JWKS from Supabase: {e}")
    return jwks_cache

def verify_supabase_jwt(credentials: HTTPAuthorizationCredentials = Security(security_bearer)) -> UserClaims:
    token = credentials.credentials
    try:
        # 1. Try decoding with HS256 (Supabase's default shared secret mode)
        # Supabase uses HS256 with JWT Secret for local API / JWT signature validation.
        headers = jwt.get_unverified_header(token)
        algorithm = headers.get("alg", "HS256")
        
        if algorithm == "HS256":
            payload = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
        elif algorithm == "RS256":
            # Fetch public key from Supabase JWKS endpoint
            jwks = get_jwks()
            if not jwks:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="JWKS endpoint is not available"
                )
            
            # Find matching public key
            kid = headers.get("kid")
            public_key = None
            for key_data in jwks.get("keys", []):
                if key_data.get("kid") == kid:
                    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
                    break
            
            if not public_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Public key not found in JWKS"
                )
                
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience="authenticated"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Unsupported signing algorithm: {algorithm}"
            )
            
        # Extract claims
        user_id = payload.get("sub")
        email = payload.get("email")
        # Supabase stores role in app_metadata or user_metadata
        app_metadata = payload.get("app_metadata", {})
        user_metadata = payload.get("user_metadata", {})
        role = app_metadata.get("role") or user_metadata.get("role") or "student"
        
        if not user_id or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="JWT claims missing sub or email"
            )
            
        return UserClaims(id=user_id, email=email, role=role)

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}"
        )
