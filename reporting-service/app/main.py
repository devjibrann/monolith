from fastapi import FastAPI

from app.routers import internal

app = FastAPI(title="AI Workspace - Reporting Service")

app.include_router(internal.router)


@app.get("/")
async def root():
    return {"message": "Reporting Service is up and running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
