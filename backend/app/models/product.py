from typing import Optional, List
from pydantic import BaseModel, Field


class CategoryResponse(BaseModel):
    id: int
    name: str
    code: str


class ProductCreate(BaseModel):
    sku: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    category_id: int
    uom: str = Field(..., min_length=1, max_length=20)
    safety_stock: float = Field(default=0.0, ge=0.0)
    reorder_quantity: float = Field(default=0.0, ge=0.0)


class ProductResponse(BaseModel):
    id: int
    sku: str
    name: str
    category_id: int
    category_name: Optional[str] = None
    uom: str
    safety_stock: float
    reorder_quantity: float
    total_on_hand: float = 0.0
    is_low_stock: bool = False


class ProductLocationStock(BaseModel):
    location_id: int
    location_name: str
    location_code: str
    warehouse_name: str
    quantity: float


class ProductDetailResponse(ProductResponse):
    locations: List[ProductLocationStock] = []
