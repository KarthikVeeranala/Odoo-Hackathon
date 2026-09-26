from typing import Optional
from app.database import get_db
from app.models.dashboard import DashboardKPIs


class DashboardService:
    @staticmethod
    def get_kpis(warehouse_id: Optional[int] = None) -> DashboardKPIs:
        """
        Dynamically computes the 5 core dashboard KPIs satisfying the strict frozen contract:
        1. total_products: count of catalog products
        2. low_stock_count: count of products with total on-hand <= safety_stock
        3. pending_receipts: count of operations with type='RECEIPT' and status in ('DRAFT', 'WAITING', 'READY')
        4. pending_deliveries: count of operations with type='DELIVERY' and status in ('DRAFT', 'WAITING', 'READY')
        5. internal_transfers_scheduled: count of operations with type='TRANSFER' and status in ('DRAFT', 'WAITING', 'READY')
        """
        with get_db() as conn:
            cursor = conn.cursor()

            # 1. Total products
            cursor.execute("SELECT COUNT(*) as count FROM products")
            total_products = cursor.fetchone()["count"]

            # 2. Low stock count
            if warehouse_id is not None:
                cursor.execute(
                    """
                    SELECT p.id, p.safety_stock, COALESCE(SUM(sl.quantity), 0.0) as on_hand
                    FROM products p
                    LEFT JOIN (
                        SELECT s.product_id, s.quantity
                        FROM stock_levels s
                        JOIN locations l ON s.location_id = l.id
                        WHERE l.warehouse_id = ?
                    ) sl ON p.id = sl.product_id
                    GROUP BY p.id
                    HAVING on_hand <= p.safety_stock
                    """,
                    (warehouse_id,),
                )
            else:
                cursor.execute(
                    """
                    SELECT p.id, p.safety_stock, COALESCE(SUM(sl.quantity), 0.0) as on_hand
                    FROM products p
                    LEFT JOIN stock_levels sl ON p.id = sl.product_id
                    GROUP BY p.id
                    HAVING on_hand <= p.safety_stock
                    """
                )
            low_stock_count = len(cursor.fetchall())

            # Helper for pending operations
            def get_pending_op_count(op_type: str) -> int:
                query = """
                    SELECT COUNT(*) as count
                    FROM operations
                    WHERE type = ? AND status IN ('DRAFT', 'WAITING', 'READY')
                """
                params = [op_type]
                if warehouse_id is not None:
                    query += " AND warehouse_id = ?"
                    params.append(warehouse_id)
                cursor.execute(query, params)
                return cursor.fetchone()["count"]

            # 3. Pending receipts
            pending_receipts = get_pending_op_count("RECEIPT")

            # 4. Pending deliveries
            pending_deliveries = get_pending_op_count("DELIVERY")

            # 5. Internal transfers scheduled
            internal_transfers_scheduled = get_pending_op_count("TRANSFER")

            return DashboardKPIs(
                total_products=total_products,
                low_stock_count=low_stock_count,
                pending_receipts=pending_receipts,
                pending_deliveries=pending_deliveries,
                internal_transfers_scheduled=internal_transfers_scheduled,
                warehouse_id=warehouse_id,
            )
