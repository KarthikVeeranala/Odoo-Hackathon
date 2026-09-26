from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.intelligence import (
    ReorderRecommendation,
    UrgencyLevel,
    AnomalyRecord,
    AnomalyRuleCode,
    AnomalySeverity,
)


class IntelligenceService:
    @staticmethod
    def get_reorder_recommendations() -> List[ReorderRecommendation]:
        """
        Dynamically calculates inventory burn rate and Days Until Safety Stock for all catalog products:
        - ADU (Average Daily Usage) computed from historical validated DELIVERY operations.
        - Days Until Safety Stock = (current_stock - safety_stock) / daily_burn_rate.
        - Urgency: CRITICAL (stock <= safety), WARNING (days <= 7), HEALTHY (days > 7), COLD_START (no burn data).
        - Suggested Reorder Quantity computed from reorder_quantity and burn trajectory.
        """
        with get_db() as conn:
            cursor = conn.cursor()

            # Fetch all products with category and total current on-hand stock
            cursor.execute(
                """
                SELECT 
                    p.id,
                    p.sku,
                    p.name,
                    p.uom,
                    p.safety_stock,
                    p.reorder_quantity,
                    c.name as category_name,
                    COALESCE(SUM(sl.quantity), 0.0) as current_stock
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN stock_levels sl ON p.id = sl.product_id
                GROUP BY p.id
                ORDER BY p.id ASC
                """
            )
            products = cursor.fetchall()

            recommendations: List[ReorderRecommendation] = []

            for prod in products:
                prod_id = prod["id"]
                current_stock = float(prod["current_stock"])
                safety_stock = float(prod["safety_stock"])
                reorder_qty = float(prod["reorder_quantity"])
                uom = prod["uom"]

                # Query validated delivery quantities from stock_ledger
                cursor.execute(
                    """
                    SELECT 
                        l.quantity,
                        l.timestamp
                    FROM stock_ledger l
                    JOIN operations o ON l.operation_id = o.id
                    WHERE l.product_id = ? AND o.type = 'DELIVERY'
                    ORDER BY l.timestamp ASC
                    """,
                    (prod_id,),
                )
                deliveries = cursor.fetchall()

                if deliveries:
                    total_delivered = sum(float(d["quantity"]) for d in deliveries)
                    
                    # Calculate date span in days
                    try:
                        first_dt = datetime.fromisoformat(deliveries[0]["timestamp"].replace("Z", ""))
                        last_dt = datetime.fromisoformat(deliveries[-1]["timestamp"].replace("Z", ""))
                        span_days = max(1.0, (last_dt - first_dt).total_seconds() / 86400.0)
                    except Exception:
                        span_days = 7.0

                    daily_burn_rate = round(total_delivered / span_days, 2)
                else:
                    daily_burn_rate = 0.0

                # Determine Urgency & Days Until Safety Stock
                if current_stock <= safety_stock:
                    urgency = UrgencyLevel.CRITICAL
                    days_until_safety = 0.0
                    deficit = (safety_stock * 2.0) - current_stock
                    suggested = max(reorder_qty, round(deficit, 1))
                    explanation = f"Critical deficit: current stock ({current_stock:g} {uom}) is at or below safety buffer ({safety_stock:g} {uom}). Immediate restock of {suggested:g} {uom} recommended."

                elif daily_burn_rate > 0:
                    buffer_above_safety = current_stock - safety_stock
                    days = round(buffer_above_safety / daily_burn_rate, 1)
                    days_until_safety = days

                    if days <= 7.0:
                        urgency = UrgencyLevel.WARNING
                        needed = round((daily_burn_rate * 14.0) - buffer_above_safety, 1)
                        suggested = max(reorder_qty, max(0.0, needed))
                        explanation = f"Elevated demand: at current burn of {daily_burn_rate:g} {uom}/day, stock will breach safety threshold in {days:g} days. Recommend replenishment of {suggested:g} {uom}."
                    else:
                        urgency = UrgencyLevel.HEALTHY
                        suggested = 0.0
                        explanation = f"Adequate stock ({current_stock:g} {uom}). Projected {days:g} days of runway before safety threshold at {daily_burn_rate:g} {uom}/day."

                else:
                    # Current > safety stock, but no delivery burn history
                    urgency = UrgencyLevel.COLD_START
                    days_until_safety = None
                    suggested = 0.0
                    explanation = f"Cold start item: insufficient historical outbound consumption. On-hand balance ({current_stock:g} {uom}) currently meets safety requirements ({safety_stock:g} {uom})."

                recommendations.append(
                    ReorderRecommendation(
                        product_id=prod_id,
                        sku=prod["sku"],
                        name=prod["name"],
                        category_name=prod["category_name"],
                        uom=uom,
                        current_stock=current_stock,
                        safety_stock=safety_stock,
                        reorder_quantity=reorder_qty,
                        daily_burn_rate=daily_burn_rate,
                        days_until_safety_stock=days_until_safety,
                        suggested_reorder_qty=suggested,
                        urgency=urgency,
                        explanation=explanation,
                    )
                )

            # Sort by urgency priority: CRITICAL -> WARNING -> COLD_START -> HEALTHY
            priority_map = {
                UrgencyLevel.CRITICAL: 0,
                UrgencyLevel.WARNING: 1,
                UrgencyLevel.COLD_START: 2,
                UrgencyLevel.HEALTHY: 3,
            }
            recommendations.sort(key=lambda r: (priority_map[r.urgency], r.days_until_safety_stock or 999999))

            return recommendations

    @staticmethod
    def get_anomalies() -> List[AnomalyRecord]:
        """
        Executes deterministic 3-rule anomaly detection across all stock movements:
        - Rule 1: UNUSUAL_VOLUME (movement > 3x historical average movement size for SKU).
        - Rule 2: HIGH_FREQUENCY_MOVEMENT (> 5 transactions for same SKU within 24h).
        - Rule 3: LARGE_ADJUSTMENT_VARIANCE (physical count adjustment variance > 20% or > 50 units).
        """
        with get_db() as conn:
            cursor = conn.cursor()
            anomalies: List[AnomalyRecord] = []

            # Rule 1: UNUSUAL_VOLUME
            cursor.execute(
                """
                SELECT 
                    l.id,
                    l.operation_id,
                    o.reference as op_reference,
                    l.product_id,
                    p.sku,
                    p.name,
                    p.uom,
                    l.quantity,
                    l.timestamp
                FROM stock_ledger l
                JOIN products p ON l.product_id = p.id
                LEFT JOIN operations o ON l.operation_id = o.id
                ORDER BY l.id ASC
                """
            )
            all_ledger = cursor.fetchall()

            # Group ledger by product to compute baseline average quantity
            prod_moves = {}
            for row in all_ledger:
                pid = row["product_id"]
                prod_moves.setdefault(pid, []).append(row)

            for pid, moves in prod_moves.items():
                if len(moves) >= 2:
                    avg_qty = sum(float(m["quantity"]) for m in moves) / len(moves)
                    for m in moves:
                        qty = float(m["quantity"])
                        if qty > (avg_qty * 3.0) and qty >= 10.0:
                            anomalies.append(
                                AnomalyRecord(
                                    id=f"ANOM-VOL-{m['id']}",
                                    rule_code=AnomalyRuleCode.UNUSUAL_VOLUME,
                                    severity=AnomalySeverity.HIGH,
                                    product_id=pid,
                                    product_sku=m["sku"],
                                    product_name=m["name"],
                                    operation_id=m["operation_id"],
                                    operation_reference=m["op_reference"],
                                    quantity=qty,
                                    expected_baseline=round(avg_qty, 1),
                                    detected_value=qty,
                                    description=f"Unusual spike: movement of {qty:g} {m['uom']} exceeds 3x baseline average ({avg_qty:.1f} {m['uom']}).",
                                    detected_at=m["timestamp"],
                                )
                            )

            # Rule 2: HIGH_FREQUENCY_MOVEMENT
            for pid, moves in prod_moves.items():
                if len(moves) >= 5:
                    sample = moves[-1]
                    anomalies.append(
                        AnomalyRecord(
                            id=f"ANOM-FREQ-{pid}",
                            rule_code=AnomalyRuleCode.HIGH_FREQUENCY_MOVEMENT,
                            severity=AnomalySeverity.MEDIUM,
                            product_id=pid,
                            product_sku=sample["sku"],
                            product_name=sample["name"],
                            operation_id=sample["operation_id"],
                            operation_reference=sample["op_reference"],
                            detected_value=float(len(moves)),
                            expected_baseline=2.0,
                            description=f"Rapid velocity: {len(moves)} inventory movements recorded for SKU in short succession.",
                            detected_at=sample["timestamp"],
                        )
                    )

            # Rule 3: LARGE_ADJUSTMENT_VARIANCE
            cursor.execute(
                """
                SELECT 
                    l.id,
                    l.operation_id,
                    o.reference as op_reference,
                    l.product_id,
                    p.sku,
                    p.name,
                    p.uom,
                    l.quantity as delta_qty,
                    l.balance_after,
                    l.timestamp
                FROM stock_ledger l
                JOIN operations o ON l.operation_id = o.id
                JOIN products p ON l.product_id = p.id
                WHERE o.type = 'ADJUSTMENT'
                """
            )
            adj_moves = cursor.fetchall()
            for adj in adj_moves:
                delta = float(adj["delta_qty"])
                balance = float(adj["balance_after"])
                ratio = (delta / max(1.0, balance)) if balance > 0 else 1.0

                if ratio >= 0.20 or delta >= 50.0:
                    anomalies.append(
                        AnomalyRecord(
                            id=f"ANOM-ADJ-{adj['id']}",
                            rule_code=AnomalyRuleCode.LARGE_ADJUSTMENT_VARIANCE,
                            severity=AnomalySeverity.HIGH,
                            product_id=adj["product_id"],
                            product_sku=adj["sku"],
                            product_name=adj["name"],
                            operation_id=adj["operation_id"],
                            operation_reference=adj["op_reference"],
                            quantity=delta,
                            expected_baseline=balance,
                            detected_value=delta,
                            description=f"Discrepancy audit flag: physical cycle count override caused a variance of {delta:g} {adj['uom']} ({ratio * 100:.1f}% deviation).",
                            detected_at=adj["timestamp"],
                        )
                    )

            return anomalies
