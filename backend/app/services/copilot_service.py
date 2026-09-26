import re
from typing import Dict, Any, List, Optional
from app.database import get_db
from app.services.intelligence_service import IntelligenceService
from app.services.dashboard_service import DashboardService


class CopilotService:
    SUGGESTED_PROMPTS = [
        "Which products are critically low in stock?",
        "How much Cold Rolled Steel Rod is available across racks?",
        "What inbound receipts and outbound deliveries are pending?",
        "What inventory anomalies or audit variances were detected?",
        "Provide a high-level inventory and warehouse summary.",
    ]

    @classmethod
    def answer_query(cls, raw_query: str) -> Dict[str, Any]:
        query = (raw_query or "").strip().lower()

        # 1. Low stock / reorder intent
        if ("low" in query and "stock" in query) or any(w in query for w in ["low stock", "reorder", "runway", "safety stock", "critically low", "out of stock", "shortage", "restock"]):
            return cls._handle_reorder_query(raw_query)

        # 2. Anomaly / audit / discrepancy intent
        if any(w in query for w in ["anomal", "discrepan", "audit", "spike", "variance", "irregular"]):
            return cls._handle_anomaly_query(raw_query)

        # 3. Pending operations intent (receipts, deliveries, transfers)
        if any(w in query for w in ["pending", "receipt", "delivery", "transfer", "shipment", "inbound", "outbound", "intake"]):
            return cls._handle_operations_query(raw_query)

        # 4. Warehouse overview / KPI intent
        if any(w in query for w in ["overview", "summary", "kpi", "total", "health", "valuation", "status"]):
            return cls._handle_overview_query(raw_query)

        # 5. Product search / availability intent (e.g. "How much Steel", "Find Bolt", "Stock of motor")
        product_res = cls._handle_product_query(query, raw_query)
        if product_res:
            return product_res

        # 6. Fallback general assistant
        return cls._handle_general_fallback(raw_query)

    @classmethod
    def _handle_reorder_query(cls, raw_query: str) -> Dict[str, Any]:
        recs = IntelligenceService.get_reorder_recommendations()
        critical = [r for r in recs if r.urgency.value == "CRITICAL"]
        warning = [r for r in recs if r.urgency.value == "WARNING"]
        healthy = [r for r in recs if r.urgency.value == "HEALTHY"]

        items_to_display = (critical + warning)[:5]
        cards = []
        for r in items_to_display:
            runway_str = f"{r.days_until_safety_stock:.1f} days" if r.days_until_safety_stock is not None else "N/A"
            cards.append({
                "title": f"{r.sku} — {r.name}",
                "tag": r.urgency.value,
                "urgency": r.urgency.value,
                "metric": f"{r.current_stock} {r.uom} on hand",
                "detail": f"Safety Stock: {r.safety_stock} | Runway: {runway_str} | Suggested Restock: {r.suggested_reorder_qty} {r.uom}",
                "explanation": r.explanation,
            })

        summary = (
            f"### ⚠️ Reorder Intelligence Analysis\n\n"
            f"StockSense analyzed **{len(recs)} SKUs**:\n"
            f"- **{len(critical)} Critical SKUs** at or below safety stock.\n"
            f"- **{len(warning)} Warning SKUs** with <= 7 days runway.\n"
            f"- **{len(healthy)} Healthy SKUs** with adequate buffer.\n\n"
        )
        if critical:
            summary += f"**Immediate Action Needed:** Order restocks for `{critical[0].sku}` ({critical[0].name})."
        else:
            summary += "All inventory items currently maintain safe operational buffer levels."

        return {
            "query": raw_query,
            "intent": "LOW_STOCK",
            "summary": summary,
            "data_cards": cards,
            "action_link": "/reorder",
            "action_label": "View Smart Reorder Page",
            "suggested_prompts": cls.SUGGESTED_PROMPTS,
        }

    @classmethod
    def _handle_anomaly_query(cls, raw_query: str) -> Dict[str, Any]:
        anomalies = IntelligenceService.get_anomalies()
        high = [a for a in anomalies if a.severity.value == "HIGH"]
        cards = []
        for a in anomalies[:5]:
            metric_str = f"Observed: {a.detected_value} (Baseline: {a.expected_baseline})" if a.detected_value is not None else a.severity.value
            cards.append({
                "title": f"{a.product_sku} — {a.rule_code.value}",
                "tag": a.severity.value,
                "urgency": a.severity.value,
                "metric": metric_str,
                "detail": a.description,
            })

        summary = (
            f"### 🛡️ StockSense Anomaly Detection Engine\n\n"
            f"Detected **{len(anomalies)} operational anomalies** across live transactions:\n"
            f"- **{len(high)} High Severity Alerts** requiring warehouse supervisor review.\n"
            f"- Evaluated across 3 deterministic rules: *Unusual Volume*, *Rapid Velocity*, and *Audit Variances*.\n"
        )

        return {
            "query": raw_query,
            "intent": "ANOMALIES",
            "summary": summary,
            "data_cards": cards,
            "action_link": "/anomalies",
            "action_label": "Inspect Anomaly Engine",
            "suggested_prompts": cls.SUGGESTED_PROMPTS,
        }

    @classmethod
    def _handle_operations_query(cls, raw_query: str) -> Dict[str, Any]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT o.id, o.reference, o.type, o.status, o.partner_name, o.created_at,
                       w.code as warehouse_code,
                       COALESCE(SUM(ol.quantity), 0.0) as total_qty,
                       COUNT(ol.id) as line_count
                FROM operations o
                LEFT JOIN warehouses w ON o.warehouse_id = w.id
                LEFT JOIN operation_lines ol ON o.id = ol.operation_id
                WHERE o.status IN ('DRAFT', 'WAITING', 'READY')
                GROUP BY o.id
                ORDER BY o.id DESC
                LIMIT 8
                """
            )
            rows = cursor.fetchall()

        cards = []
        for r in rows:
            cards.append({
                "title": f"{r['reference']} ({r['type']})",
                "tag": r["status"],
                "urgency": "WARNING" if r["type"] == "RECEIPT" else "HEALTHY",
                "metric": f"{r['total_qty']} units ({r['line_count']} items)",
                "detail": f"Partner: {r['partner_name'] or 'Internal Logistics'} | Warehouse: {r['warehouse_code']}",
            })

        summary = (
            f"### 📋 Active Pending Operations\n\n"
            f"There are currently **{len(rows)} pending operations** awaiting warehouse fulfillment or receiving validation.\n"
        )

        return {
            "query": raw_query,
            "intent": "PENDING_OPERATIONS",
            "summary": summary,
            "data_cards": cards,
            "action_link": "/operations",
            "action_label": "Manage Operations",
            "suggested_prompts": cls.SUGGESTED_PROMPTS,
        }

    @classmethod
    def _handle_overview_query(cls, raw_query: str) -> Dict[str, Any]:
        kpis = DashboardService.get_kpis()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COALESCE(SUM(quantity), 0.0) as total_units FROM stock_levels")
            total_units = cursor.fetchone()["total_units"]
            cursor.execute("SELECT COUNT(*) as wh_count FROM warehouses")
            wh_count = cursor.fetchone()["wh_count"]
            cursor.execute("SELECT COUNT(*) as loc_count FROM locations")
            loc_count = cursor.fetchone()["loc_count"]

        summary = (
            f"### 📊 Executive Warehouse Inventory Summary\n\n"
            f"- **Total Catalog SKUs**: `{kpis.total_products}` items\n"
            f"- **Physical Units On Hand**: `{total_units:,.1f}` units across `{wh_count}` Warehouses and `{loc_count}` Location Bins\n"
            f"- **Low Stock SKUs**: `{kpis.low_stock_count}` requiring replenishment\n"
            f"- **Pending Inbound Receipts**: `{kpis.pending_receipts}` shipments\n"
            f"- **Pending Outbound Deliveries**: `{kpis.pending_deliveries}` orders\n"
            f"- **Scheduled Internal Transfers**: `{kpis.internal_transfers_scheduled}` moves\n"
        )

        cards = [
            {"title": "Total SKUs", "metric": str(kpis.total_products), "tag": "CATALOG"},
            {"title": "Low Stock Alerts", "metric": str(kpis.low_stock_count), "tag": "CRITICAL" if kpis.low_stock_count > 0 else "HEALTHY"},
            {"title": "Pending Inbounds", "metric": str(kpis.pending_receipts), "tag": "RECEIPTS"},
            {"title": "Pending Deliveries", "metric": str(kpis.pending_deliveries), "tag": "DELIVERIES"},
        ]

        return {
            "query": raw_query,
            "intent": "OVERVIEW",
            "summary": summary,
            "data_cards": cards,
            "action_link": "/",
            "action_label": "View Executive Dashboard",
            "suggested_prompts": cls.SUGGESTED_PROMPTS,
        }

    @classmethod
    def _handle_product_query(cls, query: str, raw_query: str) -> Optional[Dict[str, Any]]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, sku, name, uom, safety_stock, reorder_quantity FROM products")
            prods = cursor.fetchall()

            matched = []
            for p in prods:
                name_words = p["name"].lower().split()
                sku_clean = p["sku"].lower()
                if sku_clean in query or any(w in query and len(w) > 3 for w in name_words):
                    matched.append(p)

            if not matched:
                return None

            cards = []
            for m in matched[:4]:
                cursor.execute(
                    """
                    SELECT l.code as location_code, s.quantity
                    FROM stock_levels s
                    JOIN locations l ON s.location_id = l.id
                    WHERE s.product_id = ? AND s.quantity > 0
                    """,
                    (m["id"],),
                )
                locs = cursor.fetchall()
                total_on_hand = sum(l["quantity"] for l in locs)
                loc_breakdown = ", ".join([f"{l['location_code']}: {l['quantity']}" for l in locs]) or "No stock in bins"

                cards.append({
                    "title": f"{m['sku']} — {m['name']}",
                    "metric": f"{total_on_hand} {m['uom']} on hand",
                    "tag": "LOW STOCK" if total_on_hand <= m["safety_stock"] else "IN STOCK",
                    "urgency": "CRITICAL" if total_on_hand <= m["safety_stock"] else "HEALTHY",
                    "detail": f"Locations: {loc_breakdown} | Safety Stock: {m['safety_stock']} {m['uom']}",
                })

            summary = f"### 📦 Stock Query Results\nFound **{len(matched)} matching product(s)** for your query:"
            return {
                "query": raw_query,
                "intent": "SPECIFIC_PRODUCT",
                "summary": summary,
                "data_cards": cards,
                "action_link": "/products",
                "action_label": "Browse Catalog",
                "suggested_prompts": cls.SUGGESTED_PROMPTS,
            }

    @classmethod
    def _handle_general_fallback(cls, raw_query: str) -> Dict[str, Any]:
        summary = (
            f"Hello! I am your **StockSense AI Inventory Copilot**.\n\n"
            f"I have direct, real-time read-only access to your live SQLite inventory database, double-entry stock ledger, and predictive intelligence models.\n\n"
            f"**Ask me questions like:**\n"
            f"- *'Which products are low in stock?'*\n"
            f"- *'How much Cold Rolled Steel or Bolt stock do we have across racks?'*\n"
            f"- *'What inbound receipts or deliveries are pending?'*\n"
            f"- *'What operational anomalies or variances were detected?'*\n"
            f"- *'Give me an overall warehouse inventory summary.'*"
        )
        return {
            "query": raw_query,
            "intent": "GENERAL",
            "summary": summary,
            "data_cards": None,
            "action_link": None,
            "action_label": None,
            "suggested_prompts": cls.SUGGESTED_PROMPTS,
        }
