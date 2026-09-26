from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.services.catalog_service import CatalogService

router = APIRouter(tags=["Warehouses & Locations"])


@router.get("/warehouses", status_code=status.HTTP_200_OK)
def list_warehouses():
    """Returns all warehouses."""
    warehouses = CatalogService.get_warehouses()
    return {
        "success": True,
        "data": warehouses
    }


@router.get("/locations", status_code=status.HTTP_200_OK)
def list_locations(
    warehouse_id: Optional[int] = Query(None, description="Filter locations by warehouse ID")
):
    """Returns locations with real-time occupancy and capacity utilization percentage."""
    locations = CatalogService.get_locations(warehouse_id=warehouse_id)
    return {
        "success": True,
        "data": locations
    }


@router.get("/locations/{location_id}/stock", status_code=status.HTTP_200_OK)
def get_location_stock(location_id: int):
    """Returns location metadata and all active stored inventory items."""
    loc_stock = CatalogService.get_location_stock(location_id)
    if not loc_stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "LOCATION_NOT_FOUND", "message": f"Location with ID {location_id} not found"}
        )
    return {
        "success": True,
        "data": loc_stock
    }
