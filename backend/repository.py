import json
import os
import sqlite3
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.join(BASE_DIR, "gymtracker.db")

MUSCLEWIKI_MAP = {
    'Pierna': 'https://musclewiki.com/exercises/male/quads',
    'Pectoral': 'https://musclewiki.com/exercises/male/chest',
    'Espalda': 'https://musclewiki.com/exercises/male/lats',
    'Hombro': 'https://musclewiki.com/exercises/male/shoulders',
    'Bíceps': 'https://musclewiki.com/exercises/male/biceps',
    'Tríceps': 'https://musclewiki.com/exercises/male/triceps',
    'Abdomen': 'https://musclewiki.com/exercises/male/abs'
}

INITIAL_CATALOG_SEED = [
  # --- PIERNA ---
  { "id": 'p1', "category": 'Pierna', "name": 'Leg Curl Sentado', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'p2', "category": 'Pierna', "name": 'Leg Extensión', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'p3', "category": 'Pierna', "name": 'Leg Curl Horizontal', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'p4', "category": 'Pierna', "name": 'Prensa Para Pierna', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'p5', "category": 'Pierna', "name": 'Sentadilla Smith', "equipment": 'Máquina Smith', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'p6', "category": 'Pierna', "name": 'Sentadilla Barra Libre', "equipment": 'Barra', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'p7', "category": 'Pierna', "name": 'Peso Muerto', "equipment": 'Barra', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'p8', "category": 'Pierna', "name": 'Máquina de Abductores', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'p9', "category": 'Pierna', "name": 'Máquina de Aductores', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'p10', "category": 'Pierna', "name": 'Elevación de Talones', "equipment": 'Máquina/Mancuerna', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'p11', "category": 'Pierna', "name": 'Desplantes', "equipment": 'Mancuernas', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'p12', "category": 'Pierna', "name": 'Glúteo Polea', "equipment": 'Polea', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'p13', "category": 'Pierna', "name": 'Patada Atrás', "equipment": 'Polea/Libre', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'p14', "category": 'Pierna', "name": 'Puente', "equipment": 'Barra/Libre', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'p15', "category": 'Pierna', "name": 'Sentadilla Isométrica', "equipment": 'Peso Corporal', "defaultSets": 1, "defaultReps": 30, "unit": 'seg' },
  { "id": 'p16', "category": 'Pierna', "name": 'Peso Muerto Rumano', "equipment": 'Barra/Mancuerna', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'p17', "category": 'Pierna', "name": 'Patada de Glúteo en Máquina', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'p18', "category": 'Pierna', "name": 'Prensa Horizontal', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'p19', "category": 'Pierna', "name": 'Lunge con Pierna Trasera Elevada', "equipment": 'Mancuernas', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },

  # --- PECTORAL ---
  { "id": 'c1', "category": 'Pectoral', "name": 'Declinado', "equipment": 'Barra', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'c2', "category": 'Pectoral', "name": 'Lagartija', "equipment": 'Peso Corporal', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'c3', "category": 'Pectoral', "name": 'Press Vertical', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'c4', "category": 'Pectoral', "name": 'Press Inclinado con Barra', "equipment": 'Barra', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'c5', "category": 'Pectoral', "name": 'Press Plano', "equipment": 'Barra', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'c6', "category": 'Pectoral', "name": 'Cable Cruzado', "equipment": 'Polea', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'c7', "category": 'Pectoral', "name": 'Press Inclinado Mancuernas', "equipment": 'Mancuernas', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'c8', "category": 'Pectoral', "name": 'Pec Fly en Máquina', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'c9', "category": 'Pectoral', "name": 'Press Articulado', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'c10', "category": 'Pectoral', "name": 'Fondos Pectoral', "equipment": 'Paralelas', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },

  # --- ESPALDA ---
  { "id": 'b1', "category": 'Espalda', "name": 'Dominadas', "equipment": 'Barra Fija', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'b2', "category": 'Espalda', "name": 'Jalón Polea Alta', "equipment": 'Polea', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'b3', "category": 'Espalda', "name": 'Jalón Polea Cerrado', "equipment": 'Polea', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'b4', "category": 'Espalda', "name": 'Remo Máquina', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'b5', "category": 'Espalda', "name": 'Remo con Mancuerna', "equipment": 'Mancuerna', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'b6', "category": 'Espalda', "name": 'Jalón con Máquina', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'b7', "category": 'Espalda', "name": 'Remo con Barra', "equipment": 'Barra', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'b8', "category": 'Espalda', "name": 'Hiper Extension', "equipment": 'Banco Romano', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'b9', "category": 'Espalda', "name": 'Remo Articulado', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'b10', "category": 'Espalda', "name": 'Lat Pulldown', "equipment": 'Polea', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },

  # --- HOMBRO ---
  { "id": 's1', "category": 'Hombro', "name": 'Hombro Press', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 's2', "category": 'Hombro', "name": 'Elevaciones Laterales en Polea', "equipment": 'Polea', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 's3', "category": 'Hombro', "name": 'Press Militar', "equipment": 'Barra', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 's4', "category": 'Hombro', "name": 'Press Tras Nuca Barra', "equipment": 'Barra', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 's5', "category": 'Hombro', "name": 'Elevación Late Manc.', "equipment": 'Mancuernas', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 's6', "category": 'Hombro', "name": 'Elevaciones Frontales Manc.', "equipment": 'Mancuernas', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 's7', "category": 'Hombro', "name": 'Remo de Pie', "equipment": 'Barra/Polea', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 's8', "category": 'Hombro', "name": 'Deltoides Posteriores Mancuernas', "equipment": 'Mancuernas', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 's9', "category": 'Hombro', "name": 'Press Mancuerna', "equipment": 'Mancuernas', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 's10', "category": 'Hombro', "name": 'Encogimiento Hombros Mancuerna', "equipment": 'Mancuernas', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 's11', "category": 'Hombro', "name": 'Remo en Banco Inclinado', "equipment": 'Mancuernas', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },

  # --- BÍCEPS ---
  { "id": 'bi1', "category": 'Bíceps', "name": 'Predicador en Máquina', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'bi2', "category": 'Bíceps', "name": 'Bíceps Barra Agarre Abierto', "equipment": 'Barra Z', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'bi3', "category": 'Bíceps', "name": 'Bíceps Mancuerna', "equipment": 'Mancuernas', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'bi4', "category": 'Bíceps', "name": 'Bíceps Polea', "equipment": 'Polea', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'bi5', "category": 'Bíceps', "name": 'Curl Concentrado', "equipment": 'Mancuerna', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'bi6', "category": 'Bíceps', "name": 'Dominadas en Supinación', "equipment": 'Barra Fija', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'bi7', "category": 'Bíceps', "name": 'Martillos', "equipment": 'Mancuernas', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'bi8', "category": 'Bíceps', "name": 'Bíceps en Polea Alta', "equipment": 'Polea', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'bi9', "category": 'Bíceps', "name": 'Antebrazo Barra o Mancuerna', "equipment": 'Barra/Mancuerna', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'bi10', "category": 'Bíceps', "name": 'Bíceps Predicador', "equipment": 'Banco Scott', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },

  # --- TRÍCEPS ---
  { "id": 'tr1', "category": 'Tríceps', "name": 'Patada Tríceps con Polea', "equipment": 'Polea', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'tr2', "category": 'Tríceps', "name": 'Press Francés', "equipment": 'Barra Z', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'tr3', "category": 'Tríceps', "name": 'Copa Tríceps', "equipment": 'Mancuerna', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'tr4', "category": 'Tríceps', "name": 'Press Cerrado', "equipment": 'Barra', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'tr5', "category": 'Tríceps', "name": 'Fondos Tríceps', "equipment": 'Paralelas', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'tr6', "category": 'Tríceps', "name": 'Patada de Tríceps', "equipment": 'Mancuerna', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'tr7', "category": 'Tríceps', "name": 'Jalón con Cuerda', "equipment": 'Polea', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'tr8', "category": 'Tríceps', "name": 'Jalón con Barra', "equipment": 'Polea', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'tr9', "category": 'Tríceps', "name": 'Fondos en Máquina', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },
  { "id": 'tr10', "category": 'Tríceps', "name": 'Press Francés en Máquina', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 12, "unit": 'reps' },

  # --- ABDOMEN ---
  { "id": 'ab1', "category": 'Abdomen', "name": 'Plancha Estática', "equipment": 'Peso Corporal', "defaultSets": 1, "defaultReps": 30, "unit": 'seg' },
  { "id": 'ab2', "category": 'Abdomen', "name": 'Abdominal Banco', "equipment": 'Banco Declinado', "defaultSets": 1, "defaultReps": 20, "unit": 'reps' },
  { "id": 'ab3', "category": 'Abdomen', "name": 'Abdominal Paralelas', "equipment": 'Paralelas', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'ab4', "category": 'Abdomen', "name": 'Oblicuos', "equipment": 'Peso Corporal', "defaultSets": 1, "defaultReps": 20, "unit": 'reps' },
  { "id": 'ab5', "category": 'Abdomen', "name": 'Rueda Abdominal', "equipment": 'Rueda', "defaultSets": 1, "defaultReps": 15, "unit": 'reps' },
  { "id": 'ab6', "category": 'Abdomen', "name": 'Encogimiento Tronco y Piernas', "equipment": 'Peso Corporal', "defaultSets": 1, "defaultReps": 20, "unit": 'reps' },
  { "id": 'ab7', "category": 'Abdomen', "name": 'Crunch Fitball', "equipment": 'Fitball', "defaultSets": 1, "defaultReps": 20, "unit": 'reps' },
  { "id": 'ab8', "category": 'Abdomen', "name": 'Stability Crunches', "equipment": 'Fitball', "defaultSets": 1, "defaultReps": 20, "unit": 'reps' },
  { "id": 'ab9', "category": 'Abdomen', "name": 'Crunch en Máquina', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 20, "unit": 'reps' },
  { "id": 'ab10', "category": 'Abdomen', "name": 'Abcoaster', "equipment": 'Máquina', "defaultSets": 1, "defaultReps": 20, "unit": 'reps' }
]

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
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS exercises (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    equipment TEXT DEFAULT 'General',
                    default_sets INTEGER DEFAULT 1,
                    default_reps INTEGER DEFAULT 12,
                    unit TEXT DEFAULT 'reps',
                    image_url TEXT,
                    musclewiki_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("SELECT COUNT(*) FROM profiles")
            if cursor.fetchone()[0] == 0:
                cursor.execute("INSERT INTO profiles VALUES ('prof_guest', 'Invitado / Anónimo', '👤')")

            # Seed exercises in SQLite if empty
            cursor.execute("SELECT COUNT(*) FROM exercises")
            if cursor.fetchone()[0] == 0:
                for item in INITIAL_CATALOG_SEED:
                    mw_url = MUSCLEWIKI_MAP.get(item['category'], f"https://musclewiki.com/search?q={item['name']}")
                    cursor.execute("""
                        INSERT INTO exercises (id, name, category, equipment, default_sets, default_reps, unit, image_url, musclewiki_url)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (item['id'], item['name'], item['category'], item['equipment'], item['defaultSets'], item['defaultReps'], item['unit'], None, mw_url))

            conn.commit()
            conn.close()
        except Exception as e:
            print(f"ℹ️ SQLite fallback initialization error: {e}")

    @staticmethod
    def get_exercises(db: Optional[Session] = None, has_supabase: bool = False) -> List[Dict[str, Any]]:
        """Fetch all exercises from database (Supabase or SQLite)."""
        if has_supabase and db is not None:
            try:
                from backend.models import ExerciseModel
                ex_models = db.query(ExerciseModel).order_by(ExerciseModel.category, ExerciseModel.name).all()
                if not ex_models:
                    # Seed Supabase PostgreSQL if empty
                    for item in INITIAL_CATALOG_SEED:
                        mw_url = MUSCLEWIKI_MAP.get(item['category'], f"https://musclewiki.com/search?q={item['name']}")
                        m = ExerciseModel(
                            id=item['id'], name=item['name'], category=item['category'],
                            equipment=item['equipment'], default_sets=item['defaultSets'],
                            default_reps=item['defaultReps'], weight_unit=item['unit'],
                            musclewiki_url=mw_url
                        )
                        db.add(m)
                    db.commit()
                    ex_models = db.query(ExerciseModel).order_by(ExerciseModel.category, ExerciseModel.name).all()

                return [{
                    "id": ex.id,
                    "name": ex.name,
                    "category": ex.category,
                    "equipment": ex.equipment or "General",
                    "defaultSets": ex.default_sets or 1,
                    "defaultReps": ex.default_reps or 12,
                    "unit": ex.weight_unit or "reps",
                    "imageUrl": ex.image_url,
                    "musclewikiUrl": ex.musclewiki_url or MUSCLEWIKI_MAP.get(ex.category, f"https://musclewiki.com/search?q={ex.name}")
                } for ex in ex_models]
            except Exception as e:
                print(f"⚠️ Error leyendo ejercicios de Supabase: {e}")

        # SQLite Fallback
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, category, equipment, default_sets, default_reps, unit, image_url, musclewiki_url FROM exercises ORDER BY category, name")
        rows = cursor.fetchall()
        conn.close()

        return [{
            "id": r[0],
            "name": r[1],
            "category": r[2],
            "equipment": r[3] or "General",
            "defaultSets": r[4] or 1,
            "defaultReps": r[5] or 12,
            "unit": r[6] or "reps",
            "imageUrl": r[7],
            "musclewikiUrl": r[8] or MUSCLEWIKI_MAP.get(r[2], f"https://musclewiki.com/search?q={r[1]}")
        } for r in rows]

    @staticmethod
    def save_exercise(ex_dict: Dict[str, Any], db: Optional[Session] = None, has_supabase: bool = False) -> Dict[str, Any]:
        """Create or update a custom exercise in catalog."""
        ex_id = ex_dict.get('id') or ('ex_' + str(int(os.urandom(4).hex(), 16)))
        name = ex_dict.get('name', 'Nuevo Ejercicio')
        category = ex_dict.get('category', 'Pierna')
        equipment = ex_dict.get('equipment', 'General')
        default_sets = ex_dict.get('defaultSets', 1)
        default_reps = ex_dict.get('defaultReps', 12)
        unit = ex_dict.get('unit', 'reps')
        mw_url = ex_dict.get('musclewikiUrl') or MUSCLEWIKI_MAP.get(category, f"https://musclewiki.com/search?q={name}")

        if has_supabase and db is not None:
            try:
                from backend.models import ExerciseModel
                ex_m = db.query(ExerciseModel).filter(ExerciseModel.id == ex_id).first()
                if not ex_m:
                    ex_m = ExerciseModel(
                        id=ex_id, name=name, category=category, equipment=equipment,
                        default_sets=default_sets, default_reps=default_reps, weight_unit=unit,
                        musclewiki_url=mw_url
                    )
                    db.add(ex_m)
                else:
                    ex_m.name = name
                    ex_m.category = category
                    ex_m.equipment = equipment
                    ex_m.default_sets = default_sets
                    ex_m.default_reps = default_reps
                    ex_m.weight_unit = unit
                    ex_m.musclewiki_url = mw_url
                db.commit()
            except Exception as e:
                print(f"⚠️ Error guardando ejercicio en Supabase: {e}")
                db.rollback()

        try:
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO exercises (id, name, category, equipment, default_sets, default_reps, unit, musclewiki_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (ex_id, name, category, equipment, default_sets, default_reps, unit, mw_url))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"ℹ️ SQLite save exercise error: {e}")

        return {
            "id": ex_id, "name": name, "category": category, "equipment": equipment,
            "defaultSets": default_sets, "defaultReps": default_reps, "unit": unit, "musclewikiUrl": mw_url
        }

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
                p_data = db.query(ProfileDataModel).filter(ProfileDataModel.profile_id == profile_id).first()
                r_models = db.query(RoutineModel).filter(RoutineModel.user_id == profile_id).all()

                if p_data and p_data.routines_json is not None:
                    routines = json.loads(p_data.routines_json)
                elif r_models:
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

                if p_data:
                    weights_history = json.loads(p_data.weights_json) if p_data.weights_json else {}
                    if not workout_history and p_data.history_json:
                        workout_history = json.loads(p_data.history_json)
                    active_session = json.loads(p_data.active_session_json) if p_data.active_session_json else None

                if routines is not None or len(workout_history) > 0 or p_data:
                    return {
                        "routines": routines if routines is not None else [],
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
            routines = json.loads(row[0]) if row[0] is not None else None
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
                    # Delete routines from DB table if they are no longer in payload.routines (handles routine deletion)
                    active_ids = {r.get('id') for r in payload.routines if isinstance(r, dict) and r.get('id')}
                    existing_routines = db.query(RoutineModel).filter(RoutineModel.user_id == profile_id).all()
                    for er in existing_routines:
                        if er.id not in active_ids:
                            db.delete(er)

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

                if payload.weightsHistory is not None:
                    p_data.weights_json = weights_str
                if payload.workoutHistory is not None:
                    p_data.history_json = history_str
                if payload.activeSession is not None:
                    p_data.active_session_json = active_str

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
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            if name and avatar:
                cursor.execute("UPDATE profiles SET name = ?, avatar = ? WHERE id = ?", (name, avatar, user_id))
            elif name:
                cursor.execute("UPDATE profiles SET name = ? WHERE id = ?", (name, user_id))
            elif avatar:
                cursor.execute("UPDATE profiles SET avatar = ? WHERE id = ?", (avatar, user_id))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"ℹ️ SQLite profile update error: {e}")

        return {"status": "updated", "user": updated_user}
