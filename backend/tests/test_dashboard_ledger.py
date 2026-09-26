import os
import tempfile
import pytest
from fastapi.testclient import TestClient

# Setup isolated test database for Phase 4
temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
temp_db.close()
os.environ["STOCKSENSE_DB_PATH"] = temp_db.name

from app.database import init_db
from app.main import app

init_db()
client = TestClient(app)


@pytest.fixture(scope="module")
def auth_header():
    """Creates a user and returns authentication Bearer header."""
    res = client.post("/api/auth/signup", json={
        "name": "Warehouse Director",
        "email": "director@stocksense.com",
        "password": "Password@123"
    })
    assert res.status_code == 201
    token = res.json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}


def test_dashboard_kpis_contract(auth_header):
    """
    Validates that GET /api/dashboard/kpis strictly fulfills the frozen 5 KPI contract:
    - total_products
    - low_stock_count
    - pending_receipts
    - pending_deliveries
    - internal_transfers_scheduled
    """
    res = client.get("/api/dashboard/kpis")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    kpis = data["data"]

    assert "total_products" in kpis
    assert "low_stock_count" in kpis
    assert "pending_receipts" in kpis
    assert "pending_deliveries" in kpis
    assert "internal_transfers_scheduled" in kpis

    assert isinstance(kpis["total_products"], int)
    assert isinstance(kpis["low_stock_count"], int)
    assert isinstance(kpis["pending_receipts"], int)
    assert isinstance(kpis["pending_deliveries"], int)
    assert isinstance(kpis["internal_transfers_scheduled"], int)


def test_dashboard_kpis_dynamic_reactivity(auth_header):
    """
    Verifies that dashboard KPIs update dynamically on operational events without static mocks:
    - Creating a low-stock product increases low_stock_count.
    - Creating operations increases pending counts.
    - Validating operations decrements pending counts and resolves low stock.
    """
    # 1. Base KPIs
    base_kpis = client.get("/api/dashboard/kpis").json()["data"]

    # 2. Create product with safety stock = 50.0 (on-hand = 0, so low-stock)
    prod_res = client.post("/api/products", headers=auth_header, json={
        "sku": "KPI-TEST-001",
        "name": "Dynamic KPI Widget Sensor",
        "category_id": 3,  # Electrical
        "uom": "pcs",
        "safety_stock": 50.0,
        "reorder_quantity": 100.0
    })
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["data"]["id"]

    after_prod_kpis = client.get("/api/dashboard/kpis").json()["data"]
    assert after_prod_kpis["total_products"] == base_kpis["total_products"] + 1
    assert after_prod_kpis["low_stock_count"] == base_kpis["low_stock_count"] + 1

    # 3. Create Draft Operations for all types
    # A. Draft Receipt
    rec_res = client.post("/api/operations", headers=auth_header, json={
        "type": "RECEIPT",
        "warehouse_id": 1,
        "dest_location_id": 3,  # WH1-REC
        "lines": [{"product_id": prod_id, "quantity": 120.0}]
    })
    assert rec_res.status_code == 201
    rec_id = rec_res.json()["data"]["id"]

    # B. Draft Delivery
    del_res = client.post("/api/operations", headers=auth_header, json={
        "type": "DELIVERY",
        "warehouse_id": 1,
        "source_location_id": 1,  # WH1-A1
        "lines": [{"product_id": 1, "quantity": 5.0}]  # Existing seeded product
    })
    assert del_res.status_code == 201

    # C. Draft Transfer
    trans_res = client.post("/api/operations", headers=auth_header, json={
        "type": "TRANSFER",
        "warehouse_id": 1,
        "source_location_id": 3,
        "dest_location_id": 1,
        "lines": [{"product_id": prod_id, "quantity": 20.0}]
    })
    assert trans_res.status_code == 201

    # Check pending counts
    pending_kpis = client.get("/api/dashboard/kpis").json()["data"]
    assert pending_kpis["pending_receipts"] == base_kpis["pending_receipts"] + 1
    assert pending_kpis["pending_deliveries"] == base_kpis["pending_deliveries"] + 1
    assert pending_kpis["internal_transfers_scheduled"] == base_kpis["internal_transfers_scheduled"] + 1

    # 4. Validate Receipt -> receiving 120 units
    val_res = client.post(f"/api/operations/{rec_id}/validate", headers=auth_header)
    assert val_res.status_code == 200

    # Pending receipt should decrease, and on-hand (120) > safety stock (50) resolves low stock!
    post_val_kpis = client.get("/api/dashboard/kpis").json()["data"]
    assert post_val_kpis["pending_receipts"] == base_kpis["pending_receipts"]
    assert post_val_kpis["low_stock_count"] == base_kpis["low_stock_count"]


def test_immutable_ledger_queries_and_pagination(auth_header):
    """
    Verifies that GET /api/ledger returns complete audit log items with pagination and filters.
    """
    # 1. Fetch all ledger items
    res = client.get("/api/ledger")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "items" in data
    assert "total_count" in data
    assert data["total_count"] >= 1

    first_item = data["items"][0]
    assert first_item["product_sku"] is not None
    assert first_item["product_name"] is not None
    assert first_item["balance_after"] is not None
    assert first_item["timestamp"] is not None

    # 2. Test pagination: limit=1, offset=0
    page_res = client.get("/api/ledger?limit=1&offset=0")
    assert page_res.status_code == 200
    page_data = page_res.json()["data"]
    assert len(page_data["items"]) == 1
    assert page_data["limit"] == 1
    assert page_data["offset"] == 0

    # 3. Filter by operation_type=RECEIPT
    filtered_res = client.get("/api/ledger?operation_type=RECEIPT")
    assert filtered_res.status_code == 200
    filtered_items = filtered_res.json()["data"]["items"]
    assert all(i["operation_type"] == "RECEIPT" for i in filtered_items)
