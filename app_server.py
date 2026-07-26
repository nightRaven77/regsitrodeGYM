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

def init_db():
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

init_db()

class SyncPayload(BaseModel):
    profiles: list
    activeProfileId: str
    routines: list
    weightsHistory: dict
    workoutHistory: list
    activeSession: dict | None = None

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
        INSERT INTO profile_data (profile_id, routines_json, weights_json, history_json, active_session_json)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(profile_id) DO UPDATE SET
            routines_json=excluded.routines_json,
            weights_json=excluded.weights_json,
            history_json=excluded.history_json,
            active_session_json=excluded.active_session_json,
            updated_at=CURRENT_TIMESTAMP
    """, (
        profile_id,
        json.dumps(payload.routines),
        json.dumps(payload.weightsHistory),
        json.dumps(payload.workoutHistory),
        json.dumps(payload.activeSession)
    ))
    
    conn.commit()
    conn.close()
    return {"status": "ok", "message": "Synced successfully"}

# Locate frontend directory dynamically
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
if not os.path.exists(FRONTEND_DIR):
    FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app_server:app", host="0.0.0.0", port=port, reload=True)
