import os

# JWT Settings
JWT_SECRET: str = os.getenv("JWT_SECRET", "stocksense-super-secret-key-hackathon-2026")
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

# Database Settings
BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH: str = os.getenv("STOCKSENSE_DB_PATH", os.path.join(BASE_DIR, "stocksense.db"))

# CORS
CORS_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
