from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def reset_state():
    response = client.post("/api/v1/platform/seed")
    assert response.status_code == 200
    return response.json()


def test_signin_farmer_and_laborer():
    reset_state()
    farmer_resp = client.post(
        "/api/v1/auth/login",
        json={"role": "FARMER", "email": "ramesh@kissan.in", "password": "farmer123"},
    )
    assert farmer_resp.status_code == 200
    assert farmer_resp.json()["user"]["role"] == "FARMER"

    laborer_resp = client.post(
        "/api/v1/auth/login",
        json={"role": "LABORER", "email": "suresh@kissan.in", "password": "labor123"},
    )
    assert laborer_resp.status_code == 200
    assert laborer_resp.json()["user"]["role"] == "LABORER"


def test_farmer_dashboard_returns_expected_data():
    reset_state()
    response = client.get("/api/v1/platform/dashboard/farmer", params={"farmer_id": "user_farmer_ramesh"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["farmer"]["id"] == "user_farmer_ramesh"
    assert "equipment" in payload
    assert "jobs" in payload
    assert "labor_hiring" in payload


def test_labor_dashboard_returns_current_engagement_and_jobs():
    reset_state()
    response = client.get("/api/v1/platform/dashboard/labor", params={"laborer_id": "user_labor_suresh"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["laborer"]["id"] == "user_labor_suresh"
    assert payload["current_engagement"] is not None
    assert payload["current_job"] is not None
    assert payload["available_jobs"] == [] or isinstance(payload["available_jobs"], list)


def test_create_rental_request_and_owner_notification():
    reset_state()
    create_resp = client.post(
        "/api/v1/platform/rentals",
        json={
            "equipment_id": "eq_tractor_575",
            "renter_id": "user_farmer_anita",
            "start_date": "2026-07-01",
            "end_date": "2026-07-03",
            "message": "Need tractor for sowing.",
        },
    )
    assert create_resp.status_code == 200
    item = create_resp.json()["item"]
    assert item["status"] == "REQUESTED"
    assert item["equipment"]["id"] == "eq_tractor_575"

    notifications_resp = client.get(
        "/api/v1/platform/notifications", params={"user_id": "user_farmer_ramesh"}
    )
    assert notifications_resp.status_code == 200
    notes = notifications_resp.json()["items"]
    assert any(note["type"] == "RENTAL_REQUEST" for note in notes)
    assert any("requested" in note["message"].lower() for note in notes)
