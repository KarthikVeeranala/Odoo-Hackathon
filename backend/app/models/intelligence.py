from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class UrgencyLevel(str, Enum):
    CRITICAL = "CRITICAL"    # current_stock <= safety_stock
    WARNING = "WARNING"      # days_until_safety_stock <= 7
    HEALTHY = "HEALTHY"      # days_until_safety_stock > 7
    COLD_START = "COLD_START" # No delivery/burn history yet


class ReorderRecommendation(BaseModel):
    product_id: int
    sku: str
    name: str
    category_name: Optional[str] = None
    uom: str
    current_stock: float
    safety_stock: float
    reorder_quantity: float
    daily_burn_rate: float
    days_until_safety_stock: Optional[float] = None
    suggested_reorder_qty: float
    urgency: UrgencyLevel
    explanation: str


class AnomalySeverity(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class AnomalyRuleCode(str, Enum):
    UNUSUAL_VOLUME = "UNUSUAL_VOLUME"
    HIGH_FREQUENCY_MOVEMENT = "HIGH_FREQUENCY_MOVEMENT"
    LARGE_ADJUSTMENT_VARIANCE = "LARGE_ADJUSTMENT_VARIANCE"


class AnomalyRecord(BaseModel):
    id: str
    rule_code: AnomalyRuleCode
    severity: AnomalySeverity
    product_id: int
    product_sku: str
    product_name: str
    operation_id: Optional[int] = None
    operation_reference: Optional[str] = None
    quantity: Optional[float] = None
    expected_baseline: Optional[float] = None
    detected_value: Optional[float] = None
    description: str
    detected_at: str
