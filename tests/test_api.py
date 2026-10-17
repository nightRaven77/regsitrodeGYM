import pytest
from fastapi.testclient import TestClient
from app_server import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "online"
    assert "My Gym Tracker App API" in json_data["app"]


def test_health_endpoint_with_check_db():
    response = client.get("/api/health?check_db=true")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "online"
    assert "database_ping" in json_data
    assert json_data["database_ping"]["status"] == "online"


def test_ping_keepalive_endpoint():
    response = client.get("/api/ping")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "online"
    assert "details" in json_data
    assert "keepalive_success" in json_data
    assert json_data["keepalive_success"] is True


def test_state_endpoint_fallback():
    response = client.get("/api/state/test_profile_id")
    assert response.status_code == 200
    json_data = response.json()
    assert "routines" in json_data
    assert "weightsHistory" in json_data


def test_sync_state_endpoint():
    payload = {
        "routines": [{"id": "r1", "name": "Rutina Test", "days": []}],
        "weightsHistory": {"p1": {"weight": 50, "reps": 12}},
        "workoutHistory": [
            {
                "id": "work_1001",
                "dayName": "Día 1: Pierna",
                "dateFormatted": "vie, 16 oct",
                "timeFormatted": "18:00",
                "durationSeconds": 2400,
                "totalSets": 4,
                "totalVolumeKg": 2000,
                "detailedExercises": []
            }
        ],
        "activeSession": None
    }
    response = client.post("/api/sync/prof_erick", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "synced"

    state_res = client.get("/api/state/prof_erick")
    assert state_res.status_code == 200
    state_data = state_res.json()
    assert len(state_data["routines"]) == 1
    assert state_data["routines"][0]["name"] == "Rutina Test"
    assert len(state_data["workoutHistory"]) == 1


def test_auth_register_login_and_idor_protection():
    reg_payload = {
        "name": "Atleta Test",
        "email": "atleta@example.com",
        "password": "StrongPassword123",
        "avatar": "🏋️‍♂️"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert "token" in reg_data
    token = reg_data["token"]
    user_id = reg_data["user"]["id"]

    # Duplicate email registration should return 400
    dup_res = client.post("/api/auth/register", json=reg_payload)
    assert dup_res.status_code == 400

    # Login with valid credentials
    login_res = client.post("/api/auth/login", json={
        "email": "atleta@example.com",
        "password": "StrongPassword123"
    })
    assert login_res.status_code == 200
    assert login_res.json()["user"]["id"] == user_id

    # Login with wrong password should return 401
    bad_login = client.post("/api/auth/login", json={
        "email": "atleta@example.com",
        "password": "WrongPassword"
    })
    assert bad_login.status_code == 401

    # Authorized sync for own profile succeeds
    headers = {"Authorization": f"Bearer {token}"}
    own_sync = client.post(
        f"/api/sync/{user_id}",
        json={"routines": [{"id": "r_own", "name": "Mi Rutina", "days": []}]},
        headers=headers
    )
    assert own_sync.status_code == 200

    # Attempting to modify another user's profile with this token is forbidden (403 IDOR protection)
    idor_sync = client.post(
        "/api/sync/prof_victim_user",
        json={"routines": []},
        headers=headers
    )
    assert idor_sync.status_code == 403

    # Invalid JWT token is rejected with 401
    invalid_token_res = client.get(
        f"/api/state/{user_id}",
        headers={"Authorization": "Bearer invalid.jwt.token"}
    )
    assert invalid_token_res.status_code == 401


def test_exercises_catalog_and_custom_exercise():
    get_res = client.get("/api/exercises")
    assert get_res.status_code == 200
    catalog = get_res.json()
    assert len(catalog) >= 70

    create_res = client.post("/api/exercises", json={
        "name": "Hip Thrust con Barra",
        "category": "Pierna",
        "equipment": "Barra",
        "defaultSets": 4,
        "defaultReps": 10,
        "unit": "reps"
    })
    assert create_res.status_code == 200
    new_ex = create_res.json()
    assert new_ex["name"] == "Hip Thrust con Barra"
    assert new_ex["defaultSets"] == 4


def test_history_update_and_delete_endpoints():
    profile_id = "prof_hist_tester"
    log_id = "work_999"
    client.post(f"/api/sync/{profile_id}", json={
        "workoutHistory": [{
            "id": log_id,
            "dayName": "Día Espalda",
            "dateFormatted": "lun, 12 oct",
            "timeFormatted": "10:00",
            "durationSeconds": 1800,
            "totalSets": 3,
            "totalVolumeKg": 1200,
            "detailedExercises": []
        }]
    })

    # Update workout log
    upd_res = client.put(f"/api/history/{profile_id}/{log_id}", json={
        "id": log_id,
        "dayName": "Día Espalda Pesado",
        "dateFormatted": "lun, 12 oct",
        "timeFormatted": "10:00",
        "durationSeconds": 2100,
        "totalSets": 5,
        "totalVolumeKg": 2500,
        "detailedExercises": []
    })
    assert upd_res.status_code == 200
    assert upd_res.json()["status"] == "updated"

    # Delete workout log
    del_res = client.delete(f"/api/history/{profile_id}/{log_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"


def test_web_push_rest_timer_endpoints():
    vapid_res = client.get("/api/push/vapid-public-key")
    assert vapid_res.status_code == 200
    vapid_data = vapid_res.json()
    assert vapid_data["serviceWorkerPushSupported"] is True
    assert "vapidPublicKey" in vapid_data

    sub_res = client.post(
        "/api/push/subscribe/prof_push_tester",
        json={
            "endpoint": "https://fcm.googleapis.com/fcm/send/example-token",
            "keys": {"p256dh": "test_p256dh_key", "auth": "test_auth_key"},
        },
    )
    assert sub_res.status_code == 200
    assert sub_res.json()["status"] == "subscribed"

    sched_res = client.post(
        "/api/push/schedule-rest/prof_push_tester",
        json={"seconds": 60, "exerciseName": "Sentadilla Libre"},
    )
    assert sched_res.status_code == 200
    sched_data = sched_res.json()
    assert sched_data["status"] == "scheduled"
    assert sched_data["seconds"] == 60
    assert sched_data["exerciseName"] == "Sentadilla Libre"

    cancel_res = client.delete("/api/push/schedule-rest/prof_push_tester")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"

