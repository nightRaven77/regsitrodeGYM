import json
import os
import sqlite3
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.join(BASE_DIR, "gymtracker.db")

class StorageRepository:
    """
    Repository class encapsulating storage access for both Supabase (SQLAlchemy)
    and local SQLite fallback. Adheres to Single Responsibility & Dependency Inversion principles.
    """

    @staticmethod
    def init_sqlite_db():
        """Initialize local SQLite tables for fallback storage."""
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
                cursor.execute("INSERT INTO profiles VALUES ('prof_guest', 'Invitado / Anónimo', '👤')")
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"ℹ️ SQLite fallback initialization error: {e}")

    @staticmethod
    def get_state(profile_id: str, db: Optional[Session] = None, has_supabase: bool = False) -> Dict[str, Any]:
        """Fetch full profile state (routines, weights, history, active session)."""
        routines = None
        weights_history = {}
        workout_history = []
        active_session = None

        if has_supabase and db is not None:
            try:
                from backend.models import RoutineModel, WorkoutLogModel, ProfileDataModel
                r_models = db.query(RoutineModel).filter(RoutineModel.user_id == profile_id).all()
                if r_models:
                    routines = [{"id": r.id, "name": r.name, "days": r.days_data} for r in r_models]

                w_models = db.query(WorkoutLogModel).filter(WorkoutLogModel.user_id == profile_id).order_by(WorkoutLogModel.created_at.desc()).all()
                if w_models:
                    workout_history = [{
                        "id": w.id,
                        "dayName": w.day_name,
                        "dateFormatted": w.date_formatted,
                        "timeFormatted": w.time_formatted,
                        "durationSeconds": w.duration_seconds,
                        "totalSets": w.total_sets,
                        "totalVolumeKg": w.total_volume_kg,
                        "detailedExercises": w.detailed_exercises
                    } for w in w_models]

                p_data = db.query(ProfileDataModel).filter(ProfileDataModel.profile_id == profile_id).first()
                if p_data:
                    if not routines and p_data.routines_json:
                        routines = json.loads(p_data.routines_json)
                    weights_history = json.loads(p_data.weights_json) if p_data.weights_json else {}
                    if not workout_history and p_data.history_json:
                        workout_history = json.loads(p_data.history_json)
                    active_session = json.loads(p_data.active_session_json) if p_data.active_session_json else None

                if routines is not None or len(workout_history) > 0 or p_data:
                    return {
                        "routines": routines,
                        "weightsHistory": weights_history,
                        "workoutHistory": workout_history,
                        "activeSession": active_session,
                        "source": "supabase_primary"
                    }
            except Exception as e:
                print(f"⚠️ Lectura Supabase no disponible (Usando SQLite fallback): {e}")

        # SQLite Fallback
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT routines_json, weights_json, history_json, active_session_json FROM profile_data WHERE profile_id = ?", (profile_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            routines = json.loads(row[0]) if row[0] else None
            weights_history = json.loads(row[1]) if row[1] else {}
            workout_history = json.loads(row[2]) if row[2] else []
            active_session = json.loads(row[3]) if row[3] else None

        return {
            "routines": routines,
            "weightsHistory": weights_history,
            "workoutHistory": workout_history,
            "activeSession": active_session,
            "source": "sqlite_fallback"
        }

    @staticmethod
    def sync_state(profile_id: str, payload: Any, db: Optional[Session] = None, has_supabase: bool = False) -> Dict[str, Any]:
        """Synchronize profile state to primary or fallback database."""
        routines_str = json.dumps(payload.routines) if payload.routines is not None else None
        weights_str = json.dumps(payload.weightsHistory) if payload.weightsHistory is not None else None
        history_str = json.dumps(payload.workoutHistory) if payload.workoutHistory is not None else None
        active_str = json.dumps(payload.activeSession) if payload.activeSession is not None else None

        supabase_success = False

        if has_supabase and db is not None:
            try:
                from backend.models import RoutineModel, WorkoutLogModel, ProfileDataModel
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
                supabase_success = True
            except Exception as e:
                print(f"⚠️ Error sincronizando a Supabase (Respaldo SQLite activo): {e}")
                db.rollback()

        # Write to SQLite fallback only if Supabase failed or is unavailable (KISS / DRY)
        if not supabase_success:
            try:
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO profile_data (profile_id, routines_json, weights_json, history_json, active_session_json, updated_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (profile_id, routines_str, weights_str, history_str, active_str))
                conn.commit()
                conn.close()
            except Exception as e:
                print(f"ℹ️ SQLite sync fallback error: {e}")

        return {
            "status": "synced",
            "primary_database": "supabase" if supabase_success else "sqlite_fallback",
            "profile_id": profile_id
        }
