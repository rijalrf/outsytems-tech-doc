import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core import config
from routers import agentic_router, application_router, module_router, project_router

app = FastAPI(
    title=config.settings.app_name,
    version=config.settings.app_version,
    description="API untuk ekstraksi dan parsing modul Outsystems (.oap / .oml)",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(project_router.router, prefix="/api/v1", tags=["Projects"])
app.include_router(module_router.router, prefix="/api/v1/oml", tags=["OML Parser"])
app.include_router(application_router.router, prefix="/api/v1", tags=["Applications & Modules"])
app.include_router(agentic_router.router, prefix="/api/v1/agent", tags=["Agentic AI Assistant"])




@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint untuk memverifikasi status API."""
    return {
        "status": "healthy",
        "app": config.settings.app_name,
        "version": config.settings.app_version,
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host=config.settings.app_host, port=config.settings.app_port, reload=True)