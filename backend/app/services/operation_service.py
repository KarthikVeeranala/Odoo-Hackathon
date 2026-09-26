import sqlite3
from typing import List, Optional, Dict, Any
from app.database import get_db
from app.models.operation import (
    OperationCreate,
    OperationResponse,
    OperationDetailResponse,
    OperationLineResponse,
    OperationType,
    OperationStatus,
    StockLedgerEntryResponse,
)


class OperationService:
    @staticmethod
    def _generate_reference(conn: sqlite3.Connection, op_type: OperationType) -> str:
        """Generates sequential reference numbers: WH/IN/0001, WH/OUT/0001, WH/INT/0001, WH/ADJ/0001."""
        prefix_map = {
            OperationType.RECEIPT: "WH/IN",
            OperationType.DELIVERY: "WH/OUT",
            OperationType.TRANSFER: "WH/INT",
            OperationType.ADJUSTMENT: "WH/ADJ",
        }
        prefix = prefix_map.get(op_type, "WH/OP")
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM operations WHERE type = ?", (op_type.value,))
        count = cursor.fetchone()["count"] + 1

        while True:
            ref = f"{prefix}/{count:04d}"
            cursor.execute("SELECT id FROM operations WHERE reference = ?", (ref,))
            if not cursor.fetchone():
                return ref
            count += 1

    @staticmethod
    def create_operation(payload: OperationCreate, user_id: Optional[int] = None) -> OperationDetailResponse:
        """Creates a new operation draft with line items."""
        with get_db() as conn:
            cursor = conn.cursor()

            # Verify warehouse exists
            cursor.execute("SELECT id FROM warehouses WHERE id = ?", (payload.warehouse_id,))
            if not cursor.fetchone():
                raise ValueError("WAREHOUSE_NOT_FOUND: Specified warehouse does not exist")

            # Validate location constraints based on operation type
            source_loc_id = payload.source_location_id
            dest_loc_id = payload.dest_location_id

            if payload.type == OperationType.RECEIPT:
                if not dest_loc_id:
                    raise ValueError("DEST_LOCATION_REQUIRED: Receipts require a destination location")
                cursor.execute("SELECT id FROM locations WHERE id = ?", (dest_loc_id,))
                if not cursor.fetchone():
                    raise ValueError("LOCATION_NOT_FOUND: Destination location does not exist")

            elif payload.type == OperationType.DELIVERY:
                if not source_loc_id:
                    raise ValueError("SOURCE_LOCATION_REQUIRED: Deliveries require a source location")
                cursor.execute("SELECT id FROM locations WHERE id = ?", (source_loc_id,))
                if not cursor.fetchone():
                    raise ValueError("LOCATION_NOT_FOUND: Source location does not exist")

            elif payload.type == OperationType.TRANSFER:
                if not source_loc_id or not dest_loc_id:
                    raise ValueError("LOCATIONS_REQUIRED: Transfers require both source and destination locations")
                if source_loc_id == dest_loc_id:
                    raise ValueError("SAME_LOCATION_TRANSFER: Source and destination locations cannot be identical")
                cursor.execute("SELECT id FROM locations WHERE id IN (?, ?)", (source_loc_id, dest_loc_id))
                if len(cursor.fetchall()) < 2:
                    raise ValueError("LOCATION_NOT_FOUND: One or both transfer locations do not exist")

            elif payload.type == OperationType.ADJUSTMENT:
                target_loc = dest_loc_id or source_loc_id
                if not target_loc:
                    raise ValueError("LOCATION_REQUIRED: Adjustments require a target location")
                cursor.execute("SELECT id FROM locations WHERE id = ?", (target_loc,))
                if not cursor.fetchone():
                    raise ValueError("LOCATION_NOT_FOUND: Adjustment location does not exist")
                source_loc_id = target_loc
                dest_loc_id = target_loc

            # Validate all products in line items
            line_data = []
            for line in payload.lines:
                cursor.execute("SELECT id, uom FROM products WHERE id = ?", (line.product_id,))
                prod = cursor.fetchone()
                if not prod:
                    raise ValueError(f"PRODUCT_NOT_FOUND: Product ID {line.product_id} does not exist")
                uom = line.uom or prod["uom"]
                line_data.append((line.product_id, line.quantity, uom))

            # Generate reference
            reference = OperationService._generate_reference(conn, payload.type)

            # Insert operation header
            cursor.execute(
                """
                INSERT INTO operations (
                    reference, type, status, warehouse_id,
                    source_location_id, dest_location_id,
                    partner_name, notes, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                """,
                (
                    reference,
                    payload.type.value,
                    OperationStatus.DRAFT.value,
                    payload.warehouse_id,
                    source_loc_id,
                    dest_loc_id,
                    payload.partner_name,
                    payload.notes,
                    user_id,
                ),
            )
            op_id = cursor.lastrowid

            # Insert lines
            for prod_id, qty, uom in line_data:
                cursor.execute(
                    """
                    INSERT INTO operation_lines (
                        operation_id, product_id, quantity, uom, created_at
                    ) VALUES (?, ?, ?, ?, datetime('now'))
                    """,
                    (op_id, prod_id, qty, uom),
                )

        return OperationService.get_operation_by_id(op_id)

    @staticmethod
    def get_operations(
        op_type: Optional[OperationType] = None,
        status: Optional[OperationStatus] = None,
        warehouse_id: Optional[int] = None,
    ) -> List[OperationResponse]:
        """Lists operations filtered by type, status, or warehouse."""
        with get_db() as conn:
            cursor = conn.cursor()
            query = """
                SELECT 
                    o.id,
                    o.reference,
                    o.type,
                    o.status,
                    o.warehouse_id,
                    w.name as warehouse_name,
                    o.source_location_id,
                    sl.name as source_location_name,
                    o.dest_location_id,
                    dl.name as dest_location_name,
                    o.partner_name,
                    o.notes,
                    o.created_by,
                    u.name as created_by_name,
                    o.created_at,
                    o.validated_at,
                    COUNT(ol.id) as line_count,
                    COALESCE(SUM(ol.quantity), 0.0) as total_quantity
                FROM operations o
                JOIN warehouses w ON o.warehouse_id = w.id
                LEFT JOIN locations sl ON o.source_location_id = sl.id
                LEFT JOIN locations dl ON o.dest_location_id = dl.id
                LEFT JOIN users u ON o.created_by = u.id
                LEFT JOIN operation_lines ol ON o.id = ol.operation_id
                WHERE 1=1
            """
            params: List[Any] = []
            if op_type:
                query += " AND o.type = ?"
                params.append(op_type.value)
            if status:
                query += " AND o.status = ?"
                params.append(status.value)
            if warehouse_id:
                query += " AND o.warehouse_id = ?"
                params.append(warehouse_id)

            query += " GROUP BY o.id ORDER BY o.id DESC"
            cursor.execute(query, params)
            rows = cursor.fetchall()

            return [
                OperationResponse(
                    id=row["id"],
                    reference=row["reference"],
                    type=OperationType(row["type"]),
                    status=OperationStatus(row["status"]),
                    warehouse_id=row["warehouse_id"],
                    warehouse_name=row["warehouse_name"],
                    source_location_id=row["source_location_id"],
                    source_location_name=row["source_location_name"],
                    dest_location_id=row["dest_location_id"],
                    dest_location_name=row["dest_location_name"],
                    partner_name=row["partner_name"],
                    notes=row["notes"],
                    line_count=row["line_count"],
                    total_quantity=row["total_quantity"],
                    created_by=row["created_by"],
                    created_by_name=row["created_by_name"],
                    created_at=row["created_at"],
                    validated_at=row["validated_at"],
                )
                for row in rows
            ]

    @staticmethod
    def get_operation_by_id(operation_id: int) -> Optional[OperationDetailResponse]:
        """Fetches detailed operation by ID, including line items and products."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT 
                    o.id,
                    o.reference,
                    o.type,
                    o.status,
                    o.warehouse_id,
                    w.name as warehouse_name,
                    o.source_location_id,
                    sl.name as source_location_name,
                    o.dest_location_id,
                    dl.name as dest_location_name,
                    o.partner_name,
                    o.notes,
                    o.created_by,
                    u.name as created_by_name,
                    o.created_at,
                    o.validated_at
                FROM operations o
                JOIN warehouses w ON o.warehouse_id = w.id
                LEFT JOIN locations sl ON o.source_location_id = sl.id
                LEFT JOIN locations dl ON o.dest_location_id = dl.id
                LEFT JOIN users u ON o.created_by = u.id
                WHERE o.id = ?
                """,
                (operation_id,),
            )
            op = cursor.fetchone()
            if not op:
                return None

            cursor.execute(
                """
                SELECT 
                    ol.id,
                    ol.operation_id,
                    ol.product_id,
                    p.sku as product_sku,
                    p.name as product_name,
                    ol.quantity,
                    ol.uom,
                    ol.created_at
                FROM operation_lines ol
                JOIN products p ON ol.product_id = p.id
                WHERE ol.operation_id = ?
                ORDER BY ol.id ASC
                """,
                (operation_id,),
            )
            line_rows = cursor.fetchall()

            lines = [
                OperationLineResponse(
                    id=l["id"],
                    operation_id=l["operation_id"],
                    product_id=l["product_id"],
                    product_sku=l["product_sku"],
                    product_name=l["product_name"],
                    quantity=l["quantity"],
                    uom=l["uom"],
                    created_at=l["created_at"],
                )
                for l in line_rows
            ]

            total_qty = sum(l.quantity for l in lines)

            return OperationDetailResponse(
                id=op["id"],
                reference=op["reference"],
                type=OperationType(op["type"]),
                status=OperationStatus(op["status"]),
                warehouse_id=op["warehouse_id"],
                warehouse_name=op["warehouse_name"],
                source_location_id=op["source_location_id"],
                source_location_name=op["source_location_name"],
                dest_location_id=op["dest_location_id"],
                dest_location_name=op["dest_location_name"],
                partner_name=op["partner_name"],
                notes=op["notes"],
                line_count=len(lines),
                total_quantity=total_qty,
                created_by=op["created_by"],
                created_by_name=op["created_by_name"],
                created_at=op["created_at"],
                validated_at=op["validated_at"],
                lines=lines,
            )

    @staticmethod
    def cancel_operation(operation_id: int) -> OperationDetailResponse:
        """Cancels an uncompleted operation."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT status FROM operations WHERE id = ?", (operation_id,))
            row = cursor.fetchone()
            if not row:
                raise ValueError("OPERATION_NOT_FOUND: Operation does not exist")
            if row["status"] == OperationStatus.DONE.value:
                raise ValueError("CANNOT_CANCEL_DONE: Completed operations cannot be canceled")

            cursor.execute(
                "UPDATE operations SET status = ? WHERE id = ?",
                (OperationStatus.CANCELED.value, operation_id),
            )

        return OperationService.get_operation_by_id(operation_id)

    @staticmethod
    def validate_operation(operation_id: int, user_id: Optional[int] = None) -> OperationDetailResponse:
        """
        Executes atomic validation of an operation:
        - RECEIPT: increments stock at destination location.
        - DELIVERY: verifies stock >= qty at source location; decrements stock. Throws INSUFFICIENT_STOCK on deficit.
        - TRANSFER: verifies stock >= qty at source; decrements source, increments dest. Net company stock delta = 0.
        - ADJUSTMENT: reconciles counted stock to target location and records delta.
        - Stock ledger entries are automatically committed.
        - All operations run in an atomic transaction; any failure triggers complete rollback.
        """
        with get_db() as conn:
            cursor = conn.cursor()

            # Lock row for atomic processing
            cursor.execute(
                """
                SELECT id, type, status, warehouse_id, source_location_id, dest_location_id
                FROM operations WHERE id = ?
                """,
                (operation_id,),
            )
            op = cursor.fetchone()
            if not op:
                raise ValueError("OPERATION_NOT_FOUND: Operation does not exist")

            op_status = op["status"]
            if op_status == OperationStatus.DONE.value:
                raise ValueError("ALREADY_VALIDATED: Operation is already completed")
            if op_status == OperationStatus.CANCELED.value:
                raise ValueError("OPERATION_CANCELED: Cannot validate a canceled operation")

            op_type = OperationType(op["type"])
            src_loc_id = op["source_location_id"]
            dst_loc_id = op["dest_location_id"]

            cursor.execute(
                "SELECT id, product_id, quantity, uom FROM operation_lines WHERE operation_id = ?",
                (operation_id,),
            )
            lines = cursor.fetchall()
            if not lines:
                raise ValueError("NO_LINES: Cannot validate operation with zero lines")

            # Process each line item atomically
            for line in lines:
                prod_id = line["product_id"]
                qty = line["quantity"]

                if op_type == OperationType.RECEIPT:
                    # Inbound Receipt: Increment stock at dest_loc_id
                    cursor.execute(
                        "SELECT quantity FROM stock_levels WHERE product_id = ? AND location_id = ?",
                        (prod_id, dst_loc_id),
                    )
                    stock_row = cursor.fetchone()
                    if stock_row:
                        new_balance = stock_row["quantity"] + qty
                        cursor.execute(
                            "UPDATE stock_levels SET quantity = ?, updated_at = datetime('now') WHERE product_id = ? AND location_id = ?",
                            (new_balance, prod_id, dst_loc_id),
                        )
                    else:
                        new_balance = qty
                        cursor.execute(
                            "INSERT INTO stock_levels (product_id, location_id, quantity, updated_at) VALUES (?, ?, ?, datetime('now'))",
                            (prod_id, dst_loc_id, new_balance),
                        )

                    # Immutable audit ledger entry
                    cursor.execute(
                        """
                        INSERT INTO stock_ledger (
                            operation_id, product_id, source_location_id, dest_location_id,
                            quantity, balance_after, timestamp, created_by
                        ) VALUES (?, ?, NULL, ?, ?, ?, datetime('now'), ?)
                        """,
                        (operation_id, prod_id, dst_loc_id, qty, new_balance, user_id),
                    )

                elif op_type == OperationType.DELIVERY:
                    # Outbound Delivery: Check on-hand stock and decrement
                    cursor.execute(
                        "SELECT quantity FROM stock_levels WHERE product_id = ? AND location_id = ?",
                        (prod_id, src_loc_id),
                    )
                    stock_row = cursor.fetchone()
                    current_balance = stock_row["quantity"] if stock_row else 0.0

                    if current_balance < qty:
                        cursor.execute("SELECT sku FROM products WHERE id = ?", (prod_id,))
                        sku_name = cursor.fetchone()["sku"]
                        raise ValueError(
                            f"INSUFFICIENT_STOCK: SKU '{sku_name}' requires {qty} units, but only {current_balance} are available at source location"
                        )

                    new_balance = current_balance - qty
                    cursor.execute(
                        "UPDATE stock_levels SET quantity = ?, updated_at = datetime('now') WHERE product_id = ? AND location_id = ?",
                        (new_balance, prod_id, src_loc_id),
                    )

                    # Immutable audit ledger entry
                    cursor.execute(
                        """
                        INSERT INTO stock_ledger (
                            operation_id, product_id, source_location_id, dest_location_id,
                            quantity, balance_after, timestamp, created_by
                        ) VALUES (?, ?, ?, NULL, ?, ?, datetime('now'), ?)
                        """,
                        (operation_id, prod_id, src_loc_id, qty, new_balance, user_id),
                    )

                elif op_type == OperationType.TRANSFER:
                    # Internal Transfer: Check source stock, decrement source, increment dest
                    cursor.execute(
                        "SELECT quantity FROM stock_levels WHERE product_id = ? AND location_id = ?",
                        (prod_id, src_loc_id),
                    )
                    src_stock_row = cursor.fetchone()
                    current_src_balance = src_stock_row["quantity"] if src_stock_row else 0.0

                    if current_src_balance < qty:
                        cursor.execute("SELECT sku FROM products WHERE id = ?", (prod_id,))
                        sku_name = cursor.fetchone()["sku"]
                        raise ValueError(
                            f"INSUFFICIENT_STOCK: SKU '{sku_name}' requires {qty} units for transfer, but only {current_src_balance} are available at source location"
                        )

                    new_src_balance = current_src_balance - qty
                    cursor.execute(
                        "UPDATE stock_levels SET quantity = ?, updated_at = datetime('now') WHERE product_id = ? AND location_id = ?",
                        (new_src_balance, prod_id, src_loc_id),
                    )

                    cursor.execute(
                        "SELECT quantity FROM stock_levels WHERE product_id = ? AND location_id = ?",
                        (prod_id, dst_loc_id),
                    )
                    dst_stock_row = cursor.fetchone()
                    if dst_stock_row:
                        new_dst_balance = dst_stock_row["quantity"] + qty
                        cursor.execute(
                            "UPDATE stock_levels SET quantity = ?, updated_at = datetime('now') WHERE product_id = ? AND location_id = ?",
                            (new_dst_balance, prod_id, dst_loc_id),
                        )
                    else:
                        new_dst_balance = qty
                        cursor.execute(
                            "INSERT INTO stock_levels (product_id, location_id, quantity, updated_at) VALUES (?, ?, ?, datetime('now'))",
                            (prod_id, dst_loc_id, new_dst_balance),
                        )

                    # Immutable audit ledger entry
                    cursor.execute(
                        """
                        INSERT INTO stock_ledger (
                            operation_id, product_id, source_location_id, dest_location_id,
                            quantity, balance_after, timestamp, created_by
                        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
                        """,
                        (operation_id, prod_id, src_loc_id, dst_loc_id, qty, new_dst_balance, user_id),
                    )

                elif op_type == OperationType.ADJUSTMENT:
                    # Physical Inventory Count Override
                    target_loc_id = dst_loc_id or src_loc_id
                    cursor.execute(
                        "SELECT quantity FROM stock_levels WHERE product_id = ? AND location_id = ?",
                        (prod_id, target_loc_id),
                    )
                    stock_row = cursor.fetchone()
                    current_balance = stock_row["quantity"] if stock_row else 0.0

                    counted_qty = qty
                    delta = counted_qty - current_balance

                    if stock_row:
                        cursor.execute(
                            "UPDATE stock_levels SET quantity = ?, updated_at = datetime('now') WHERE product_id = ? AND location_id = ?",
                            (counted_qty, prod_id, target_loc_id),
                        )
                    else:
                        cursor.execute(
                            "INSERT INTO stock_levels (product_id, location_id, quantity, updated_at) VALUES (?, ?, ?, datetime('now'))",
                            (prod_id, target_loc_id, counted_qty),
                        )

                    # Immutable audit ledger entry
                    src_ledger = None if delta >= 0 else target_loc_id
                    dst_ledger = target_loc_id if delta >= 0 else None
                    cursor.execute(
                        """
                        INSERT INTO stock_ledger (
                            operation_id, product_id, source_location_id, dest_location_id,
                            quantity, balance_after, timestamp, created_by
                        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
                        """,
                        (operation_id, prod_id, src_ledger, dst_ledger, abs(delta), counted_qty, user_id),
                    )

            # Mark operation as DONE with timestamp
            cursor.execute(
                """
                UPDATE operations
                SET status = ?, validated_at = datetime('now')
                WHERE id = ?
                """,
                (OperationStatus.DONE.value, operation_id),
            )

        return OperationService.get_operation_by_id(operation_id)
