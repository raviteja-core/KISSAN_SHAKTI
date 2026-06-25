from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_crops_endpoint():
    response = client.get("/api/v1/crops/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_jobs_endpoint():
    response = client.get("/api/v1/jobs/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
