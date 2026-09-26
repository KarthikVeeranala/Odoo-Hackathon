from typing import Optional, List, Any
from app.database import get_db
from app.models.ledger import LedgerEntryResponse, PaginatedLedgerResponse


class LedgerService:
    @staticmethod
    def get_ledger_entries(
        product_id: Optional[int] = None,
        location_id: Optional[int] = None,
        operation_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> PaginatedLedgerResponse:
        """
        Retrieves immutable chronological stock movement ledger records with pagination and filtering.
        """
        limit = max(1, min(limit, 200))
        offset = max(0, offset)

        with get_db() as conn:
            cursor = conn.cursor()

            where_clauses = ["1=1"]
            params: List[Any] = []

            if product_id is not None:
                where_clauses.append("l.product_id = ?")
                params.append(product_id)

            if location_id is not None:
                where_clauses.append("(l.source_location_id = ? OR l.dest_location_id = ?)")
                params.extend([location_id, location_id])

            if operation_type:
                where_clauses.append("o.type = ?")
                params.append(operation_type.upper())

            where_sql = " AND ".join(where_clauses)

            # Count total matching rows
            count_query = f"""
                SELECT COUNT(*) as total
                FROM stock_ledger l
                LEFT JOIN operations o ON l.operation_id = o.id
                WHERE {where_sql}
            """
            cursor.execute(count_query, params)
            total_count = cursor.fetchone()["total"]

            # Fetch page items
            query = f"""
                SELECT 
                    l.id,
                    l.operation_id,
                    o.reference as operation_reference,
                    o.type as operation_type,
                    l.product_id,
                    p.sku as product_sku,
                    p.name as product_name,
                    p.uom as product_uom,
                    l.source_location_id,
                    sl.code as source_location_code,
                    sl.name as source_location_name,
                    l.dest_location_id,
                    dl.code as dest_location_code,
                    dl.name as dest_location_name,
                    l.quantity,
                    l.balance_after,
                    l.timestamp,
                    l.created_by,
                    u.name as created_by_name
                FROM stock_ledger l
                JOIN products p ON l.product_id = p.id
                LEFT JOIN operations o ON l.operation_id = o.id
                LEFT JOIN locations sl ON l.source_location_id = sl.id
                LEFT JOIN locations dl ON l.dest_location_id = dl.id
                LEFT JOIN users u ON l.created_by = u.id
                WHERE {where_sql}
                ORDER BY l.timestamp DESC, l.id DESC
                LIMIT ? OFFSET ?
            """
            fetch_params = list(params) + [limit, offset]
            cursor.execute(query, fetch_params)
            rows = cursor.fetchall()

            items = [
                LedgerEntryResponse(
                    id=r["id"],
                    operation_id=r["operation_id"],
                    operation_reference=r["operation_reference"],
                    operation_type=r["operation_type"],
                    product_id=r["product_id"],
                    product_sku=r["product_sku"],
                    product_name=r["product_name"],
                    product_uom=r["product_uom"],
                    source_location_id=r["source_location_id"],
                    source_location_code=r["source_location_code"],
                    source_location_name=r["source_location_name"],
                    dest_location_id=r["dest_location_id"],
                    dest_location_code=r["dest_location_code"],
                    dest_location_name=r["dest_location_name"],
                    quantity=r["quantity"],
                    balance_after=r["balance_after"],
                    timestamp=r["timestamp"],
                    created_by=r["created_by"],
                    created_by_name=r["created_by_name"],
                )
                for r in rows
            ]

            return PaginatedLedgerResponse(
                items=items,
                total_count=total_count,
                limit=limit,
                offset=offset,
            )
