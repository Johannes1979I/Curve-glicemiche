from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine, SessionLocal
from .routers import patients, exams, presets, report_settings, catalog
from .services.seed_data import ensure_default_catalog


def ensure_schema_updates():
    """Piccola migrazione automatica compatibile con DB già esistenti."""
    with engine.begin() as conn:
        dialect = conn.dialect.name

        if dialect == "sqlite":
            cols = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info('antibiotic_catalog')").fetchall()}
            if "antibiotic_class" not in cols:
                conn.exec_driver_sql("ALTER TABLE antibiotic_catalog ADD COLUMN antibiotic_class VARCHAR(120)")
            if "breakpoint_ref" not in cols:
                conn.exec_driver_sql("ALTER TABLE antibiotic_catalog ADD COLUMN breakpoint_ref VARCHAR(120)")
        else:
            # Tentativo best-effort per PostgreSQL/MySQL moderni.
            try:
                conn.exec_driver_sql("ALTER TABLE antibiotic_catalog ADD COLUMN IF NOT EXISTS antibiotic_class VARCHAR(120)")
            except Exception:
                pass
            try:
                conn.exec_driver_sql("ALTER TABLE antibiotic_catalog ADD COLUMN IF NOT EXISTS breakpoint_ref VARCHAR(120)")
            except Exception:
                pass


Base.metadata.create_all(bind=engine)
ensure_schema_updates()

# Seed catalog antibiotici default
with SessionLocal() as db:
    ensure_default_catalog(db)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router, prefix="/api")
app.include_router(catalog.router, prefix="/api")
app.include_router(exams.router, prefix="/api")
app.include_router(presets.router, prefix="/api")
app.include_router(report_settings.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.app_name, "env": settings.env}


# Serve frontend
FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")


@app.get("/")
def index():
    return FileResponse(FRONTEND_DIR / "index.html")
