from typing import Optional, List
from pydantic import BaseModel, Field


class LedgerEntryResponse(BaseModel):
    id: int
    operation_id: Optional[int] = None
    operation_reference: Optional[str] = None
    operation_type: Optional[str] = None
    product_id: int
    product_sku: str
    product_name: str
    product_uom: str
    source_location_id: Optional[int] = None
    source_location_code: Optional[str] = None
    source_location_name: Optional[str] = None
    dest_location_id: Optional[int] = None
    dest_location_code: Optional[str] = None
    dest_location_name: Optional[str] = None
    quantity: float
    balance_after: float
    timestamp: str
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None


class PaginatedLedgerResponse(BaseModel):
    items: List[LedgerEntryResponse]
    total_count: int
    limit: int
    offset: int
