from fastapi import APIRouter, status
from app.services.intelligence_service import IntelligenceService

router = APIRouter(prefix="/intelligence", tags=["Inventory Intelligence"])


@router.get("/reorder", status_code=status.HTTP_200_OK)
def get_reorder_recommendations():
    """
    Computes real-time dynamic restock recommendations and Days Until Safety Stock runways.
    """
    recommendations = IntelligenceService.get_reorder_recommendations()
    return {
        "success": True,
        "data": recommendations,
    }


@router.get("/anomalies", status_code=status.HTTP_200_OK)
def get_anomalies():
    """
    Returns deterministic inventory anomalies detected across the 3 core rules:
    - UNUSUAL_VOLUME
    - HIGH_FREQUENCY_MOVEMENT
    - LARGE_ADJUSTMENT_VARIANCE
    """
    anomalies = IntelligenceService.get_anomalies()
    return {
        "success": True,
        "data": anomalies,
    }
