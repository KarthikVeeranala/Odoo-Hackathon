import os
import tempfile
import pytest
from fastapi.testclient import TestClient

# Setup isolated test database
temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
temp_db.close()
os.environ["STOCKSENSE_DB_PATH"] = temp_db.name

from app.database import init_db
from app.main import app

init_db()
client = TestClient(app)


@pytest.fixture(scope="module")
def auth_token():
    """Creates a user and returns an authentication Bearer token."""
    res = client.post("/api/auth/signup", json={
        "name": "Inventory Admin",
        "email": "catalog_admin@stocksense.com",
        "password": "Password@123"
    })
    assert res.status_code == 201
    return res.json()["data"]["token"]


def test_get_categories():
    res = client.get("/api/categories")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]) >= 4
    codes = [c["code"] for c in data["data"]]
    assert "RAW" in codes
    assert "FAS" in codes


def test_product_creation_and_validation(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}

    # 1. Unauthenticated creation should fail 401
    unauth = client.post("/api/products", json={
        "sku": "RAW-STL-001",
        "name": "Steel Rods 10mm",
        "category_id": 1,
        "uom": "kg",
        "safety_stock": 30.0,
        "reorder_quantity": 100.0
    })
    assert unauth.status_code == 401

    # 2. Authenticated creation should succeed
    res = client.post("/api/products", headers=headers, json={
        "sku": "RAW-STL-001",
        "name": "Steel Rods 10mm",
        "category_id": 1,
        "uom": "kg",
        "safety_stock": 30.0,
        "reorder_quantity": 100.0
    })
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    prod = data["data"]
    assert prod["sku"] == "RAW-STL-001"
    assert prod["total_on_hand"] == 0.0
    assert prod["is_low_stock"] is True

    # 3. Duplicate SKU should fail 400
    dup = client.post("/api/products", headers=headers, json={
        "sku": "RAW-STL-001",
        "name": "Duplicate Steel",
        "category_id": 1,
        "uom": "kg"
    })
    assert dup.status_code == 400
    assert dup.json()["error"]["code"] == "SKU_EXISTS"

    # 4. Invalid category should fail 400
    bad_cat = client.post("/api/products", headers=headers, json={
        "sku": "BAD-CAT-001",
        "name": "Invalid Category Item",
        "category_id": 9999,
        "uom": "units"
    })
    assert bad_cat.status_code == 400
    assert bad_cat.json()["error"]["code"] == "CATEGORY_NOT_FOUND"


def test_product_listing_and_filtering(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    client.post("/api/products", headers=headers, json={
        "sku": "FAS-BLT-001",
        "name": "M8 Hex Bolts",
        "category_id": 2,
        "uom": "boxes",
        "safety_stock": 10.0,
        "reorder_quantity": 50.0
    })

    # List all
    res = client.get("/api/products")
    assert res.status_code == 200
    products = res.json()["data"]
    assert len(products) >= 2

    # Search filter
    search_res = client.get("/api/products?search=Hex")
    assert search_res.status_code == 200
    assert len(search_res.json()["data"]) == 1
    assert search_res.json()["data"][0]["sku"] == "FAS-BLT-001"

    # Low stock filter (both products currently have 0 on-hand, which is <= safety_stock)
    low_res = client.get("/api/products?low_stock=true")
    assert low_res.status_code == 200
    assert len(low_res.json()["data"]) >= 2


def test_product_detail_and_not_found():
    # Valid product detail
    res = client.get("/api/products/1")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["id"] == 1
    assert "locations" in data
    assert isinstance(data["locations"], list)

    # 404 for unknown product
    res_404 = client.get("/api/products/99999")
    assert res_404.status_code == 404
    assert res_404.json()["error"]["code"] == "PRODUCT_NOT_FOUND"


def test_warehouses_and_locations():
    # 1. Warehouses
    wh_res = client.get("/api/warehouses")
    assert wh_res.status_code == 200
    warehouses = wh_res.json()["data"]
    assert len(warehouses) >= 2
    wh1 = next(w for w in warehouses if w["code"] == "WH1")
    assert "Main Central Logistics Hub" in wh1["name"]

    # 2. Locations
    loc_res = client.get("/api/locations")
    assert loc_res.status_code == 200
    locations = loc_res.json()["data"]
    assert len(locations) >= 6

    # Verify utilization calculation fields
    loc = locations[0]
    assert "capacity" in loc
    assert "current_occupancy" in loc
    assert "utilization_percentage" in loc
    assert loc["current_occupancy"] == 0.0
    assert loc["utilization_percentage"] == 0.0

    # 3. Warehouse filtering
    loc_wh1 = client.get(f"/api/locations?warehouse_id={wh1['id']}")
    assert loc_wh1.status_code == 200
    for l in loc_wh1.json()["data"]:
        assert l["warehouse_id"] == wh1["id"]

    # 4. Location stock inspection
    stock_res = client.get(f"/api/locations/{loc['id']}/stock")
    assert stock_res.status_code == 200
    stock_data = stock_res.json()["data"]
    assert "location" in stock_data
    assert "items" in stock_data
    assert isinstance(stock_data["items"], list)

    # 5. Invalid location 404
    loc_404 = client.get("/api/locations/99999/stock")
    assert loc_404.status_code == 404
    assert loc_404.json()["error"]["code"] == "LOCATION_NOT_FOUND"
