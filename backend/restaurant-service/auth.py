import os
import jwt
from fastapi import Header, HTTPException
from typing import Optional

# Retrieve JWT Secret from environment variables.
# It must match the secret configured in the User Service.
JWT_SECRET = os.getenv("JWT_SECRET", "superSecretAccessKey2026!")
JWT_ALGORITHM = "HS256"

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Dependency middleware that extracts and validates the Bearer JWT token
    from the Authorization HTTP header. It decodes the token using the shared
    JWT secret to verify authenticity and expiration, returning the user payload.
    """
    # 1. Enforce presence of the Authorization header
    if not authorization:
        raise HTTPException(
            status_code=401, 
            detail="Authorization header is missing. Access denied."
        )

    # 2. Check for correct 'Bearer <token>' format
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Invalid authentication format. Expected 'Bearer <token>'."
        )

    # 3. Extract the token string
    token = authorization.split(" ")[1]

    try:
        # 4. Verify and decode the JWT payload using the shared secret
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # 5. Return the payload so that routes can reference the user (e.g. payload["userId"])
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401, 
            detail="The authentication token has expired. Please log in again."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401, 
            detail="Invalid or tampered authentication token. Access denied."
        )
