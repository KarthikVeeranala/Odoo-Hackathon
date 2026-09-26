import os
import tempfile
import pytest
from fastapi.testclient import TestClient

# Use a temporary database for tests so we don't mess up stocksense.db
temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
temp_db.close()
os.environ["STOCKSENSE_DB_PATH"] = temp_db.name

from app.database import init_db
from app.main import app

# Initialize test database
init_db()

client = TestClient(app)


def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["status"] == "healthy"


def test_signup_and_login_flow():
    # 1. Signup
    signup_payload = {
        "name": "Jane Warehouse",
        "email": "jane@stocksense.com",
        "password": "password123"
    }
    signup_res = client.post("/api/auth/signup", json=signup_payload)
    assert signup_res.status_code == 201
    signup_data = signup_res.json()
    assert signup_data["success"] is True
    assert "token" in signup_data["data"]
    assert signup_data["data"]["user"]["email"] == "jane@stocksense.com"
    token = signup_data["data"]["token"]

    # 2. Duplicate signup should fail
    dup_res = client.post("/api/auth/signup", json=signup_payload)
    assert dup_res.status_code == 400
    dup_data = dup_res.json()
    assert dup_data["success"] is False
    assert dup_data["error"]["code"] == "EMAIL_EXISTS"

    # 3. Login
    login_payload = {
        "email": "jane@stocksense.com",
        "password": "password123"
    }
    login_res = client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["success"] is True
    assert "token" in login_data["data"]

    # 4. Invalid password login
    bad_login = client.post("/api/auth/login", json={"email": "jane@stocksense.com", "password": "wrong"})
    assert bad_login.status_code == 401
    assert bad_login.json()["success"] is False
    assert bad_login.json()["error"]["code"] == "INVALID_CREDENTIALS"

    # 5. Access /api/auth/me with Bearer token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["success"] is True
    assert me_data["data"]["user"]["email"] == "jane@stocksense.com"

    # 6. Access /api/auth/me without token should fail 401
    no_token_res = client.get("/api/auth/me")
    assert no_token_res.status_code == 401
    assert no_token_res.json()["success"] is False


def test_forgot_password_and_otp_reset():
    # 1. Create a user
    client.post("/api/auth/signup", json={
        "name": "Bob Manager",
        "email": "bob@stocksense.com",
        "password": "oldpassword123"
    })

    # 2. Request OTP
    forgot_res = client.post("/api/auth/forgot-password", json={"email": "bob@stocksense.com"})
    assert forgot_res.status_code == 200
    forgot_data = forgot_res.json()
    assert forgot_data["success"] is True
    assert "dev_otp" in forgot_data["data"]
    otp = forgot_data["data"]["dev_otp"]
    assert len(otp) == 6

    # 3. Reset password with invalid OTP
    bad_reset = client.post("/api/auth/reset-password", json={
        "email": "bob@stocksense.com",
        "otp": "000000",
        "new_password": "newpassword123"
    })
    assert bad_reset.status_code == 400
    assert bad_reset.json()["error"]["code"] == "INVALID_OTP"

    # 4. Reset password with valid OTP
    good_reset = client.post("/api/auth/reset-password", json={
        "email": "bob@stocksense.com",
        "otp": otp,
        "new_password": "newpassword123"
    })
    assert good_reset.status_code == 200
    assert good_reset.json()["success"] is True

    # 5. Old password no longer works
    old_login = client.post("/api/auth/login", json={
        "email": "bob@stocksense.com",
        "password": "oldpassword123"
    })
    assert old_login.status_code == 401

    # 6. New password works
    new_login = client.post("/api/auth/login", json={
        "email": "bob@stocksense.com",
        "password": "newpassword123"
    })
    assert new_login.status_code == 200
    assert "token" in new_login.json()["data"]
