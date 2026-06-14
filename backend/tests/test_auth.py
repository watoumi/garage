"""Registration and login: token issuance, duplicate handling, and the fact
that a freshly registered garage starts unapproved (pending verification).
"""

REGISTER_PAYLOAD = {
    "email": "newgarage@test.ma",
    "password": "password123",
    "name": "New Garage",
    "phone": "212600112233",
    "city": "Rabat",
    "address": "1 Avenue Hassan II",
}


def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_register_returns_token_and_creates_pending_garage(client):
    resp = client.post("/auth/register", json=REGISTER_PAYLOAD)
    assert resp.status_code == 201
    body = resp.json()
    assert body["role"] == "garage"
    token = body["access_token"]
    assert token

    me = client.get("/garage/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    # New garages are pending until an admin approves them.
    assert me.json()["is_approved"] is False


def test_register_rejects_duplicate_email(client):
    assert client.post("/auth/register", json=REGISTER_PAYLOAD).status_code == 201
    dup = client.post("/auth/register", json=REGISTER_PAYLOAD)
    assert dup.status_code == 409


def test_register_rejects_short_password(client):
    payload = {**REGISTER_PAYLOAD, "email": "weak@test.ma", "password": "short"}
    assert client.post("/auth/register", json=payload).status_code == 422


def test_login_succeeds_with_correct_password(client, make_garage):
    make_garage("login@test.ma", password="password123")
    resp = client.post(
        "/auth/login", json={"email": "login@test.ma", "password": "password123"}
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_login_fails_with_wrong_password(client, make_garage):
    make_garage("login2@test.ma", password="password123")
    resp = client.post(
        "/auth/login", json={"email": "login2@test.ma", "password": "wrong-password"}
    )
    assert resp.status_code == 401
