from typing import Optional, List
from pydantic import BaseModel


class WarehouseResponse(BaseModel):
    id: int
    code: str
    name: str
    address: Optional[str] = None


class LocationResponse(BaseModel):
    id: int
    warehouse_id: int
    warehouse_name: Optional[str] = None
    code: str
    name: str
    type: str  # STORAGE, RECEIVING, STAGING, PRODUCTION
    capacity: float
    current_occupancy: float = 0.0
    utilization_percentage: float = 0.0


class LocationStockItem(BaseModel):
    product_id: int
    product_sku: str
    product_name: str
    quantity: float
    uom: str
    is_low_stock: bool = False


class LocationStockResponse(BaseModel):
    location: LocationResponse
    items: List[LocationStockItem] = []
