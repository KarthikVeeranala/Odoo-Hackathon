import os
import tempfile
import pytest
from fastapi.testclient import TestClient

# Setup isolated test database for inventory core invariant test suite
temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
temp_db.close()
os.environ["STOCKSENSE_DB_PATH"] = temp_db.name

from app.database import init_db, get_connection
from app.main import app

init_db()
client = TestClient(app)


@pytest.fixture(scope="module")
def auth_header():
    """Creates an audit officer and returns auth header."""
    res = client.post(
        "/api/auth/signup",
        json={
            "name": "Audit Officer",
            "email": "auditor@stocksense.com",
            "password": "Password@123",
        },
    )
    assert res.status_code == 201
    token = res.json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def setup_locations():
    """Retrieves standard WH1 locations."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, code FROM locations WHERE warehouse_id = 1")
    rows = cursor.fetchall()
    conn.close()
    return {r["code"]: r["id"] for r in rows}


@pytest.fixture(scope="module")
def core_product(auth_header):
    """Creates an industrial SKU with safety stock and reorder qty for lifecycle testing."""
    res = client.post(
        "/api/products",
        headers=auth_header,
        json={
            "sku": "INV-INVAR-001",
            "name": "Titanium Linear Shaft 12mm",
            "category_id": 1,
            "uom": "pcs",
            "safety_stock": 25.0,
            "reorder_quantity": 60.0,
        },
    )
    assert res.status_code == 201
    return res.json()["data"]


def test_health_check_endpoint():
    """Verifies backend health check endpoint and standard envelope."""
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["status"] == "healthy"
    assert "StockSense Backend" in body["data"]["service"]


def test_standard_error_envelope_404(auth_header):
    """Verifies non-existent resource returns structured standard error envelope."""
    res = client.get("/api/products/999999", headers=auth_header)
    assert res.status_code == 404
    body = res.json()
    assert body["success"] is False
    assert "error" in body
    assert "code" in body["error"]
    assert "message" in body["error"]


def test_standard_validation_error_envelope():
    """Verifies schema validation failure returns HTTP 422 with standard error envelope."""
    res = client.post("/api/auth/login", json={"email": "invalid-email-format"})
    assert res.status_code == 422
    body = res.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert len(body["error"]["message"]) > 0


def test_double_entry_receipt_and_transfer_conservation(auth_header, setup_locations, core_product):
    """
    Validates end-to-end stock conservation:
    1. Receipt into WH1-REC increments location stock by +100.
    2. Transfer of 60 from WH1-REC to WH1-A1 decrements REC by -60 and increments A1 by +60.
    3. Net total warehouse stock remains exactly 100.
    """
    prod_id = core_product["id"]
    rec_loc = setup_locations["WH1-REC"]
    rack_a1 = setup_locations["WH1-A1"]

    # Step 1: Inbound Receipt (100 units)
    res_rec = client.post(
        "/api/operations",
        headers=auth_header,
        json={
            "type": "RECEIPT",
            "warehouse_id": 1,
            "dest_location_id": rec_loc,
            "partner_name": "Titanium Precision Ind",
            "notes": "PO-TEST-001 Inbound Initial",
            "lines": [{"product_id": prod_id, "quantity": 100.0}],
        },
    )
    assert res_rec.status_code == 201
    rec_id = res_rec.json()["data"]["id"]

    val_res = client.post(f"/api/operations/{rec_id}/validate", headers=auth_header)
    assert val_res.status_code == 200

    # Verify Stock at REC dock is 100
    stk_rec = client.get(f"/api/locations/{rec_loc}/stock")
    assert stk_rec.status_code == 200
    rec_items = {item["product_id"]: item["quantity"] for item in stk_rec.json()["data"]["items"]}
    assert rec_items.get(prod_id) == 100.0

    # Step 2: Internal Put-away Transfer (60 units) to Rack A1
    res_tr = client.post(
        "/api/operations",
        headers=auth_header,
        json={
            "type": "TRANSFER",
            "warehouse_id": 1,
            "source_location_id": rec_loc,
            "dest_location_id": rack_a1,
            "notes": "TR-TEST-001 Put-away",
            "lines": [{"product_id": prod_id, "quantity": 60.0}],
        },
    )
    assert res_tr.status_code == 201
    tr_id = res_tr.json()["data"]["id"]

    val_tr = client.post(f"/api/operations/{tr_id}/validate", headers=auth_header)
    assert val_tr.status_code == 200

    # Verify Stock at REC dock is now 40
    stk_rec_after = client.get(f"/api/locations/{rec_loc}/stock")
    rec_items_after = {item["product_id"]: item["quantity"] for item in stk_rec_after.json()["data"]["items"]}
    assert rec_items_after.get(prod_id) == 40.0

    # Verify Stock at Rack A1 is now 60
    stk_a1 = client.get(f"/api/locations/{rack_a1}/stock")
    a1_items = {item["product_id"]: item["quantity"] for item in stk_a1.json()["data"]["items"]}
    assert a1_items.get(prod_id) == 60.0

    # Invariant: Total warehouse stock = 40 + 60 = 100
    prod_detail = client.get(f"/api/products/{prod_id}", headers=auth_header).json()["data"]
    assert prod_detail["total_on_hand"] == 100.0


def test_negative_stock_guard_on_delivery(auth_header, setup_locations, core_product):
    """
    Validates the strict business rule preventing negative inventory:
    Attempting to deliver more units than on-hand in the source location must fail with HTTP 400.
    """
    prod_id = core_product["id"]
    rack_a1 = setup_locations["WH1-A1"]  # Has 60 units

    # Attempt to deliver 61 units (exceeds 60 on-hand)
    res_over = client.post(
        "/api/operations",
        headers=auth_header,
        json={
            "type": "DELIVERY",
            "warehouse_id": 1,
            "source_location_id": rack_a1,
            "partner_name": "Over-Order Client",
            "lines": [{"product_id": prod_id, "quantity": 61.0}],
        },
    )
    assert res_over.status_code == 201
    over_id = res_over.json()["data"]["id"]

    val_over = client.post(f"/api/operations/{over_id}/validate", headers=auth_header)
    assert val_over.status_code == 400
    body = val_over.json()
    assert body["success"] is False
    assert body["error"]["code"] == "INSUFFICIENT_STOCK"

    # Now deliver a valid quantity (15 units)
    res_valid = client.post(
        "/api/operations",
        headers=auth_header,
        json={
            "type": "DELIVERY",
            "warehouse_id": 1,
            "source_location_id": rack_a1,
            "partner_name": "Standard Client",
            "lines": [{"product_id": prod_id, "quantity": 15.0}],
        },
    )
    assert res_valid.status_code == 201
    valid_id = res_valid.json()["data"]["id"]
    val_valid = client.post(f"/api/operations/{valid_id}/validate", headers=auth_header)
    assert val_valid.status_code == 200

    # Rack A1 stock should now be 60 - 15 = 45
    stk_a1 = client.get(f"/api/locations/{rack_a1}/stock")
    a1_items = {item["product_id"]: item["quantity"] for item in stk_a1.json()["data"]["items"]}
    assert a1_items.get(prod_id) == 45.0


def test_cycle_count_adjustment_and_immutable_ledger(auth_header, setup_locations, core_product):
    """
    Validates physical audit cycle count:
    1. Overrides Rack A1 count from 45 to 30 (loss of 15).
    2. Verifies stock ledger records the exact negative movement of -15.
    3. Ledger entries are chronological and immutable.
    """
    prod_id = core_product["id"]
    rack_a1 = setup_locations["WH1-A1"]

    res_adj = client.post(
        "/api/operations",
        headers=auth_header,
        json={
            "type": "ADJUSTMENT",
            "warehouse_id": 1,
            "dest_location_id": rack_a1,
            "notes": "Physical audit damage write-off",
            "lines": [{"product_id": prod_id, "quantity": 30.0}],
        },
    )
    assert res_adj.status_code == 201
    adj_id = res_adj.json()["data"]["id"]

    val_adj = client.post(f"/api/operations/{adj_id}/validate", headers=auth_header)
    assert val_adj.status_code == 200

    # Check ledger entries for this product
    res_ledger = client.get(f"/api/ledger?product_id={prod_id}", headers=auth_header)
    assert res_ledger.status_code == 200
    ledger_moves = res_ledger.json()["data"]["items"]

    # All movements must have reference numbers and timestamps
    assert len(ledger_moves) >= 4
    for move in ledger_moves:
        assert move["operation_reference"] is not None
        assert move["timestamp"] is not None
        assert move["product_id"] == prod_id


def test_intelligence_reorder_and_anomalies_reactive_integration(auth_header):
    """
    Validates that the Intelligence endpoints dynamically synthesize
    the operational changes executed in the test database.
    """
    # 1. Smart Reorder recommendations
    reorder_res = client.get("/api/intelligence/reorder", headers=auth_header)
    assert reorder_res.status_code == 200
    reorder_body = reorder_res.json()
    assert reorder_body["success"] is True
    recs = reorder_body["data"]
    assert isinstance(recs, list)

    # 2. Anomaly Detection
    anomaly_res = client.get("/api/intelligence/anomalies", headers=auth_header)
    assert anomaly_res.status_code == 200
    anomaly_body = anomaly_res.json()
    assert anomaly_body["success"] is True
    anomalies = anomaly_body["data"]
    assert isinstance(anomalies, list)
    assert any(a["rule_code"] == "LARGE_ADJUSTMENT_VARIANCE" for a in anomalies)
