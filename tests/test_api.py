import pytest
from fastapi.testclient import TestClient
from app_server import app, Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "online"
    assert "CenterFit GymTracker API" in json_data["app"]

def test_state_endpoint_fallback():
    response = client.get("/api/state/test_profile_id")
    assert response.status_code == 200
    json_data = response.json()
    assert "routines" in json_data
    assert "weightsHistory" in json_data

def test_sync_state_endpoint():
    payload = {
        "profiles": [{"id": "prof_erick", "name": "Erick", "avatar": "👨‍🏽‍🦱"}],
        "activeProfileId": "prof_erick",
        "routines": [{"id": "r1", "name": "Rutina Test", "days": []}],
        "weightsHistory": {"p1": {"weight": 50, "reps": 12}},
        "workoutHistory": [],
        "activeSession": None
    }
    response = client.post("/api/sync/prof_erick", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "synced"
