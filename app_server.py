from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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
try:
    from backend.database import engine, Base
    from backend.models import UserModel, RoutineModel, WorkoutLogModel
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas de SQLAlchemy / Supabase inicializadas correctamente.")
except Exception as e:
    print(f"ℹ️ Advertencia inicializando SQLAlchemy/Supabase: {e}")

# 2. Initialize local SQLite fallback
def init_db():
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
        print(f"ℹ️ Warning SQLite local: {e}")

init_db()

class SyncPayload(BaseModel):
    profiles: list
    activeProfileId: str
    routines: list | None = None
    weightsHistory: dict | None = None
    workoutHistory: list | None = None
    activeSession: dict | None = None

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "app": "CenterFit GymTracker API v2.0",
        "database": "PostgreSQL/Supabase" if os.environ.get("DATABASE_URL") else "SQLite Local"
    }

@app.get("/api/state/{profile_id}")
def get_profile_state(profile_id: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("SELECT routines_json, weights_json, history_json, active_session_json FROM profile_data WHERE profile_id = ?", (profile_id,))
    row = cursor.fetchone()
    
    cursor.execute("SELECT id, name, avatar FROM profiles")
    profiles_rows = cursor.fetchall()
    profiles = [{"id": r[0], "name": r[1], "avatar": r[2]} for r in profiles_rows]
    
    conn.close()
    
    if not row:
        return {
            "profiles": profiles,
            "routines": None,
            "weightsHistory": {},
            "workoutHistory": [],
            "activeSession": None
        }
    
    return {
        "profiles": profiles,
        "routines": json.loads(row[0]) if row[0] else None,
        "weightsHistory": json.loads(row[1]) if row[1] else {},
        "workoutHistory": json.loads(row[2]) if row[2] else [],
        "activeSession": json.loads(row[3]) if row[3] else None
    }

@app.post("/api/sync/{profile_id}")
def sync_profile_state(profile_id: str, payload: SyncPayload):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    for p in payload.profiles:
        cursor.execute("INSERT OR REPLACE INTO profiles (id, name, avatar) VALUES (?, ?, ?)", (p['id'], p['name'], p['avatar']))
    
    cursor.execute("""
        INSERT OR REPLACE INTO profile_data (profile_id, routines_json, weights_json, history_json, active_session_json, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    """, (
        profile_id,
        json.dumps(payload.routines) if payload.routines is not None else None,
        json.dumps(payload.weightsHistory) if payload.weightsHistory is not None else None,
        json.dumps(payload.workoutHistory) if payload.workoutHistory is not None else None,
        json.dumps(payload.activeSession) if payload.activeSession is not None else None
    ))
    
    conn.commit()
    conn.close()
    
    return {"status": "synced", "profile_id": profile_id}

# Mount static frontend files for production serving
frontend_path = os.path.join(BASE_DIR, "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
