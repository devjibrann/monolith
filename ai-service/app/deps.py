import os

from fastapi import Header, HTTPException

SECRET = os.getenv("AI_SERVICE_SECRET", "development-ai-secret-change-in-production")


def verify_internal_secret(x_internal_secret: str = Header(..., alias="X-Internal-Secret")) -> None:
    if x_internal_secret != SECRET:
        raise HTTPException(status_code=401, detail="Invalid internal secret")
