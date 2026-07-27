import os
import json
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI(title="CenterFit GymTracker API")

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

from backend.repository import StorageRepository

# Initialize local SQLite fallback tables
StorageRepository.init_sqlite_db()

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

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "app": "CenterFit GymTracker API v2.0",
        "primary_database": "Supabase PostgreSQL" if (HAS_SUPABASE and os.environ.get("DATABASE_URL")) else "SQLite Local Fallback"
    }

# --- State Sync & Fetch Endpoints ---
@app.get("/api/state/{profile_id}")
def get_profile_state(profile_id: str, db: Any = Depends(get_db)):
    return StorageRepository.get_state(profile_id, db=db, has_supabase=HAS_SUPABASE)

@app.post("/api/sync/{profile_id}")
def sync_profile_state(profile_id: str, payload: SyncPayload, db: Any = Depends(get_db)):
    return StorageRepository.sync_state(profile_id, payload=payload, db=db, has_supabase=HAS_SUPABASE)

# Mount static frontend files for production serving
frontend_path = os.path.join(BASE_DIR, "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
