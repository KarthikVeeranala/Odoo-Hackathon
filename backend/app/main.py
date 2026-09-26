from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import CORS_ORIGINS
from app.database import init_db
from app.routers import auth, products, warehouses, operations, ledger, dashboard, intelligence


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database schema
    init_db()
    yield


app = FastAPI(
    title="StockSense IMS API",
    description="Backend API for StockSense Inventory Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Standard Error Envelopes
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "code" in exc.detail and "message" in exc.detail:
        error_payload = exc.detail
    else:
        error_payload = {
            "code": f"HTTP_{exc.status_code}",
            "message": str(exc.detail)
        }
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": error_payload}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_msg = errors[0]["msg"] if errors else "Validation failed"
    first_loc = " -> ".join(str(loc) for loc in errors[0]["loc"]) if errors else ""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"{first_loc}: {first_msg}" if first_loc else first_msg
            }
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc) or "An unexpected internal server error occurred"
            }
        }
    )


# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(warehouses.router, prefix="/api")
app.include_router(operations.router, prefix="/api")
app.include_router(ledger.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(intelligence.router, prefix="/api")


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "service": "StockSense Backend",
            "version": "1.0.0"
        }
    }
