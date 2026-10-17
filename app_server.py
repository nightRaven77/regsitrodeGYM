import os
import asyncio
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from backend.repository import StorageRepository
from backend.schemas import (
    UserRegisterSchema,
    UserLoginSchema,
    UserProfileUpdateSchema,
    SyncPayload,
    ExerciseCreateSchema,
    PushSubscriptionSchema,
    RestPushScheduleSchema,
)
from backend.auth import get_current_user, verify_profile_access

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 1. Initialize SQLAlchemy / Supabase PostgreSQL if DATABASE_URL is configured
HAS_SUPABASE = False
get_db = None

try:
    from backend.database import engine, Base, SessionLocal, get_db as _get_db
    from backend.models import UserModel
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
            await asyncio.sleep(86400)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"⚠️ [Supabase Keepalive] Excepción en worker: {e}")
            await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and clean shutdown of background tasks."""
    keepalive_task = asyncio.create_task(auto_ping_background_worker())
    try:
        yield
    finally:
        keepalive_task.cancel()
        try:
            await keepalive_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="My Gym Tracker App API",
    version="2.1.0",
    lifespan=lifespan,
)

cors_origins_env = os.environ.get("CORS_ORIGINS", "*")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=(allowed_origins != ["*"]),
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- User & Profile Endpoints ---


@app.put("/api/user/profile/{user_id}")
def update_user_profile(
    user_id: str,
    payload: UserProfileUpdateSchema,
    db: Any = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    verify_profile_access(user_id, current_user)
    return StorageRepository.update_user_profile(
        user_id, name=payload.name, avatar=payload.avatar, db=db, has_supabase=HAS_SUPABASE
    )


@app.delete("/api/history/{profile_id}/{log_id}")
def delete_workout_history_log(
    profile_id: str,
    log_id: str,
    db: Any = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    verify_profile_access(profile_id, current_user)
    return StorageRepository.delete_workout_log(profile_id, log_id, db=db, has_supabase=HAS_SUPABASE)


@app.put("/api/history/{profile_id}/{log_id}")
def update_workout_history_log(
    profile_id: str,
    log_id: str,
    payload: Dict[str, Any],
    db: Any = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    verify_profile_access(profile_id, current_user)
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
        has_supabase=HAS_SUPABASE,
    )


@app.post("/api/auth/login")
def login_user(payload: UserLoginSchema, db: Any = Depends(get_db)):
    return StorageRepository.authenticate_user(
        email=payload.email,
        password=payload.password,
        db=db,
        has_supabase=HAS_SUPABASE,
    )


@app.get("/api/ping")
def ping_keepalive(db: Any = Depends(get_db)):
    """
    Keep-alive endpoint to register active database queries on Supabase PostgreSQL.
    Prevents Supabase free tier inactivity auto-pause (7-day threshold).
    """
    return StorageRepository.ping_database(db=db, has_supabase=HAS_SUPABASE)


@app.get("/api/health")
def health_check(check_db: bool = False, db: Any = Depends(get_db)):
    health_info = {
        "status": "online",
        "app": "My Gym Tracker App API v2.1",
        "primary_database": "Supabase PostgreSQL"
        if (HAS_SUPABASE and os.environ.get("DATABASE_URL"))
        else "SQLite Local Fallback",
    }
    if check_db:
        health_info["database_ping"] = StorageRepository.ping_database(db=db, has_supabase=HAS_SUPABASE)
    return health_info


# --- State Sync & Fetch Endpoints ---


@app.get("/api/state/{profile_id}")
def get_profile_state(
    profile_id: str,
    db: Any = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    verify_profile_access(profile_id, current_user)
    return StorageRepository.get_state(profile_id, db=db, has_supabase=HAS_SUPABASE)


@app.post("/api/sync/{profile_id}")
def sync_profile_state(
    profile_id: str,
    payload: SyncPayload,
    db: Any = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    verify_profile_access(profile_id, current_user)
    return StorageRepository.sync_state(profile_id, payload=payload, db=db, has_supabase=HAS_SUPABASE)


# --- Web Push Notifications for Rest Timers ---

PUSH_SUBSCRIPTIONS: Dict[str, Dict[str, Any]] = {}
SCHEDULED_REST_TASKS: Dict[str, asyncio.Task] = {}


@app.get("/api/push/vapid-public-key")
def get_vapid_public_key():
    """Returns VAPID public key if configured on server, plus local SW notification fallback support."""
    vapid_public_key = os.environ.get("VAPID_PUBLIC_KEY", "")
    return {
        "vapidPublicKey": vapid_public_key,
        "serverPushConfigured": bool(vapid_public_key and os.environ.get("VAPID_PRIVATE_KEY")),
        "serviceWorkerPushSupported": True,
    }


@app.post("/api/push/subscribe/{profile_id}")
def subscribe_push_notifications(
    profile_id: str,
    payload: PushSubscriptionSchema,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    verify_profile_access(profile_id, current_user)
    PUSH_SUBSCRIPTIONS[profile_id] = payload.model_dump()
    return {"status": "subscribed", "profile_id": profile_id}


async def _deliver_rest_webpush(profile_id: str, seconds: int, exercise_name: Optional[str] = None):
    try:
        await asyncio.sleep(seconds)
        sub = PUSH_SUBSCRIPTIONS.get(profile_id)
        vapid_private = os.environ.get("VAPID_PRIVATE_KEY")
        vapid_email = os.environ.get("VAPID_CLAIMS_EMAIL", "mailto:admin@gymtracker.local")
        if sub and vapid_private:
            try:
                import json
                from pywebpush import webpush  # type: ignore

                body_msg = (
                    f"Tu descanso para {exercise_name} ha terminado. ¡A darle con todo a la siguiente serie!"
                    if exercise_name
                    else "Tu tiempo de descanso ha terminado. ¡Es hora de la siguiente serie!"
                )
                webpush(
                    subscription_info=sub,
                    data=json.dumps(
                        {
                            "title": "⏱️ ¡Tiempo de descanso terminado! 💪",
                            "body": body_msg,
                            "tag": "gymtracker-rest-timer",
                            "url": "/",
                        }
                    ),
                    vapid_private_key=vapid_private,
                    vapid_claims={"sub": vapid_email},
                )
            except Exception as push_err:
                print(f"ℹ️ [WebPush] Aviso al enviar push remoto: {push_err}")
    except asyncio.CancelledError:
        pass
    finally:
        SCHEDULED_REST_TASKS.pop(profile_id, None)


@app.post("/api/push/schedule-rest/{profile_id}")
async def schedule_rest_push(
    profile_id: str,
    payload: RestPushScheduleSchema,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    verify_profile_access(profile_id, current_user)
    existing_task = SCHEDULED_REST_TASKS.pop(profile_id, None)
    if existing_task and not existing_task.done():
        existing_task.cancel()

    task = asyncio.create_task(
        _deliver_rest_webpush(profile_id, payload.seconds, payload.exerciseName)
    )
    SCHEDULED_REST_TASKS[profile_id] = task
    return {
        "status": "scheduled",
        "profile_id": profile_id,
        "seconds": payload.seconds,
        "exerciseName": payload.exerciseName,
    }


@app.delete("/api/push/schedule-rest/{profile_id}")
async def cancel_rest_push(
    profile_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
):
    verify_profile_access(profile_id, current_user)
    existing_task = SCHEDULED_REST_TASKS.pop(profile_id, None)
    if existing_task and not existing_task.done():
        existing_task.cancel()
    return {"status": "cancelled", "profile_id": profile_id}


# Serve sw.js with no-cache headers for instant PWA update detection
@app.get("/sw.js")
def get_service_worker():
    sw_file = os.path.join(BASE_DIR, "frontend", "sw.js")
    if os.path.exists(sw_file):
        return FileResponse(
            sw_file,
            media_type="application/javascript",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    raise HTTPException(status_code=404, detail="sw.js no encontrado")


# Mount static frontend files for production serving
frontend_path = os.path.join(BASE_DIR, "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
