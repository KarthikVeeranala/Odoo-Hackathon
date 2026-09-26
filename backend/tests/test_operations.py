import os
import tempfile
import pytest
from fastapi.testclient import TestClient

# Setup isolated test database for operations test suite
temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
temp_db.close()
os.environ["STOCKSENSE_DB_PATH"] = temp_db.name

from app.database import init_db, get_connection
from app.main import app

init_db()
client = TestClient(app)


@pytest.fixture(scope="module")
def auth_header():
    """Registers an admin user and yields the Authorization Bearer header."""
    res = client.post("/api/auth/signup", json={
        "name": "Operations Manager",
        "email": "ops_manager@stocksense.com",
        "password": "Password@123"
    })
    assert res.status_code == 201
    token = res.json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def setup_locations():
    """Fetches seeded location IDs for WH1."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, code, name FROM locations WHERE warehouse_id = 1")
    rows = cursor.fetchall()
    conn.close()
    loc_map = {r["code"]: r["id"] for r in rows}
    return loc_map


@pytest.fixture(scope="module")
def test_product(auth_header):
    """Creates a distinct test product for operations."""
    res = client.post("/api/products", headers=auth_header, json={
        "sku": "SKU-BEARING-608",
        "name": "Precision Ball Bearing 608ZZ",
        "category_id": 2,  # Fasteners
        "uom": "pcs",
        "safety_stock": 20.0,
        "reorder_quantity": 50.0
    })
    assert res.status_code == 201
    return res.json()["data"]


def test_create_and_validate_receipt(auth_header, setup_locations, test_product):
    """Tests creating an inbound Receipt draft and validating it to increment stock."""
    rec_loc_id = setup_locations["WH1-REC"]
    prod_id = test_product["id"]

    # 1. Create Receipt Draft
    res = client.post("/api/operations", headers=auth_header, json={
        "type": "RECEIPT",
        "warehouse_id": 1,
        "dest_location_id": rec_loc_id,
        "partner_name": "Acme Industrial Bearings Ltd",
        "notes": "Incoming batch PO-9912",
        "lines": [
            {"product_id": prod_id, "quantity": 100.0}
        ]
    })
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["reference"].startswith("WH/IN/")
    assert data["status"] == "DRAFT"
    assert data["line_count"] == 1
    assert data["total_quantity"] == 100.0
    op_id = data["id"]

    # 2. Validate Receipt
    val_res = client.post(f"/api/operations/{op_id}/validate", headers=auth_header)
    assert val_res.status_code == 200
    val_data = val_res.json()["data"]
    assert val_data["status"] == "DONE"
    assert val_data["validated_at"] is not None

    # 3. Verify stock at WH1-REC is now 100
    loc_stock_res = client.get(f"/api/locations/{rec_loc_id}/stock")
    assert loc_stock_res.status_code == 200
    items = loc_stock_res.json()["data"]["items"]
    rec_item = next(i for i in items if i["product_id"] == prod_id)
    assert rec_item["quantity"] == 100.0


def test_create_and_validate_delivery(auth_header, setup_locations, test_product):
    """Tests delivering stock from WH1-REC, reducing on-hand balance."""
    rec_loc_id = setup_locations["WH1-REC"]
    prod_id = test_product["id"]

    # 1. Create Delivery Draft for 30 units
    res = client.post("/api/operations", headers=auth_header, json={
        "type": "DELIVERY",
        "warehouse_id": 1,
        "source_location_id": rec_loc_id,
        "partner_name": "Apex Robotics Corp",
        "notes": "Sales Order SO-4401",
        "lines": [
            {"product_id": prod_id, "quantity": 30.0}
        ]
    })
    assert res.status_code == 201
    op_id = res.json()["data"]["id"]

    # 2. Validate Delivery
    val_res = client.post(f"/api/operations/{op_id}/validate", headers=auth_header)
    assert val_res.status_code == 200
    assert val_res.json()["data"]["status"] == "DONE"

    # 3. Verify remaining stock at WH1-REC is 70
    loc_stock_res = client.get(f"/api/locations/{rec_loc_id}/stock")
    items = loc_stock_res.json()["data"]["items"]
    rec_item = next(i for i in items if i["product_id"] == prod_id)
    assert rec_item["quantity"] == 70.0


def test_delivery_insufficient_stock_rollback(auth_header, setup_locations, test_product):
    """
    Tests negative stock protection:
    Attempting to deliver 80 units when only 70 are in WH1-REC must fail with 400 INSUFFICIENT_STOCK
    and leave balance untouched at 70.
    """
    rec_loc_id = setup_locations["WH1-REC"]
    prod_id = test_product["id"]

    # 1. Create Delivery Draft for 80 units (exceeding 70)
    res = client.post("/api/operations", headers=auth_header, json={
        "type": "DELIVERY",
        "warehouse_id": 1,
        "source_location_id": rec_loc_id,
        "partner_name": "Over-order Client",
        "lines": [
            {"product_id": prod_id, "quantity": 80.0}
        ]
    })
    assert res.status_code == 201
    op_id = res.json()["data"]["id"]

    # 2. Attempt validation -> must reject with 400
    val_res = client.post(f"/api/operations/{op_id}/validate", headers=auth_header)
    assert val_res.status_code == 400
    err = val_res.json()["error"]
    assert err["code"] == "INSUFFICIENT_STOCK"

    # 3. Verify on-hand stock was NOT modified (atomic rollback)
    loc_stock_res = client.get(f"/api/locations/{rec_loc_id}/stock")
    items = loc_stock_res.json()["data"]["items"]
    rec_item = next(i for i in items if i["product_id"] == prod_id)
    assert rec_item["quantity"] == 70.0


def test_internal_transfer_between_locations(auth_header, setup_locations, test_product):
    """
    Tests moving 40 units from WH1-REC to WH1-A1 (Rack A1).
    Total company stock must remain 70.
    """
    src_id = setup_locations["WH1-REC"]
    dst_id = setup_locations["WH1-A1"]
    prod_id = test_product["id"]

    # 1. Create Transfer Draft
    res = client.post("/api/operations", headers=auth_header, json={
        "type": "TRANSFER",
        "warehouse_id": 1,
        "source_location_id": src_id,
        "dest_location_id": dst_id,
        "notes": "Relocate from receiving to storage bay",
        "lines": [
            {"product_id": prod_id, "quantity": 40.0}
        ]
    })
    assert res.status_code == 201
    op_id = res.json()["data"]["id"]

    # 2. Validate Transfer
    val_res = client.post(f"/api/operations/{op_id}/validate", headers=auth_header)
    assert val_res.status_code == 200

    # 3. Check source location (70 - 40 = 30)
    src_stock = client.get(f"/api/locations/{src_id}/stock").json()["data"]["items"]
    src_item = next(i for i in src_stock if i["product_id"] == prod_id)
    assert src_item["quantity"] == 30.0

    # 4. Check destination location (0 + 40 = 40)
    dst_stock = client.get(f"/api/locations/{dst_id}/stock").json()["data"]["items"]
    dst_item = next(i for i in dst_stock if i["product_id"] == prod_id)
    assert dst_item["quantity"] == 40.0

    # 5. Check total on-hand on product detail (30 + 40 = 70)
    prod_res = client.get(f"/api/products/{prod_id}")
    assert prod_res.json()["data"]["total_on_hand"] == 70.0


def test_inventory_adjustment_override(auth_header, setup_locations, test_product):
    """Tests physical inventory count adjustment on WH1-A1 overriding stock from 40 to 35."""
    loc_id = setup_locations["WH1-A1"]
    prod_id = test_product["id"]

    res = client.post("/api/operations", headers=auth_header, json={
        "type": "ADJUSTMENT",
        "warehouse_id": 1,
        "dest_location_id": loc_id,
        "notes": "Cycle count audit: found 35 actual units",
        "lines": [
            {"product_id": prod_id, "quantity": 35.0}
        ]
    })
    assert res.status_code == 201
    op_id = res.json()["data"]["id"]

    val_res = client.post(f"/api/operations/{op_id}/validate", headers=auth_header)
    assert val_res.status_code == 200

    # Verify updated stock at WH1-A1
    dst_stock = client.get(f"/api/locations/{loc_id}/stock").json()["data"]["items"]
    dst_item = next(i for i in dst_stock if i["product_id"] == prod_id)
    assert dst_item["quantity"] == 35.0


def test_cancel_draft_operation(auth_header, setup_locations, test_product):
    """Tests canceling an uncompleted draft operation."""
    rec_loc_id = setup_locations["WH1-REC"]
    prod_id = test_product["id"]

    res = client.post("/api/operations", headers=auth_header, json={
        "type": "RECEIPT",
        "warehouse_id": 1,
        "dest_location_id": rec_loc_id,
        "lines": [
            {"product_id": prod_id, "quantity": 10.0}
        ]
    })
    op_id = res.json()["data"]["id"]

    # Cancel operation
    cancel_res = client.post(f"/api/operations/{op_id}/cancel", headers=auth_header)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["data"]["status"] == "CANCELED"

    # Attempting to validate a canceled operation should fail
    val_res = client.post(f"/api/operations/{op_id}/validate", headers=auth_header)
    assert val_res.status_code == 400


def test_list_and_filter_operations(auth_header):
    """Tests listing operations with filters."""
    res_all = client.get("/api/operations")
    assert res_all.status_code == 200
    all_ops = res_all.json()["data"]
    assert len(all_ops) >= 4

    res_receipts = client.get("/api/operations?type=RECEIPT")
    assert res_receipts.status_code == 200
    receipts = res_receipts.json()["data"]
    assert all(r["type"] == "RECEIPT" for r in receipts)

    res_done = client.get("/api/operations?status=DONE")
    assert res_done.status_code == 200
    done_ops = res_done.json()["data"]
    assert all(d["status"] == "DONE" for d in done_ops)
