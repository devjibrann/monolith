from fastapi import FastAPI

from app.providers import provider_status
from app.routers import internal

app = FastAPI(title="AI Workspace - AI Service")

app.include_router(internal.router)


@app.get("/")
async def root():
    return {"message": "AI Service is up and running", **provider_status()}


@app.get("/health")
async def health():
    return {"status": "healthy", **provider_status()}
