from typing import Optional, List, Dict, Any
from app.database import get_db
from app.models.product import ProductCreate


class CatalogService:
    @staticmethod
    def get_categories() -> List[Dict[str, Any]]:
        """Returns all product categories."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, code FROM categories ORDER BY name ASC")
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_products(
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        low_stock: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """Returns products with dynamically calculated total_on_hand and is_low_stock."""
        query = """
            SELECT 
                p.id, p.sku, p.name, p.category_id, c.name as category_name,
                p.uom, p.safety_stock, p.reorder_quantity,
                COALESCE(SUM(s.quantity), 0.0) as total_on_hand
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stock_levels s ON p.id = s.product_id
            WHERE 1=1
        """
        params: list = []

        if category_id is not None:
            query += " AND p.category_id = ?"
            params.append(category_id)

        if search:
            query += " AND (p.name LIKE ? OR p.sku LIKE ?)"
            term = f"%{search.strip()}%"
            params.extend([term, term])

        query += " GROUP BY p.id ORDER BY p.name ASC"

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()

        results = []
        for row in rows:
            item = dict(row)
            item["total_on_hand"] = float(item["total_on_hand"])
            item["safety_stock"] = float(item["safety_stock"])
            item["reorder_quantity"] = float(item["reorder_quantity"])
            item["is_low_stock"] = bool(item["total_on_hand"] <= item["safety_stock"])

            if low_stock is not None:
                if low_stock and not item["is_low_stock"]:
                    continue
                if not low_stock and item["is_low_stock"]:
                    continue

            results.append(item)

        return results

    @staticmethod
    def create_product(data: ProductCreate) -> Dict[str, Any]:
        """Creates a new product in the catalog."""
        clean_sku = data.sku.strip().upper()
        clean_name = data.name.strip()

        with get_db() as conn:
            cursor = conn.cursor()

            # Check category exists
            cursor.execute("SELECT id, name FROM categories WHERE id = ?", (data.category_id,))
            cat = cursor.fetchone()
            if not cat:
                raise ValueError("CATEGORY_NOT_FOUND: The specified category does not exist")

            # Check SKU uniqueness
            cursor.execute("SELECT id FROM products WHERE sku = ?", (clean_sku,))
            if cursor.fetchone():
                raise ValueError("SKU_EXISTS: A product with this SKU already exists")

            cursor.execute("""
                INSERT INTO products (sku, name, category_id, uom, safety_stock, reorder_quantity)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (clean_sku, clean_name, data.category_id, data.uom.strip(), data.safety_stock, data.reorder_quantity))
            product_id = cursor.lastrowid

            return {
                "id": product_id,
                "sku": clean_sku,
                "name": clean_name,
                "category_id": data.category_id,
                "category_name": cat["name"],
                "uom": data.uom.strip(),
                "safety_stock": float(data.safety_stock),
                "reorder_quantity": float(data.reorder_quantity),
                "total_on_hand": 0.0,
                "is_low_stock": True,
            }

    @staticmethod
    def get_product_by_id(product_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves a single product with full location distribution breakdown."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    p.id, p.sku, p.name, p.category_id, c.name as category_name,
                    p.uom, p.safety_stock, p.reorder_quantity,
                    COALESCE(SUM(s.quantity), 0.0) as total_on_hand
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN stock_levels s ON p.id = s.product_id
                WHERE p.id = ?
                GROUP BY p.id
            """, (product_id,))
            prod = cursor.fetchone()
            if not prod:
                return None

            item = dict(prod)
            item["total_on_hand"] = float(item["total_on_hand"])
            item["safety_stock"] = float(item["safety_stock"])
            item["reorder_quantity"] = float(item["reorder_quantity"])
            item["is_low_stock"] = bool(item["total_on_hand"] <= item["safety_stock"])

            # Query stock per location
            cursor.execute("""
                SELECT 
                    s.location_id, l.name as location_name, l.code as location_code,
                    w.name as warehouse_name, s.quantity
                FROM stock_levels s
                JOIN locations l ON s.location_id = l.id
                JOIN warehouses w ON l.warehouse_id = w.id
                WHERE s.product_id = ?
                ORDER BY w.name, l.name
            """, (product_id,))
            item["locations"] = [dict(loc) for loc in cursor.fetchall()]

            return item

    @staticmethod
    def get_warehouses() -> List[Dict[str, Any]]:
        """Returns all warehouses."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, code, name, address FROM warehouses ORDER BY code ASC")
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_locations(warehouse_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Returns locations with current occupancy and utilization percentage."""
        query = """
            SELECT 
                l.id, l.warehouse_id, w.name as warehouse_name,
                l.code, l.name, l.type, l.capacity,
                COALESCE(SUM(s.quantity), 0.0) as current_occupancy
            FROM locations l
            JOIN warehouses w ON l.warehouse_id = w.id
            LEFT JOIN stock_levels s ON l.id = s.location_id
            WHERE 1=1
        """
        params: list = []
        if warehouse_id is not None:
            query += " AND l.warehouse_id = ?"
            params.append(warehouse_id)

        query += " GROUP BY l.id ORDER BY l.code ASC"

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()

        results = []
        for row in rows:
            item = dict(row)
            capacity = float(item["capacity"])
            occupancy = float(item["current_occupancy"])
            item["capacity"] = capacity
            item["current_occupancy"] = occupancy
            item["utilization_percentage"] = round((occupancy / capacity) * 100, 1) if capacity > 0 else 0.0
            results.append(item)

        return results

    @staticmethod
    def get_location_stock(location_id: int) -> Optional[Dict[str, Any]]:
        """Returns location metadata and all active items held inside."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    l.id, l.warehouse_id, w.name as warehouse_name,
                    l.code, l.name, l.type, l.capacity,
                    COALESCE(SUM(s.quantity), 0.0) as current_occupancy
                FROM locations l
                JOIN warehouses w ON l.warehouse_id = w.id
                LEFT JOIN stock_levels s ON l.id = s.location_id
                WHERE l.id = ?
                GROUP BY l.id
            """, (location_id,))
            loc_row = cursor.fetchone()
            if not loc_row:
                return None

            loc = dict(loc_row)
            capacity = float(loc["capacity"])
            occupancy = float(loc["current_occupancy"])
            loc["capacity"] = capacity
            loc["current_occupancy"] = occupancy
            loc["utilization_percentage"] = round((occupancy / capacity) * 100, 1) if capacity > 0 else 0.0

            cursor.execute("""
                SELECT 
                    s.product_id, p.sku as product_sku, p.name as product_name,
                    s.quantity, p.uom,
                    (s.quantity <= p.safety_stock) as is_low_stock
                FROM stock_levels s
                JOIN products p ON s.product_id = p.id
                WHERE s.location_id = ? AND s.quantity > 0
                ORDER BY p.name ASC
            """, (location_id,))
            items = [dict(r) for r in cursor.fetchall()]

            return {
                "location": loc,
                "items": items,
            }
