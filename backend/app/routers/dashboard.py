from typing import Optional
from fastapi import APIRouter, Query, status
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Executive Dashboard"])


@router.get("/kpis", status_code=status.HTTP_200_OK)
def get_dashboard_kpis(
    warehouse_id: Optional[int] = Query(None, description="Filter metrics by warehouse ID"),
):
    """
    Returns the authoritative 5 core inventory KPIs:
    - total_products
    - low_stock_count
    - pending_receipts
    - pending_deliveries
    - internal_transfers_scheduled
    """
    kpis = DashboardService.get_kpis(warehouse_id=warehouse_id)
    return {
        "success": True,
        "data": kpis,
    }
