import sqlite3
import os
from datetime import datetime, timedelta
from app.database import get_db, init_db
from app.services.auth_service import hash_password
from app.services.operation_service import OperationService
from app.models.operation import OperationCreate, OperationLineCreate, OperationType


def seed_database():
    """
    Populates StockSense with an authentic, production-grade warehouse scenario:
    - 2 Warehouses, 6 Locations, 4 Categories, 8 Industrial Products
    - Authoritative on-hand stock balances across storage racks
    - Historical validated inbound receipts, outbound customer deliveries, and bin transfers
    - Historical deliveries to drive Smart Reorder ADU burn rates and safety runway calculations
    - Physical cycle count audit overrides driving Anomaly Detection
    - Active pending DRAFT operations driving Executive Dashboard KPI counters
    """
    print("[INIT] Initializing database schema...")
    init_db()

    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Admin & Demo Operators
        cursor.execute("SELECT id FROM users WHERE email = 'admin@stocksense.com'")
        user = cursor.fetchone()
        if not user:
            pwd_hash, salt = hash_password("Password@123")
            cursor.execute(
                """
                INSERT INTO users (email, name, password_hash, salt, role, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
                """,
                ("admin@stocksense.com", "Chief Logistics Officer", pwd_hash, salt, "admin"),
            )
            admin_id = cursor.lastrowid
            print("  [OK] Seeded Admin User (admin@stocksense.com / Password@123)")
        else:
            admin_id = user["id"]

        # 2. Warehouses & Locations (if not present)
        cursor.execute("SELECT id FROM warehouses WHERE code = 'WH1'")
        wh1 = cursor.fetchone()
        wh1_id = wh1["id"] if wh1 else 1

        cursor.execute("SELECT id, code FROM locations WHERE warehouse_id = ?", (wh1_id,))
        loc_rows = cursor.fetchall()
        loc_map = {r["code"]: r["id"] for r in loc_rows}

        # 3. Catalog Products
        products_spec = [
            ("RAW-STL-001", "Cold Rolled Steel Rods 10mm", 1, "kg", 40.0, 100.0),
            ("RAW-ALU-002", "Aluminum Alloy Sheet 4x8ft", 1, "sheets", 20.0, 50.0),
            ("FAS-BLT-M8", "Hex Flange Bolt M8x40 Grade 8.8", 2, "pcs", 200.0, 500.0),
            ("FAS-NUT-M8", "Nylon Insert Lock Nut M8", 2, "pcs", 200.0, 500.0),
            ("ELE-MOT-01", "NEMA 17 High-Torque Stepper Motor", 3, "units", 15.0, 40.0),
            ("ELE-DRV-02", "A4988 Stepper Motor Driver Module", 3, "units", 25.0, 60.0),
            ("FG-BOT-001", "Autonomous Mobile Robotic Base v2", 4, "units", 5.0, 15.0),
            ("FG-CTR-002", "Industrial PLC Control Cabinet 24V", 4, "units", 3.0, 10.0),
        ]

        prod_map = {}
        for sku, name, cat_id, uom, safety, reorder in products_spec:
            cursor.execute("SELECT id FROM products WHERE sku = ?", (sku,))
            row = cursor.fetchone()
            if not row:
                cursor.execute(
                    """
                    INSERT INTO products (sku, name, category_id, uom, safety_stock, reorder_quantity, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                    """,
                    (sku, name, cat_id, uom, safety, reorder),
                )
                prod_map[sku] = cursor.lastrowid
            else:
                prod_map[sku] = row["id"]

        print(f"  [OK] Seeded {len(prod_map)} Industrial Catalog SKUs")

    # 4. Create Operations (Receipts, Transfers, Deliveries)
    rec_loc = loc_map.get("WH1-REC", 3)
    rack_a1 = loc_map.get("WH1-A1", 1)
    rack_a2 = loc_map.get("WH1-A2", 2)

    # Initial Inbound PO Receipts
    receipt_payload = OperationCreate(
        type=OperationType.RECEIPT,
        warehouse_id=wh1_id,
        dest_location_id=rec_loc,
        partner_name="Apex Precision Metals & Components",
        notes="PO-8801 Master Inbound Consignment",
        lines=[
            OperationLineCreate(product_id=prod_map["RAW-STL-001"], quantity=150.0),
            OperationLineCreate(product_id=prod_map["RAW-ALU-002"], quantity=80.0),
            OperationLineCreate(product_id=prod_map["FAS-BLT-M8"], quantity=800.0),
            OperationLineCreate(product_id=prod_map["FAS-NUT-M8"], quantity=750.0),
            OperationLineCreate(product_id=prod_map["ELE-MOT-01"], quantity=60.0),
            OperationLineCreate(product_id=prod_map["ELE-DRV-02"], quantity=100.0),
            OperationLineCreate(product_id=prod_map["FG-BOT-001"], quantity=12.0),
            OperationLineCreate(product_id=prod_map["FG-CTR-002"], quantity=8.0),
        ],
    )
    op_rec = OperationService.create_operation(receipt_payload, user_id=admin_id)
    OperationService.validate_operation(op_rec.id, user_id=admin_id)
    print("  [OK] Validated Inbound Supplier PO Receipt (Initial Stock Intake)")

    # Put-Away Internal Transfers from Receiving Dock to Storage Racks
    transfer_payload = OperationCreate(
        type=OperationType.TRANSFER,
        warehouse_id=wh1_id,
        source_location_id=rec_loc,
        dest_location_id=rack_a1,
        notes="Put-away transfer from dock to Rack A1",
        lines=[
            OperationLineCreate(product_id=prod_map["RAW-STL-001"], quantity=120.0),
            OperationLineCreate(product_id=prod_map["RAW-ALU-002"], quantity=60.0),
            OperationLineCreate(product_id=prod_map["FAS-BLT-M8"], quantity=600.0),
            OperationLineCreate(product_id=prod_map["ELE-MOT-01"], quantity=45.0),
        ],
    )
    op_tr1 = OperationService.create_operation(transfer_payload, user_id=admin_id)
    OperationService.validate_operation(op_tr1.id, user_id=admin_id)

    transfer_payload2 = OperationCreate(
        type=OperationType.TRANSFER,
        warehouse_id=wh1_id,
        source_location_id=rec_loc,
        dest_location_id=rack_a2,
        notes="Put-away transfer from dock to Rack A2",
        lines=[
            OperationLineCreate(product_id=prod_map["FAS-NUT-M8"], quantity=500.0),
            OperationLineCreate(product_id=prod_map["ELE-DRV-02"], quantity=80.0),
            OperationLineCreate(product_id=prod_map["FG-BOT-001"], quantity=10.0),
            OperationLineCreate(product_id=prod_map["FG-CTR-002"], quantity=6.0),
        ],
    )
    op_tr2 = OperationService.create_operation(transfer_payload2, user_id=admin_id)
    OperationService.validate_operation(op_tr2.id, user_id=admin_id)
    print("  [OK] Validated Internal Put-away Transfers to Storage Racks A1 & A2")

    # Outbound Deliveries to establish dynamic burn rates (Smart Reorder)
    delivery_payload = OperationCreate(
        type=OperationType.DELIVERY,
        warehouse_id=wh1_id,
        source_location_id=rack_a1,
        partner_name="Nexus Robotics Assembly Corp",
        notes="SO-3101 Production Line Fulfillment",
        lines=[
            OperationLineCreate(product_id=prod_map["ELE-MOT-01"], quantity=15.0),
            OperationLineCreate(product_id=prod_map["FAS-BLT-M8"], quantity=150.0),
        ],
    )
    op_del1 = OperationService.create_operation(delivery_payload, user_id=admin_id)
    OperationService.validate_operation(op_del1.id, user_id=admin_id)

    # Physical Cycle Count Adjustment (triggers Anomaly Detection Rule 3)
    adj_payload = OperationCreate(
        type=OperationType.ADJUSTMENT,
        warehouse_id=wh1_id,
        dest_location_id=rack_a1,
        notes="Annual physical count discrepancy audit",
        lines=[
            # Bolt stock was 450, override to 360 (delta 90 > 20% variance)
            OperationLineCreate(product_id=prod_map["FAS-BLT-M8"], quantity=360.0),
        ],
    )
    op_adj = OperationService.create_operation(adj_payload, user_id=admin_id)
    OperationService.validate_operation(op_adj.id, user_id=admin_id)
    print("  [OK] Validated Cycle Count Inventory Adjustment (Variance Logged)")

    # Active Pending Operations (DRAFT state for Dashboard KPIs)
    pending_rec = OperationCreate(
        type=OperationType.RECEIPT,
        warehouse_id=wh1_id,
        dest_location_id=rec_loc,
        partner_name="Global Fasteners & Hardware Ltd",
        notes="PO-9942 Scheduled for tomorrow morning intake",
        lines=[
            OperationLineCreate(product_id=prod_map["FAS-BLT-M8"], quantity=400.0),
        ],
    )
    OperationService.create_operation(pending_rec, user_id=admin_id)

    pending_del = OperationCreate(
        type=OperationType.DELIVERY,
        warehouse_id=wh1_id,
        source_location_id=rack_a2,
        partner_name="CyberMotion Robotics GmbH",
        notes="SO-4402 Outbound staging",
        lines=[
            OperationLineCreate(product_id=prod_map["FG-BOT-001"], quantity=2.0),
        ],
    )
    OperationService.create_operation(pending_del, user_id=admin_id)

    pending_tr = OperationCreate(
        type=OperationType.TRANSFER,
        warehouse_id=wh1_id,
        source_location_id=rec_loc,
        dest_location_id=rack_a1,
        notes="Replenishment relocation to primary picking face",
        lines=[
            OperationLineCreate(product_id=prod_map["RAW-STL-001"], quantity=20.0),
        ],
    )
    OperationService.create_operation(pending_tr, user_id=admin_id)
    print("  [OK] Created Active DRAFT Operations (Pending Receipts, Deliveries, Transfers)")

    print("\n[DONE] StockSense Database successfully seeded with authentic live operational data!")


if __name__ == "__main__":
    seed_database()
