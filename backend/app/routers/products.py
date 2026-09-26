from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.models.product import ProductCreate, ProductResponse, CategoryResponse
from app.services.catalog_service import CatalogService
from app.routers.auth import get_current_user

router = APIRouter(tags=["Catalog & Products"])


@router.get("/categories", status_code=status.HTTP_200_OK)
def list_categories():
    """Returns all available product categories."""
    categories = CatalogService.get_categories()
    return {
        "success": True,
        "data": categories
    }


@router.get("/products", status_code=status.HTTP_200_OK)
def list_products(
    search: Optional[str] = Query(None, description="Search by name or SKU"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    low_stock: Optional[bool] = Query(None, description="Filter products at or below safety stock threshold")
):
    """Returns products list with dynamically calculated total_on_hand and low-stock indicator."""
    products = CatalogService.get_products(
        search=search,
        category_id=category_id,
        low_stock=low_stock
    )
    return {
        "success": True,
        "data": products
    }


@router.post("/products", status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    current_user: dict = Depends(get_current_user)
):
    """Creates a new product SKU in the catalog."""
    try:
        product = CatalogService.create_product(payload)
        return {
            "success": True,
            "data": product
        }
    except ValueError as e:
        msg = str(e)
        if "SKU_EXISTS" in msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "SKU_EXISTS", "message": f"A product with SKU '{payload.sku}' already exists"}
            )
        if "CATEGORY_NOT_FOUND" in msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "CATEGORY_NOT_FOUND", "message": "Selected category does not exist"}
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "BAD_REQUEST", "message": msg}
        )


@router.get("/products/{product_id}", status_code=status.HTTP_200_OK)
def get_product(product_id: int):
    """Retrieves product details including stock quantities across all warehouse locations."""
    product = CatalogService.get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PRODUCT_NOT_FOUND", "message": f"Product with ID {product_id} not found"}
        )
    return {
        "success": True,
        "data": product
    }
