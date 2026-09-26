from fastapi import APIRouter, Depends, Header, HTTPException, status
from typing import Optional
from app.database import get_db
from app.models.auth import (
    SignupRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserResponse,
    AuthResponseData,
)
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    generate_otp,
    verify_and_consume_otp,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Dependency that extracts and verifies the authenticated user from the Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Missing or invalid authorization header"}
        )
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Token is invalid or expired"}
        )
    
    user_id = int(payload["sub"])
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, name, role FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "USER_NOT_FOUND", "message": "User no longer exists"}
            )
        return dict(user)


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest):
    """Registers a new user account and returns a JWT session token."""
    clean_email = req.email.strip().lower()
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (clean_email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "EMAIL_EXISTS", "message": "An account with this email already exists"}
            )
        
        password_hash, salt = hash_password(req.password)
        cursor.execute(
            "INSERT INTO users (email, name, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)",
            (clean_email, req.name.strip(), password_hash, salt, "user")
        )
        user_id = cursor.lastrowid
        
        token = create_access_token(user_id=user_id, email=clean_email, role="user")
        user_data = UserResponse(id=user_id, name=req.name.strip(), email=clean_email, role="user")
        
        return {
            "success": True,
            "data": {
                "user": user_data.model_dump(),
                "token": token
            }
        }


@router.post("/login", status_code=status.HTTP_200_OK)
def login(req: LoginRequest):
    """Authenticates user credentials and returns a JWT session token."""
    clean_email = req.email.strip().lower()
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, name, password_hash, salt, role FROM users WHERE email = ?", (clean_email,))
        user = cursor.fetchone()
        
        if not user or not verify_password(req.password, user["salt"], user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password"}
            )
        
        token = create_access_token(user_id=user["id"], email=user["email"], role=user["role"])
        user_data = UserResponse(id=user["id"], name=user["name"], email=user["email"], role=user["role"])
        
        return {
            "success": True,
            "data": {
                "user": user_data.model_dump(),
                "token": token
            }
        }


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(req: ForgotPasswordRequest):
    """Generates an OTP for password reset. Logs to console and returns dev_otp in response."""
    clean_email = req.email.strip().lower()
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (clean_email,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "USER_NOT_FOUND", "message": "No account found with this email"}
            )
        
        otp = generate_otp(clean_email)
        return {
            "success": True,
            "data": {
                "message": "OTP generated successfully. Check server terminal or dev_otp field.",
                "dev_otp": otp
            }
        }


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(req: ResetPasswordRequest):
    """Verifies OTP and resets user password."""
    clean_email = req.email.strip().lower()
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (clean_email,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "USER_NOT_FOUND", "message": "No account found with this email"}
            )
        
        if not verify_and_consume_otp(clean_email, req.otp):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_OTP", "message": "Invalid or expired OTP token"}
            )
        
        new_hash, new_salt = hash_password(req.new_password)
        cursor.execute(
            "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?",
            (new_hash, new_salt, user["id"])
        )
        
        return {
            "success": True,
            "data": {
                "message": "Password reset successful. You may now log in."
            }
        }


@router.get("/me", status_code=status.HTTP_200_OK)
def get_me(current_user: dict = Depends(get_current_user)):
    """Returns profile for currently authenticated user."""
    return {
        "success": True,
        "data": {
            "user": {
                "id": current_user["id"],
                "name": current_user["name"],
                "email": current_user["email"],
                "role": current_user["role"]
            }
        }
    }
