from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, status
from app.services.copilot_service import CopilotService

router = APIRouter(prefix="/intelligence/copilot", tags=["AI Inventory Copilot"])


class CopilotQueryRequest(BaseModel):
    query: str


@router.post("/query", status_code=status.HTTP_200_OK)
def query_copilot(payload: CopilotQueryRequest):
    """
    Submits a natural language or structured inventory query to the StockSense AI Copilot.
    Returns real-time synthesis of stock balances, reorder alerts, pending moves, and anomalies.
    """
    result = CopilotService.answer_query(payload.query)
    return {
        "success": True,
        "data": result,
    }


@router.get("/suggested-prompts", status_code=status.HTTP_200_OK)
def get_suggested_prompts():
    """Returns curated starter prompts for quick interactive evaluation."""
    return {
        "success": True,
        "data": CopilotService.SUGGESTED_PROMPTS,
    }
