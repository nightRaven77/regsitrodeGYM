import hashlib
import json
import os
import sqlite3
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.auth import get_password_hash, verify_password, create_access_token
from backend.seed_data import BACKEND_GUIDE_MAPPING, INITIAL_CATALOG_SEED

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
            with sqlite3.connect(DB_FILE) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        email TEXT UNIQUE NOT NULL,
                        hashed_password TEXT NOT NULL,
                        name TEXT NOT NULL,
                        avatar TEXT DEFAULT '👤',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
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
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS exercises (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        category TEXT NOT NULL,
                        equipment TEXT DEFAULT 'General',
                        default_sets INTEGER DEFAULT 3,
                        default_reps INTEGER DEFAULT 12,
                        unit TEXT DEFAULT 'reps',
                        image_url TEXT,
                        musclewiki_url TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Ensure SQLite schema migration if table already existed without new columns
                cursor.execute("PRAGMA table_info(exercises)")
                columns = [col[1] for col in cursor.fetchall()]
                if 'unit' not in columns:
                    cursor.execute("ALTER TABLE exercises ADD COLUMN unit TEXT DEFAULT 'reps'")
                if 'equipment' not in columns:
                    cursor.execute("ALTER TABLE exercises ADD COLUMN equipment TEXT DEFAULT 'General'")
                if 'musclewiki_url' not in columns:
                    cursor.execute("ALTER TABLE exercises ADD COLUMN musclewiki_url TEXT")

                cursor.execute("SELECT COUNT(*) FROM profiles")
                if cursor.fetchone()[0] == 0:
                    cursor.execute("INSERT INTO profiles VALUES ('prof_guest', 'Invitado / Anónimo', '👤')")

                # Seed exercises in SQLite if empty
                cursor.execute("SELECT COUNT(*) FROM exercises")
                if cursor.fetchone()[0] == 0:
                    for item in INITIAL_CATALOG_SEED:
                        cursor.execute("""
                            INSERT INTO exercises (id, name, category, equipment, default_sets, default_reps, unit, image_url)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, (item['id'], item['name'], item['category'], item['equipment'], item['defaultSets'], item['defaultReps'], item['unit'], None))

                conn.commit()
        except Exception as e:
            print(f"ℹ️ SQLite fallback initialization error: {e}")

    @staticmethod
    def register_user(email: str, password: str, name: str, avatar: str = "👤", db: Optional[Session] = None, has_supabase: bool = False) -> Dict[str, Any]:
        """Register user persistently in Supabase PostgreSQL or SQLite fallback DB."""
        email_clean = email.lower().strip()
        u_id = "prof_" + hashlib.md5(email_clean.encode('utf-8')).hexdigest()[:10]
        pwd_hash = get_password_hash(password)

        if has_supabase and db is not None:
            try:
                from backend.models import UserModel
                existing = db.query(UserModel).filter(UserModel.email == email_clean).first()
                if existing:
                    raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")

                user = UserModel(
                    id=u_id,
                    email=email_clean,
                    hashed_password=pwd_hash,
                    name=name,
                    avatar=avatar
                )
                db.add(user)
                db.commit()
                db.refresh(user)

                token = create_access_token({"sub": user.id, "email": user.email})
                return {
                    "token": token,
                    "user": {"id": user.id, "name": user.name, "email": user.email, "avatar": user.avatar}
                }
            except HTTPException:
                raise
            except Exception as e:
                print(f"⚠️ Error en registro Supabase (Usando SQLite fallback): {e}")
                db.rollback()

        # SQLite Fallback Persistent Registration
        try:
            with sqlite3.connect(DB_FILE) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email_clean,))
                if cursor.fetchone():
                    raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")

                cursor.execute(
                    "INSERT INTO users (id, email, hashed_password, name, avatar) VALUES (?, ?, ?, ?, ?)",
                    (u_id, email_clean, pwd_hash, name, avatar)
                )
                cursor.execute(
                    "INSERT OR REPLACE INTO profiles (id, name, avatar) VALUES (?, ?, ?)",
                    (u_id, name, avatar)
                )
                conn.commit()
        except HTTPException:
            raise
        except Exception as e:
            print(f"ℹ️ SQLite register error: {e}")

        token = create_access_token({"sub": u_id, "email": email_clean})
        return {
            "token": token,
            "user": {"id": u_id, "name": name, "email": email_clean, "avatar": avatar}
        }

    @staticmethod
    def authenticate_user(email: str, password: str, db: Optional[Session] = None, has_supabase: bool = False) -> Dict[str, Any]:
        """Authenticate user persistently against Supabase PostgreSQL or SQLite fallback DB."""
        email_clean = email.lower().strip()

        if has_supabase and db is not None:
            try:
                from backend.models import UserModel
                user = db.query(UserModel).filter(UserModel.email == email_clean).first()
                if user and verify_password(password, user.hashed_password):
                    token = create_access_token({"sub": user.id, "email": user.email})
                    return {
                        "token": token,
                        "user": {"id": user.id, "name": user.name, "email": user.email, "avatar": user.avatar}
                    }
            except Exception as e:
                print(f"⚠️ Error auth Supabase (Usando SQLite fallback): {e}")

        # SQLite Fallback Persistent Login
        try:
            with sqlite3.connect(DB_FILE) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT id, email, hashed_password, name, avatar FROM users WHERE LOWER(email) = ?",
                    (email_clean,)
                )
                row = cursor.fetchone()

            if row and verify_password(password, row[2]):
                token = create_access_token({"sub": row[0], "email": row[1]})
                return {
                    "token": token,
                    "user": {"id": row[0], "name": row[3], "email": row[1], "avatar": row[4]}
                }
        except Exception as e:
            print(f"ℹ️ SQLite login error: {e}")

        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos.")

    @staticmethod
    def get_exercises(db: Optional[Session] = None, has_supabase: bool = False) -> List[Dict[str, Any]]:
        """Fetch all exercises from database (Supabase or SQLite)."""
        if has_supabase and db is not None:
            try:
                from backend.models import ExerciseModel
                ex_models = db.query(ExerciseModel).order_by(ExerciseModel.category, ExerciseModel.name).all()
                if not ex_models:
                    for item in INITIAL_CATALOG_SEED:
                        m = ExerciseModel(
                            id=item['id'], name=item['name'], category=item['category'],
                            equipment=item['equipment'], default_sets=item['defaultSets'],
                            default_reps=item['defaultReps'], weight_unit=item['unit']
                        )
                        db.add(m)
                    db.commit()
                    ex_models = db.query(ExerciseModel).order_by(ExerciseModel.category, ExerciseModel.name).all()

                return [{
                    "id": ex.id,
                    "name": ex.name,
                    "category": ex.category,
                    "equipment": ex.equipment or "General",
                    "defaultSets": ex.default_sets or 3,
                    "defaultReps": ex.default_reps or 12,
                    "unit": ex.weight_unit if ex.weight_unit in ("reps", "seg", "min") else "reps",
                    "imageUrl": ex.image_url,
                    "guideSlug": BACKEND_GUIDE_MAPPING.get(ex.id, {}).get("guideSlug"),
                    "alternatives": BACKEND_GUIDE_MAPPING.get(ex.id, {}).get("alternatives", [])
                } for ex in ex_models]
            except Exception as e:
                print(f"⚠️ Error leyendo ejercicios de Supabase: {e}")

        # SQLite Fallback
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, category, equipment, default_sets, default_reps, unit, image_url FROM exercises ORDER BY category, name")
            rows = cursor.fetchall()

        return [{
            "id": r[0],
            "name": r[1],
            "category": r[2],
            "equipment": r[3] or "General",
            "defaultSets": r[4] or 3,
            "defaultReps": r[5] or 12,
            "unit": r[6] or "reps",
            "imageUrl": r[7],
            "guideSlug": BACKEND_GUIDE_MAPPING.get(r[0], {}).get("guideSlug"),
            "alternatives": BACKEND_GUIDE_MAPPING.get(r[0], {}).get("alternatives", [])
        } for r in rows]

    @staticmethod
    def save_exercise(ex_dict: Dict[str, Any], db: Optional[Session] = None, has_supabase: bool = False) -> Dict[str, Any]:
        """Create or update a custom exercise in catalog."""
        ex_id = ex_dict.get('id') or ('ex_' + str(int(os.urandom(4).hex(), 16)))
        name = ex_dict.get('name', 'Nuevo Ejercicio')
        category = ex_dict.get('category', 'Pierna')
        equipment = ex_dict.get('equipment', 'General')
        default_sets = ex_dict.get('defaultSets', 3)
        default_reps = ex_dict.get('defaultReps', 12)
        unit = ex_dict.get('unit', 'reps')

        if has_supabase and db is not None:
            try:
                from backend.models import ExerciseModel
                ex_m = db.query(ExerciseModel).filter(ExerciseModel.id == ex_id).first()
                if not ex_m:
                    ex_m = ExerciseModel(
                        id=ex_id, name=name, category=category, equipment=equipment,
                        default_sets=default_sets, default_reps=default_reps, weight_unit=unit
                    )
                    db.add(ex_m)
                else:
                    ex_m.name = name
                    ex_m.category = category
                    ex_m.equipment = equipment
                    ex_m.default_sets = default_sets
                    ex_m.default_reps = default_reps
                    ex_m.weight_unit = unit
                db.commit()
            except Exception as e:
                print(f"⚠️ Error guardando ejercicio en Supabase: {e}")
                db.rollback()

        try:
            with sqlite3.connect(DB_FILE) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO exercises (id, name, category, equipment, default_sets, default_reps, unit)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (ex_id, name, category, equipment, default_sets, default_reps, unit))
                conn.commit()
        except Exception as e:
            print(f"ℹ️ SQLite save exercise error: {e}")

        return {
            "id": ex_id, "name": name, "category": category, "equipment": equipment,
            "defaultSets": default_sets, "defaultReps": default_reps, "unit": unit
        }

    @staticmethod
    def get_state(profile_id: str, db: Optional[Session] = None, has_supabase: bool = False) -> Dict[str, Any]:
        """Fetch full profile state (routines, weights, history, active session)."""
        routines = None
        weights_history = {}
        workout_history = []
        active_session = None
        updated_at_iso = None

        if has_supabase and db is not None:
            try:
                from backend.models import RoutineModel, WorkoutLogModel, ProfileDataModel
                p_data = db.query(ProfileDataModel).filter(ProfileDataModel.profile_id == profile_id).first()
                r_models = db.query(RoutineModel).filter(RoutineModel.user_id == profile_id).all()

                if p_data and p_data.routines_json is not None:
                    routines = json.loads(p_data.routines_json)
                elif r_models:
                    routines = [{"id": r.id, "name": r.name, "days": r.days_data} for r in r_models]

                w_models = (
                    db.query(WorkoutLogModel)
                    .filter(WorkoutLogModel.user_id == profile_id)
                    .order_by(WorkoutLogModel.created_at.desc())
                    .all()
                )
                if w_models:
                    workout_history = [{
                        "id": w.id,
                        "dayName": w.day_name,
                        "dateFormatted": w.date_formatted,
                        "timeFormatted": w.time_formatted,
                        "durationSeconds": w.duration_seconds,
                        "totalSets": w.total_sets,
                        "totalVolumeKg": w.total_volume_kg,
                        "detailedExercises": w.detailed_exercises,
                        "completedAtIso": w.created_at.isoformat() if w.created_at else None
                    } for w in w_models]

                if p_data:
                    weights_history = json.loads(p_data.weights_json) if p_data.weights_json else {}
                    if not workout_history and p_data.history_json:
                        workout_history = json.loads(p_data.history_json)
                    active_session = json.loads(p_data.active_session_json) if p_data.active_session_json else None
                    if p_data.updated_at:
                        updated_at_iso = p_data.updated_at.isoformat()

                if routines is not None or len(workout_history) > 0 or p_data:
                    return {
                        "routines": routines if routines is not None else [],
                        "weightsHistory": weights_history,
                        "workoutHistory": workout_history,
                        "activeSession": active_session,
                        "updatedAt": updated_at_iso,
                        "source": "supabase_primary"
                    }
            except Exception as e:
                print(f"⚠️ Lectura Supabase no disponible (Usando SQLite fallback): {e}")

        # SQLite Fallback
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT routines_json, weights_json, history_json, active_session_json, updated_at FROM profile_data WHERE profile_id = ?",
                (profile_id,)
            )
            row = cursor.fetchone()

        if row:
            routines = json.loads(row[0]) if row[0] is not None else None
            weights_history = json.loads(row[1]) if row[1] else {}
            workout_history = json.loads(row[2]) if row[2] else []
            active_session = json.loads(row[3]) if row[3] else None
            updated_at_iso = row[4]

        return {
            "routines": routines,
            "weightsHistory": weights_history,
            "workoutHistory": workout_history,
            "activeSession": active_session,
            "updatedAt": updated_at_iso,
            "source": "sqlite_fallback"
        }

    @staticmethod
    def sync_state(profile_id: str, payload: Any, db: Optional[Session] = None, has_supabase: bool = False) -> Dict[str, Any]:
        """Synchronize profile state to primary or fallback database without N+1 queries."""
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
                    existing_routines = db.query(RoutineModel).filter(RoutineModel.user_id == profile_id).all()
                    existing_routines_map = {er.id: er for er in existing_routines}
                    active_ids = {r.get('id') for r in payload.routines if isinstance(r, dict) and r.get('id')}

                    for er_id, er_obj in existing_routines_map.items():
                        if er_id not in active_ids:
                            db.delete(er_obj)

                    for r in payload.routines:
                        r_id = r.get('id') if isinstance(r, dict) else None
                        if r_id:
                            r_model = existing_routines_map.get(r_id)
                            if not r_model:
                                r_model = db.query(RoutineModel).filter(RoutineModel.id == r_id).first()
                            if not r_model:
                                r_model = RoutineModel(
                                    id=r_id,
                                    user_id=profile_id,
                                    name=r.get('name', 'Rutina'),
                                    days_data=r.get('days', [])
                                )
                                db.add(r_model)
                            else:
                                r_model.name = r.get('name', r_model.name)
                                r_model.days_data = r.get('days', r_model.days_data)

                if payload.weightsHistory is not None:
                    p_data.weights_json = weights_str

                if payload.workoutHistory is not None:
                    p_data.history_json = history_str
                    existing_logs = db.query(WorkoutLogModel).filter(WorkoutLogModel.user_id == profile_id).all()
                    existing_logs_map = {el.id: el for el in existing_logs}
                    active_history_ids = {w.get('id') for w in payload.workoutHistory if isinstance(w, dict) and w.get('id')}

                    for el_id, el_obj in existing_logs_map.items():
                        if el_id not in active_history_ids:
                            db.delete(el_obj)

                    for w in payload.workoutHistory:
                        w_id = w.get('id') if isinstance(w, dict) else None
                        if w_id and w_id not in existing_logs_map:
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

                p_data.active_session_json = active_str
                p_data.updated_at = datetime.now(timezone.utc)

                db.commit()
                supabase_success = True
            except Exception as e:
                print(f"⚠️ Error sincronizando a Supabase (Respaldo SQLite activo): {e}")
                db.rollback()

        if not supabase_success:
            try:
                with sqlite3.connect(DB_FILE) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT OR REPLACE INTO profile_data (profile_id, routines_json, weights_json, history_json, active_session_json, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (profile_id, routines_str, weights_str, history_str, active_str, datetime.now(timezone.utc).isoformat()))
                    conn.commit()
            except Exception as e:
                print(f"ℹ️ SQLite sync fallback error: {e}")

        return {
            "status": "synced",
            "primary_database": "supabase" if supabase_success else "sqlite_fallback",
            "profile_id": profile_id,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }

    @staticmethod
    def delete_workout_log(profile_id: str, log_id: str, db: Optional[Session] = None, has_supabase: bool = False) -> Dict[str, Any]:
        """Delete a workout log entry from Supabase PostgreSQL and SQLite fallback DB."""
        if has_supabase and db is not None:
            try:
                from backend.models import WorkoutLogModel, ProfileDataModel
                w_model = db.query(WorkoutLogModel).filter(
                    WorkoutLogModel.id == log_id, WorkoutLogModel.user_id == profile_id
                ).first()
                if w_model:
                    db.delete(w_model)

                p_data = db.query(ProfileDataModel).filter(ProfileDataModel.profile_id == profile_id).first()
                if p_data and p_data.history_json:
                    history = json.loads(p_data.history_json)
                    updated_history = [h for h in history if isinstance(h, dict) and h.get('id') != log_id]
                    p_data.history_json = json.dumps(updated_history)

                db.commit()
            except Exception as e:
                print(f"⚠️ Error borrando historial de Supabase: {e}")
                db.rollback()

        try:
            with sqlite3.connect(DB_FILE) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT history_json FROM profile_data WHERE profile_id = ?", (profile_id,))
                row = cursor.fetchone()
                if row and row[0]:
                    history = json.loads(row[0])
                    updated_history = [h for h in history if isinstance(h, dict) and h.get('id') != log_id]
                    cursor.execute(
                        "UPDATE profile_data SET history_json = ?, updated_at = ? WHERE profile_id = ?",
                        (json.dumps(updated_history), datetime.now(timezone.utc).isoformat(), profile_id)
                    )
                    conn.commit()
        except Exception as e:
            print(f"ℹ️ SQLite delete history error: {e}")

        return {"status": "deleted", "id": log_id}

    @staticmethod
    def update_workout_log(profile_id: str, log_id: str, updated_record: Dict[str, Any], db: Optional[Session] = None, has_supabase: bool = False) -> Dict[str, Any]:
        """Update a workout log entry in Supabase PostgreSQL and SQLite fallback DB."""
        if has_supabase and db is not None:
            try:
                from backend.models import WorkoutLogModel, ProfileDataModel
                w_model = db.query(WorkoutLogModel).filter(
                    WorkoutLogModel.id == log_id, WorkoutLogModel.user_id == profile_id
                ).first()
                if w_model:
                    w_model.day_name = updated_record.get('dayName', w_model.day_name)
                    w_model.date_formatted = updated_record.get('dateFormatted', w_model.date_formatted)
                    w_model.time_formatted = updated_record.get('timeFormatted', w_model.time_formatted)
                    w_model.duration_seconds = updated_record.get('durationSeconds', w_model.duration_seconds)
                    w_model.total_sets = updated_record.get('totalSets', w_model.total_sets)
                    w_model.total_volume_kg = updated_record.get('totalVolumeKg', w_model.total_volume_kg)
                    w_model.detailed_exercises = updated_record.get('detailedExercises', w_model.detailed_exercises)

                p_data = db.query(ProfileDataModel).filter(ProfileDataModel.profile_id == profile_id).first()
                if p_data and p_data.history_json:
                    history = json.loads(p_data.history_json)
                    updated_history = [updated_record if (isinstance(h, dict) and h.get('id') == log_id) else h for h in history]
                    p_data.history_json = json.dumps(updated_history)

                db.commit()
            except Exception as e:
                print(f"⚠️ Error actualizando historial en Supabase: {e}")
                db.rollback()

        try:
            with sqlite3.connect(DB_FILE) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT history_json FROM profile_data WHERE profile_id = ?", (profile_id,))
                row = cursor.fetchone()
                if row and row[0]:
                    history = json.loads(row[0])
                    updated_history = [updated_record if (isinstance(h, dict) and h.get('id') == log_id) else h for h in history]
                    cursor.execute(
                        "UPDATE profile_data SET history_json = ?, updated_at = ? WHERE profile_id = ?",
                        (json.dumps(updated_history), datetime.now(timezone.utc).isoformat(), profile_id)
                    )
                    conn.commit()
        except Exception as e:
            print(f"ℹ️ SQLite update history error: {e}")

        return {"status": "updated", "id": log_id, "record": updated_record}

    @staticmethod
    def update_user_profile(user_id: str, name: Optional[str] = None, avatar: Optional[str] = None, db: Optional[Session] = None, has_supabase: bool = False) -> Dict[str, Any]:
        """Update user profile name and/or avatar in Supabase and SQLite fallback."""
        updated_user = {"id": user_id}

        if has_supabase and db is not None:
            try:
                from backend.models import UserModel
                user = db.query(UserModel).filter(UserModel.id == user_id).first()
                if user:
                    if name:
                        user.name = name
                    if avatar:
                        user.avatar = avatar
                    db.commit()
                    db.refresh(user)
                    updated_user = {"id": user.id, "name": user.name, "email": user.email, "avatar": user.avatar}
            except Exception as e:
                print(f"⚠️ Error actualizando perfil en Supabase: {e}")
                db.rollback()

        try:
            with sqlite3.connect(DB_FILE) as conn:
                cursor = conn.cursor()
                if name and avatar:
                    cursor.execute("UPDATE profiles SET name = ?, avatar = ? WHERE id = ?", (name, avatar, user_id))
                    cursor.execute("UPDATE users SET name = ?, avatar = ? WHERE id = ?", (name, avatar, user_id))
                elif name:
                    cursor.execute("UPDATE profiles SET name = ? WHERE id = ?", (name, user_id))
                    cursor.execute("UPDATE users SET name = ? WHERE id = ?", (name, user_id))
                elif avatar:
                    cursor.execute("UPDATE profiles SET avatar = ? WHERE id = ?", (avatar, user_id))
                    cursor.execute("UPDATE users SET avatar = ? WHERE id = ?", (avatar, user_id))
                conn.commit()
        except Exception as e:
            print(f"ℹ️ SQLite profile update error: {e}")

        return {"status": "updated", "user": updated_user}

    @staticmethod
    def ping_database(db: Optional[Session] = None, has_supabase: bool = False) -> Dict[str, Any]:
        """
        Executes a lightweight query (SELECT 1) on Supabase PostgreSQL or local SQLite
        to register database activity and prevent Supabase free tier inactivity auto-pause.
        """
        start_time = time.time()
        supabase_ping_ok = False
        details: Dict[str, Any] = {}

        if has_supabase and db is not None:
            try:
                res = db.execute(text("SELECT 1")).scalar()
                latency_ms = round((time.time() - start_time) * 1000, 2)
                supabase_ping_ok = (res == 1)
                details["supabase"] = {
                    "status": "connected" if supabase_ping_ok else "unexpected_result",
                    "latency_ms": latency_ms,
                    "target": "Supabase PostgreSQL"
                }
            except Exception as e:
                details["supabase"] = {
                    "status": "error",
                    "error": str(e)
                }

        # Check SQLite fallback as well
        try:
            with sqlite3.connect(DB_FILE) as conn:
                cur = conn.cursor()
                cur.execute("SELECT 1")
                cur.fetchone()
            details["sqlite"] = {"status": "connected"}
        except Exception as e:
            details["sqlite"] = {"status": "error", "error": str(e)}

        is_healthy = supabase_ping_ok or (not has_supabase and details.get("sqlite", {}).get("status") == "connected")

        return {
            "status": "online" if is_healthy else "degraded",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "keepalive_success": supabase_ping_ok or (not has_supabase),
            "primary_database": "Supabase PostgreSQL" if (has_supabase and supabase_ping_ok) else "SQLite Local Fallback",
            "details": details,
            "message": "🏓 Ping exitoso. Actividad registrada en base de datos." if is_healthy else "⚠️ Error al registrar ping en base de datos."
        }
