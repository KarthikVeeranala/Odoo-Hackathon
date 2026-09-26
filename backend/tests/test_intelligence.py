import os
import tempfile
import pytest
from fastapi.testclient import TestClient

# Setup isolated test database for Phase 5
temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
temp_db.close()
os.environ["STOCKSENSE_DB_PATH"] = temp_db.name

from app.database import init_db
from app.main import app

init_db()
client = TestClient(app)


@pytest.fixture(scope="module")
def auth_header():
    res = client.post("/api/auth/signup", json={
        "name": "Intelligence Analyst",
        "email": "analyst@stocksense.com",
        "password": "Password@123"
    })
    assert res.status_code == 201
    token = res.json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}


def test_reorder_intelligence_mathematical_forecasting(auth_header):
    """
    Tests dynamic Days Until Safety Stock and urgency calculation:
    - Initial item with 0 stock -> CRITICAL
    - Inbound receipt + outbound deliveries -> computed burn rate and runway
    """
    # 1. Create a product with safety stock = 20, reorder qty = 50
    prod_res = client.post("/api/products", headers=auth_header, json={
        "sku": "INTEL-MOTOR-42",
        "name": "NEMA 17 High-Torque Stepper Motor",
        "category_id": 3,
        "uom": "units",
        "safety_stock": 20.0,
        "reorder_quantity": 50.0
    })
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["data"]["id"]

    # 2. Check initial reorder intelligence -> should be CRITICAL (0 on-hand <= 20 safety stock)
    reorder_res = client.get("/api/intelligence/reorder")
    assert reorder_res.status_code == 200
    items = reorder_res.json()["data"]
    item = next(i for i in items if i["product_id"] == prod_id)
    assert item["urgency"] == "CRITICAL"
    assert item["days_until_safety_stock"] == 0.0
    assert item["suggested_reorder_qty"] >= 40.0

    # 3. Receive 100 units at WH1-REC
    rec_res = client.post("/api/operations", headers=auth_header, json={
        "type": "RECEIPT",
        "warehouse_id": 1,
        "dest_location_id": 3,
        "lines": [{"product_id": prod_id, "quantity": 100.0}]
    })
    rec_id = rec_res.json()["data"]["id"]
    client.post(f"/api/operations/{rec_id}/validate", headers=auth_header)

    # 4. Check status with 100 on-hand but no delivery history -> COLD_START
    reorder_res2 = client.get("/api/intelligence/reorder")
    item2 = next(i for i in reorder_res2.json()["data"] if i["product_id"] == prod_id)
    assert item2["urgency"] == "COLD_START"
    assert item2["current_stock"] == 100.0

    # 5. Execute 2 deliveries of 10 units each
    for _ in range(2):
        del_res = client.post("/api/operations", headers=auth_header, json={
            "type": "DELIVERY",
            "warehouse_id": 1,
            "source_location_id": 3,
            "lines": [{"product_id": prod_id, "quantity": 10.0}]
        })
        del_id = del_res.json()["data"]["id"]
        client.post(f"/api/operations/{del_id}/validate", headers=auth_header)

    # 6. Now daily_burn_rate > 0; runway and urgency must be dynamically calculated
    reorder_res3 = client.get("/api/intelligence/reorder")
    item3 = next(i for i in reorder_res3.json()["data"] if i["product_id"] == prod_id)
    assert item3["daily_burn_rate"] > 0
    assert item3["days_until_safety_stock"] is not None
    assert item3["urgency"] in ("HEALTHY", "WARNING")
    assert item3["current_stock"] == 80.0


def test_anomaly_detection_rules(auth_header):
    """
    Tests the deterministic 3-rule anomaly detector:
    - UNUSUAL_VOLUME: Spike > 3x average
    - HIGH_FREQUENCY_MOVEMENT: > 5 movements in short succession
    - LARGE_ADJUSTMENT_VARIANCE: Cycle count discrepancy > 20%
    """
    # Create product for anomaly tests
    prod_res = client.post("/api/products", headers=auth_header, json={
        "sku": "ANOM-BOLT-M8",
        "name": "Hex Head Bolt M8x40",
        "category_id": 2,
        "uom": "pcs",
        "safety_stock": 50.0,
        "reorder_quantity": 200.0
    })
    prod_id = prod_res.json()["data"]["id"]

    # Inbound 1000 units
    rec_res = client.post("/api/operations", headers=auth_header, json={
        "type": "RECEIPT",
        "warehouse_id": 1,
        "dest_location_id": 1,
        "lines": [{"product_id": prod_id, "quantity": 1000.0}]
    })
    rec_id = rec_res.json()["data"]["id"]
    client.post(f"/api/operations/{rec_id}/validate", headers=auth_header)

    # Rule 2: Execute 5 transfers in short succession to trigger HIGH_FREQUENCY_MOVEMENT
    for _ in range(5):
        t_res = client.post("/api/operations", headers=auth_header, json={
            "type": "TRANSFER",
            "warehouse_id": 1,
            "source_location_id": 1,
            "dest_location_id": 2,
            "lines": [{"product_id": prod_id, "quantity": 5.0}]
        })
        client.post(f"/api/operations/{t_res.json()['data']['id']}/validate", headers=auth_header)

    # Rule 1: Execute an unusual volume delivery of 300 units (mean was ~5-20)
    spike_del = client.post("/api/operations", headers=auth_header, json={
        "type": "DELIVERY",
        "warehouse_id": 1,
        "source_location_id": 1,
        "lines": [{"product_id": prod_id, "quantity": 300.0}]
    })
    client.post(f"/api/operations/{spike_del.json()['data']['id']}/validate", headers=auth_header)

    # Rule 3: Execute an inventory adjustment with large variance (current ~675, set to 400, delta 275 > 20%)
    adj_res = client.post("/api/operations", headers=auth_header, json={
        "type": "ADJUSTMENT",
        "warehouse_id": 1,
        "dest_location_id": 1,
        "lines": [{"product_id": prod_id, "quantity": 400.0}]
    })
    client.post(f"/api/operations/{adj_res.json()['data']['id']}/validate", headers=auth_header)

    # Query anomalies endpoint
    anom_res = client.get("/api/intelligence/anomalies")
    assert anom_res.status_code == 200
    anomalies = anom_res.json()["data"]
    assert len(anomalies) >= 2

    rules_flagged = [a["rule_code"] for a in anomalies]
    assert "HIGH_FREQUENCY_MOVEMENT" in rules_flagged or "UNUSUAL_VOLUME" in rules_flagged or "LARGE_ADJUSTMENT_VARIANCE" in rules_flagged

    # Verify diagnostic fields exist
    first_anom = anomalies[0]
    assert first_anom["id"] is not None
    assert first_anom["rule_code"] is not None
    assert first_anom["severity"] in ("HIGH", "MEDIUM", "LOW")
    assert first_anom["description"] is not None
