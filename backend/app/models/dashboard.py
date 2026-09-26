from typing import Optional
from pydantic import BaseModel, Field


class DashboardKPIs(BaseModel):
    """
    Strict KPI Field Contract:
    - total_products: Total number of catalog products
    - low_stock_count: Total products at or below safety stock
    - pending_receipts: Total inbound receipts awaiting completion (DRAFT, WAITING, READY)
    - pending_deliveries: Total outbound deliveries awaiting fulfillment (DRAFT, WAITING, READY)
    - internal_transfers_scheduled: Total internal movements awaiting execution (DRAFT, WAITING, READY)
    """
    total_products: int = Field(default=0, description="Total active products in catalog")
    low_stock_count: int = Field(default=0, description="Products at or below safety stock threshold")
    pending_receipts: int = Field(default=0, description="Inbound receipts in DRAFT, WAITING, or READY status")
    pending_deliveries: int = Field(default=0, description="Outbound deliveries in DRAFT, WAITING, or READY status")
    internal_transfers_scheduled: int = Field(default=0, description="Internal transfers in DRAFT, WAITING, or READY status")
    warehouse_id: Optional[int] = Field(default=None, description="Filtered warehouse ID if applicable")
