from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class OperationType(str, Enum):
    RECEIPT = "RECEIPT"
    DELIVERY = "DELIVERY"
    TRANSFER = "TRANSFER"
    ADJUSTMENT = "ADJUSTMENT"


class OperationStatus(str, Enum):
    DRAFT = "DRAFT"
    WAITING = "WAITING"
    READY = "READY"
    DONE = "DONE"
    CANCELED = "CANCELED"


class OperationLineCreate(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0, description="Quantity for this line item")
    uom: Optional[str] = Field(None, max_length=20, description="Unit of measure (defaults to product UOM if omitted)")


class OperationLineResponse(BaseModel):
    id: int
    operation_id: int
    product_id: int
    product_sku: Optional[str] = None
    product_name: Optional[str] = None
    quantity: float
    uom: str
    created_at: str


class OperationCreate(BaseModel):
    type: OperationType
    warehouse_id: int
    source_location_id: Optional[int] = None
    dest_location_id: Optional[int] = None
    partner_name: Optional[str] = Field(None, max_length=150, description="Vendor (Receipt) or Customer (Delivery)")
    notes: Optional[str] = None
    lines: List[OperationLineCreate] = Field(..., min_length=1, description="At least one line item is required")


class OperationResponse(BaseModel):
    id: int
    reference: str
    type: OperationType
    status: OperationStatus
    warehouse_id: int
    warehouse_name: Optional[str] = None
    source_location_id: Optional[int] = None
    source_location_name: Optional[str] = None
    dest_location_id: Optional[int] = None
    dest_location_name: Optional[str] = None
    partner_name: Optional[str] = None
    notes: Optional[str] = None
    line_count: int = 0
    total_quantity: float = 0.0
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    created_at: str
    validated_at: Optional[str] = None


class OperationDetailResponse(OperationResponse):
    lines: List[OperationLineResponse] = []


class StockLedgerEntryResponse(BaseModel):
    id: int
    operation_id: Optional[int] = None
    operation_reference: Optional[str] = None
    operation_type: Optional[str] = None
    product_id: int
    product_sku: Optional[str] = None
    product_name: Optional[str] = None
    source_location_id: Optional[int] = None
    source_location_name: Optional[str] = None
    dest_location_id: Optional[int] = None
    dest_location_name: Optional[str] = None
    quantity: float
    balance_after: float
    timestamp: str
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
