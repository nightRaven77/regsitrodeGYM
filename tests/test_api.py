import os
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
    assert "weights_history" in json_data

def test_save_state_endpoint():
    payload = {
        "routines": [{"id": "r1", "name": "Rutina Test", "days": []}],
        "weights_history": {"p1": {"weight": 50, "reps": 12}},
        "workout_history": [],
        "active_session": None
    }
    response = client.post("/api/state/test_profile_id", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "saved"
