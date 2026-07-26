from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import sqlite3
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "gymtracker.db")

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
try:
    from backend.database import engine, Base, SessionLocal, get_db
    from backend.models import UserModel, RoutineModel, WorkoutLogModel, ProfileDataModel
    from backend.auth import get_password_hash, verify_password, create_access_token
    Base.metadata.create_all(bind=engine)
    HAS_SUPABASE = True
    print("✅ Tablas de SQLAlchemy / Supabase inicializadas correctamente.")
except Exception as e:
    print(f"ℹ️ Advertencia inicializando SQLAlchemy/Supabase: {e}")

# 2. Local SQLite fallback initialization
def init_sqlite_db():
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                avatar TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS profile_data (
                profile_id TEXT PRIMARY KEY,
                routines_json TEXT,
                weights_json TEXT,
                history_json TEXT,
                active_session_json TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("SELECT COUNT(*) FROM profiles")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO profiles VALUES ('prof_erick', 'Erick', '👨‍🏽‍🦱')")
            cursor.execute("INSERT INTO profiles VALUES ('prof_pareja', 'Pareja', '👩🏻')")
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"ℹ️ SQLite fallback: {e}")

init_sqlite_db()

# --- Pydantic Schemas ---
class UserRegisterSchema(BaseModel):
    name: str
    email: str
    password: str
    avatar: str = "👨‍🏽‍🦱"

class UserLoginSchema(BaseModel):
    email: str
    password: str

class SyncPayload(BaseModel):
    profiles: list
    activeProfileId: str
    routines: list | None = None
    weightsHistory: dict | None = None
    workoutHistory: list | None = None
    activeSession: dict | None = None

# --- Auth Endpoints ---
@app.post("/api/auth/register")
def register_user(payload: UserRegisterSchema):
    if not HAS_SUPABASE:
        # Local mock user creation
        u_id = "user_" + str(int(os.urandom(4).hex(), 16))
        token = create_access_token({"sub": u_id, "email": payload.email})
        return {
            "token": token,
            "user": {"id": u_id, "name": payload.name, "email": payload.email, "avatar": payload.avatar}
        }
    
    db = SessionLocal()
    try:
        existing = db.query(UserModel).filter(UserModel.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")

        u_id = "prof_" + str(int(os.urandom(4).hex(), 16))
        user = UserModel(
            id=u_id,
            email=payload.email,
            hashed_password=get_password_hash(payload.password),
            name=payload.name,
            avatar=payload.avatar
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token({"sub": user.id, "email": user.email})
        return {
            "token": token,
            "user": {"id": user.id, "name": user.name, "email": user.email, "avatar": user.avatar}
        }
    finally:
        db.close()

@app.post("/api/auth/login")
def login_user(payload: UserLoginSchema):
    if not HAS_SUPABASE:
        token = create_access_token({"sub": "prof_erick", "email": payload.email})
        return {
            "token": token,
            "user": {"id": "prof_erick", "name": "Erick", "email": payload.email, "avatar": "👨‍🏽‍🦱"}
        }

    db = SessionLocal()
    try:
        user = db.query(UserModel).filter(UserModel.email == payload.email).first()
        if not user or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos.")

        token = create_access_token({"sub": user.id, "email": user.email})
        return {
            "token": token,
            "user": {"id": user.id, "name": user.name, "email": user.email, "avatar": user.avatar}
        }
    finally:
        db.close()

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "app": "CenterFit GymTracker API v2.0",
        "database": "PostgreSQL/Supabase" if (HAS_SUPABASE and os.environ.get("DATABASE_URL")) else "SQLite Local"
    }

# --- State Sync & Fetch Endpoints ---
@app.get("/api/state/{profile_id}")
def get_profile_state(profile_id: str):
    routines = None
    weightsHistory = {}
    workoutHistory = []
    activeSession = None

    # 1. Try fetching from Supabase if connected
    if HAS_SUPABASE:
        db = SessionLocal()
        try:
            p_data = db.query(ProfileDataModel).filter(ProfileDataModel.profile_id == profile_id).first()
            if p_data:
                routines = json.loads(p_data.routines_json) if p_data.routines_json else None
                weightsHistory = json.loads(p_data.weights_json) if p_data.weights_json else {}
                workoutHistory = json.loads(p_data.history_json) if p_data.history_json else []
                activeSession = json.loads(p_data.active_session_json) if p_data.active_session_json else None
        except Exception as e:
            print(f"Supabase read fallback: {e}")
        finally:
            db.close()

    # 2. SQLite local fallback if Supabase record empty
    if routines is None:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT routines_json, weights_json, history_json, active_session_json FROM profile_data WHERE profile_id = ?", (profile_id,))
        row = cursor.fetchone()
        if row:
            routines = json.loads(row[0]) if row[0] else None
            weightsHistory = json.loads(row[1]) if row[1] else {}
            workoutHistory = json.loads(row[2]) if row[2] else []
            activeSession = json.loads(row[3]) if row[3] else None
        conn.close()

    profiles = [
        {"id": "prof_erick", "name": "Erick", "avatar": "👨‍🏽‍🦱"},
        {"id": "prof_pareja", "name": "Pareja", "avatar": "👩🏻"}
    ]

    return {
        "profiles": profiles,
        "routines": routines,
        "weightsHistory": weightsHistory,
        "workoutHistory": workoutHistory,
        "activeSession": activeSession
    }

@app.post("/api/sync/{profile_id}")
def sync_profile_state(profile_id: str, payload: SyncPayload):
    routines_str = json.dumps(payload.routines) if payload.routines is not None else None
    weights_str = json.dumps(payload.weightsHistory) if payload.weightsHistory is not None else None
    history_str = json.dumps(payload.workoutHistory) if payload.workoutHistory is not None else None
    active_str = json.dumps(payload.activeSession) if payload.activeSession is not None else None

    # 1. Sync to Supabase PostgreSQL (populating profile_data, routines, and workout_logs tables)
    if HAS_SUPABASE:
        db = SessionLocal()
        try:
            p_data = db.query(ProfileDataModel).filter(ProfileDataModel.profile_id == profile_id).first()
            if not p_data:
                p_data = ProfileDataModel(profile_id=profile_id)
                db.add(p_data)

            if payload.routines is not None:
                p_data.routines_json = routines_str
            if payload.weightsHistory is not None:
                p_data.weights_json = weights_str
            if payload.workoutHistory is not None:
                p_data.history_json = history_str
            if payload.activeSession is not None:
                p_data.active_session_json = active_str

            # Sync individual routines into routines table
            if payload.routines:
                for r in payload.routines:
                    r_id = r.get('id')
                    if r_id:
                        r_model = db.query(RoutineModel).filter(RoutineModel.id == r_id).first()
                        if not r_model:
                            r_model = RoutineModel(id=r_id, user_id=profile_id, name=r.get('name', 'Rutina'), days_data=r.get('days', []))
                            db.add(r_model)
                        else:
                            r_model.name = r.get('name', r_model.name)
                            r_model.days_data = r.get('days', r_model.days_data)

            # Sync individual workout logs into workout_logs table
            if payload.workoutHistory:
                for w in payload.workoutHistory:
                    w_id = w.get('id')
                    if w_id:
                        w_model = db.query(WorkoutLogModel).filter(WorkoutLogModel.id == w_id).first()
                        if not w_model:
                            w_model = WorkoutLogModel(
                                id=w_id,
                                user_id=profile_id,
                                day_name=w.get('dayName', 'Entrenamiento'),
                                date_formatted=w.get('dateFormatted', ''),
                                time_formatted=w.get('timeFormatted', ''),
                                duration_seconds=w.get('durationSeconds', 0),
                                total_sets=w.get('totalSets', 0),
                                total_volume_kg=w.get('totalVolumeKg', 0.0),
                                detailed_exercises=w.get('detailedExercises', [])
                            )
                            db.add(w_model)

            db.commit()
            print(f"✅ Sincronizado a Supabase correctamente para {profile_id}")
        except Exception as e:
            print(f"⚠️ Error sincronizando a Supabase: {e}")
            db.rollback()
        finally:
            db.close()

    # 2. Sync to local SQLite fallback
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        for p in payload.profiles:
            cursor.execute("INSERT OR REPLACE INTO profiles (id, name, avatar) VALUES (?, ?, ?)", (p['id'], p['name'], p['avatar']))
        
        cursor.execute("""
            INSERT OR REPLACE INTO profile_data (profile_id, routines_json, weights_json, history_json, active_session_json, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (profile_id, routines_str, weights_str, history_str, active_str))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"ℹ️ SQLite sync fallback: {e}")

    return {"status": "synced", "profile_id": profile_id}

# Mount static frontend files for production serving
frontend_path = os.path.join(BASE_DIR, "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
