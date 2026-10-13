import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from backend.repository import StorageRepository

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI(title="My Gym Tracker App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Initialize SQLAlchemy / Supabase PostgreSQL if DATABASE_URL is configured
HAS_SUPABASE = False
get_db = None

try:
    from backend.database import engine, Base, SessionLocal, get_db as _get_db
    from backend.models import UserModel
    from backend.auth import get_password_hash, verify_password, create_access_token
    Base.metadata.create_all(bind=engine)
    HAS_SUPABASE = True
    get_db = _get_db
    print("✅ Tablas de SQLAlchemy / Supabase inicializadas correctamente.")
except Exception as e:
    print(f"ℹ️ Modo Offline / SQLite fallback activo: {e}")

    def get_db():
        yield None


# Initialize local SQLite fallback tables
StorageRepository.init_sqlite_db()


async def auto_ping_background_worker():
    """
    Background worker that runs periodically while the server is alive
    to execute a keepalive query on Supabase PostgreSQL.
    Prevents automatic project pausing due to inactivity.
    """
    # Wait 60 seconds after server startup before initial background ping
    await asyncio.sleep(60)
    while True:
        try:
            if HAS_SUPABASE:
                try:
                    from backend.database import SessionLocal
                    db_session = SessionLocal()
                    try:
                        res = StorageRepository.ping_database(db=db_session, has_supabase=True)
                        print(f"🏓 [Supabase Keepalive] Ping automático ejecutado con éxito: {res.get('status')}")
                    finally:
                        db_session.close()
                except Exception as ping_err:
                    print(f"⚠️ [Supabase Keepalive] Error en ping automático: {ping_err}")
            # Ping every 24 hours (86400 seconds)
            await asyncio.sleep(86400)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"⚠️ [Supabase Keepalive] Excepción en worker: {e}")
            await asyncio.sleep(3600)


@app.on_event("startup")
async def start_keepalive_worker():
    asyncio.create_task(auto_ping_background_worker())

# --- Pydantic Schemas ---


class UserRegisterSchema(BaseModel):
    name: str
    email: str
    password: str
    avatar: str = "👤"


class UserLoginSchema(BaseModel):
    email: str
    password: str


class UserProfileUpdateSchema(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None


class SyncPayload(BaseModel):
    routines: Optional[List[Dict[str, Any]]] = None
    weightsHistory: Optional[Dict[str, Any]] = None
    workoutHistory: Optional[List[Dict[str, Any]]] = None
    activeSession: Optional[Dict[str, Any]] = None


class ExerciseCreateSchema(BaseModel):
    id: Optional[str] = None
    name: str
    category: str
    equipment: Optional[str] = "General"
    defaultSets: Optional[int] = 1
    defaultReps: Optional[int] = 12
    unit: Optional[str] = "reps"

# --- User & Profile Endpoints ---


@app.put("/api/user/profile/{user_id}")
def update_user_profile(user_id: str, payload: UserProfileUpdateSchema, db: Any = Depends(get_db)):
    return StorageRepository.update_user_profile(user_id, name=payload.name, avatar=payload.avatar, db=db, has_supabase=HAS_SUPABASE)


@app.delete("/api/history/{profile_id}/{log_id}")
def delete_workout_history_log(profile_id: str, log_id: str, db: Any = Depends(get_db)):
    return StorageRepository.delete_workout_log(profile_id, log_id, db=db, has_supabase=HAS_SUPABASE)


@app.put("/api/history/{profile_id}/{log_id}")
def update_workout_history_log(profile_id: str, log_id: str, payload: Dict[str, Any], db: Any = Depends(get_db)):
    return StorageRepository.update_workout_log(profile_id, log_id, payload, db=db, has_supabase=HAS_SUPABASE)

# --- Exercise Catalog Endpoints ---


@app.get("/api/exercises")
def get_exercise_catalog(db: Any = Depends(get_db)):
    return StorageRepository.get_exercises(db=db, has_supabase=HAS_SUPABASE)


@app.post("/api/exercises")
def create_or_update_exercise(payload: ExerciseCreateSchema, db: Any = Depends(get_db)):
    return StorageRepository.save_exercise(payload.model_dump(), db=db, has_supabase=HAS_SUPABASE)

# --- Auth Endpoints ---


@app.post("/api/auth/register")
def register_user(payload: UserRegisterSchema, db: Any = Depends(get_db)):
    return StorageRepository.register_user(
        email=payload.email,
        password=payload.password,
        name=payload.name,
        avatar=payload.avatar,
        db=db,
        has_supabase=HAS_SUPABASE
    )


@app.post("/api/auth/login")
def login_user(payload: UserLoginSchema, db: Any = Depends(get_db)):
    return StorageRepository.authenticate_user(
        email=payload.email,
        password=payload.password,
        db=db,
        has_supabase=HAS_SUPABASE
    )


@app.get("/api/ping")
def ping_keepalive(db: Any = Depends(get_db)):
    """
    Keep-alive endpoint to register active database queries on Supabase PostgreSQL.
    Prevents Supabase free tier inactivity auto-pause (7-day threshold).
    Can be polled by external services (cron-job.org, UptimeRobot) or GitHub Actions.
    """
    return StorageRepository.ping_database(db=db, has_supabase=HAS_SUPABASE)


@app.get("/api/health")
def health_check(check_db: bool = False, db: Any = Depends(get_db)):
    health_info = {
        "status": "online",
        "app": "My Gym Tracker App API v2.0",
        "primary_database": "Supabase PostgreSQL" if (HAS_SUPABASE and os.environ.get("DATABASE_URL")) else "SQLite Local Fallback"
    }
    if check_db:
        health_info["database_ping"] = StorageRepository.ping_database(db=db, has_supabase=HAS_SUPABASE)
    return health_info

# --- State Sync & Fetch Endpoints ---


@app.get("/api/state/{profile_id}")
def get_profile_state(profile_id: str, db: Any = Depends(get_db)):
    return StorageRepository.get_state(profile_id, db=db, has_supabase=HAS_SUPABASE)


@app.post("/api/sync/{profile_id}")
def sync_profile_state(profile_id: str, payload: SyncPayload, db: Any = Depends(get_db)):
    return StorageRepository.sync_state(profile_id, payload=payload, db=db, has_supabase=HAS_SUPABASE)

# Serve sw.js with no-cache headers for instant PWA update detection


@app.get("/sw.js")
def get_service_worker():
    sw_file = os.path.join(BASE_DIR, "frontend", "sw.js")
    if os.path.exists(sw_file):
        return FileResponse(sw_file, media_type="application/javascript", headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        })
    raise HTTPException(status_code=404, detail="sw.js no encontrado")


# Mount static frontend files for production serving
frontend_path = os.path.join(BASE_DIR, "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path,
              html=True), name="frontend")
