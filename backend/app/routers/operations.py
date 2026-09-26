from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.models.operation import (
    OperationCreate,
    OperationResponse,
    OperationDetailResponse,
    OperationType,
    OperationStatus,
)
from app.services.operation_service import OperationService
from app.routers.auth import get_current_user

router = APIRouter(prefix="/operations", tags=["Inventory Operations"])


@router.get("", status_code=status.HTTP_200_OK)
def list_operations(
    type: Optional[OperationType] = Query(None, description="Filter by operation type (RECEIPT, DELIVERY, TRANSFER, ADJUSTMENT)"),
    status_filter: Optional[OperationStatus] = Query(None, alias="status", description="Filter by status (DRAFT, WAITING, READY, DONE, CANCELED)"),
    warehouse_id: Optional[int] = Query(None, description="Filter by warehouse ID"),
):
    """Lists operations with optional filtering by type, status, or warehouse."""
    ops = OperationService.get_operations(
        op_type=type,
        status=status_filter,
        warehouse_id=warehouse_id,
    )
    return {
        "success": True,
        "data": ops,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_operation(
    payload: OperationCreate,
    current_user: dict = Depends(get_current_user),
):
    """Creates a new operation draft with lines."""
    try:
        op = OperationService.create_operation(payload, user_id=current_user["id"])
        return {
            "success": True,
            "data": op,
        }
    except ValueError as e:
        msg = str(e)
        if "WAREHOUSE_NOT_FOUND" in msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "WAREHOUSE_NOT_FOUND", "message": msg},
            )
        if "LOCATION_NOT_FOUND" in msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "LOCATION_NOT_FOUND", "message": msg},
            )
        if "PRODUCT_NOT_FOUND" in msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "PRODUCT_NOT_FOUND", "message": msg},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "BAD_REQUEST", "message": msg},
        )


@router.get("/{operation_id}", status_code=status.HTTP_200_OK)
def get_operation(operation_id: int):
    """Retrieves an operation by ID including all line items."""
    op = OperationService.get_operation_by_id(operation_id)
    if not op:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "OPERATION_NOT_FOUND", "message": f"Operation with ID {operation_id} not found"},
        )
    return {
        "success": True,
        "data": op,
    }


@router.post("/{operation_id}/validate", status_code=status.HTTP_200_OK)
def validate_operation(
    operation_id: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Atomically validates an operation:
    - Increments/decrements stock levels according to operation rules.
    - Fails with 400 INSUFFICIENT_STOCK if source stock is inadequate (with immediate rollback).
    - Appends immutable audit records to the stock ledger.
    - Transitions operation status to DONE.
    """
    try:
        op = OperationService.validate_operation(operation_id, user_id=current_user["id"])
        return {
            "success": True,
            "data": op,
        }
    except ValueError as e:
        msg = str(e)
        if "OPERATION_NOT_FOUND" in msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "OPERATION_NOT_FOUND", "message": msg},
            )
        if "INSUFFICIENT_STOCK" in msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INSUFFICIENT_STOCK", "message": msg},
            )
        if "ALREADY_VALIDATED" in msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "ALREADY_VALIDATED", "message": msg},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_FAILED", "message": msg},
        )


@router.post("/{operation_id}/cancel", status_code=status.HTTP_200_OK)
def cancel_operation(
    operation_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Cancels a pending or draft operation."""
    try:
        op = OperationService.cancel_operation(operation_id)
        return {
            "success": True,
            "data": op,
        }
    except ValueError as e:
        msg = str(e)
        if "OPERATION_NOT_FOUND" in msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "OPERATION_NOT_FOUND", "message": msg},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "CANNOT_CANCEL", "message": msg},
        )
