from typing import Optional
from fastapi import APIRouter, Query, status
from app.services.ledger_service import LedgerService

router = APIRouter(prefix="/ledger", tags=["Stock Ledger"])


@router.get("", status_code=status.HTTP_200_OK)
def get_ledger(
    product_id: Optional[int] = Query(None, description="Filter movements by product ID"),
    location_id: Optional[int] = Query(None, description="Filter movements by source or destination location ID"),
    operation_type: Optional[str] = Query(None, description="Filter by operation type (RECEIPT, DELIVERY, TRANSFER, ADJUSTMENT)"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
):
    """Retrieves immutable chronological stock ledger entries with pagination and filters."""
    result = LedgerService.get_ledger_entries(
        product_id=product_id,
        location_id=location_id,
        operation_type=operation_type,
        limit=limit,
        offset=offset,
    )
    return {
        "success": True,
        "data": result,
    }
