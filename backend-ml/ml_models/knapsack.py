"""
0/1 Knapsack with two capacity constraints (weight + volume) via DP.

Items are discretized into a bounded integer grid so the table stays tractable,
then the classic recurrence is solved exactly on that grid.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Any, Dict, List, Tuple


MAX_BINS = 80


def knapsack_optimize(
    items: List[Dict[str, Any]],
    max_weight: float,
    max_volume: float,
) -> Dict[str, Any]:
    if not items:
        return {
            "selected_items": [],
            "excluded_items": [],
            "total_weight": 0,
            "total_volume": 0,
            "total_priority": 0,
            "utilization": 0,
            "explanation": "No cargo items provided.",
            "confidence": 100.0,
            "algorithm": "2D 0/1 Knapsack DP",
            "table_size": "0",
        }

    max_weight = max(float(max_weight), 0.0)
    max_volume = max(float(max_volume), 0.0)

    w_unit = max_weight / MAX_BINS if max_weight > 0 else 1.0
    v_unit = max_volume / MAX_BINS if max_volume > 0 else 1.0
    max_w = MAX_BINS if max_weight > 0 else 0
    max_v = MAX_BINS if max_volume > 0 else 0

    scaled = []
    for i, item in enumerate(items):
        w = float(item.get("weight", 0) or 0)
        v = float(item.get("volume", 0) or 0)
        scaled.append({
            "id": i,
            "name": item.get("item_name", f"item-{i}"),
            "weight": w,
            "volume": v,
            "w_bin": min(max_w, max(0, int(round(w / w_unit)))) if max_weight > 0 else 0,
            "v_bin": min(max_v, max(0, int(round(v / v_unit)))) if max_volume > 0 else 0,
            "priority": float(item.get("priority", 5) or 0),
            "quantity": item.get("quantity", 1),
            "original": item,
        })

    n = len(scaled)

    @lru_cache(maxsize=None)
    def best(i: int, rw: int, rv: int) -> float:
        if i == n:
            return 0.0
        skip = best(i + 1, rw, rv)
        item = scaled[i]
        if item["w_bin"] <= rw and item["v_bin"] <= rv:
            take = item["priority"] + best(i + 1, rw - item["w_bin"], rv - item["v_bin"])
            return take if take > skip else skip
        return skip

    optimal_value = best(0, max_w, max_v)

    chosen = []
    rw, rv = max_w, max_v
    for i in range(n):
        item = scaled[i]
        skip = best(i + 1, rw, rv)
        can_take = item["w_bin"] <= rw and item["v_bin"] <= rv
        take = (item["priority"] + best(i + 1, rw - item["w_bin"], rv - item["v_bin"])) if can_take else float("-inf")
        if can_take and take >= skip - 1e-9:
            chosen.append(i)
            rw -= item["w_bin"]
            rv -= item["v_bin"]

    chosen_set = set(chosen)
    selected_items = []
    excluded_items = []
    total_weight = 0.0
    total_volume = 0.0

    for i, item in enumerate(scaled):
        original = item["original"]
        if i in chosen_set:
            selected_items.append({
                "item_name": item["name"],
                "quantity": item["quantity"],
                "weight": original.get("weight", item["weight"]),
                "volume": original.get("volume", item["volume"]),
                "priority": item["priority"],
                "reason": f"In optimal DP set (priority {item['priority']})",
            })
            total_weight += float(original.get("weight", item["weight"]) or 0)
            total_volume += float(original.get("volume", item["volume"]) or 0)
        else:
            if max_weight > 0 and item["weight"] > max_weight:
                reason = f"Exceeds weight limit ({item['weight']}kg > {max_weight}kg)"
            elif max_volume > 0 and item["volume"] > max_volume:
                reason = f"Exceeds volume limit ({item['volume']}m³ > {max_volume}m³)"
            else:
                reason = "Omitted by 0/1 DP — including it would reduce total priority under the constraints"
            excluded_items.append({
                "item_name": item["name"],
                "priority": item["priority"],
                "reason": reason,
            })

    weight_util = (total_weight / max_weight * 100) if max_weight > 0 else 0
    volume_util = (total_volume / max_volume * 100) if max_volume > 0 else 0
    table_states = n * (max_w + 1) * (max_v + 1)

    # DP is exact on the discretized instance; confidence reflects bin resolution.
    bin_error = 0.0
    for item in scaled:
        if max_weight > 0:
            bin_error += abs(item["weight"] - item["w_bin"] * w_unit)
        if max_volume > 0:
            bin_error += abs(item["volume"] - item["v_bin"] * v_unit)
    denom = sum(item["weight"] + item["volume"] for item in scaled) or 1.0
    confidence = round(max(85.0, min(99.5, 99.5 - 20.0 * (bin_error / denom))), 1)

    explanation = (
        f"2-constraint 0/1 knapsack DP selected {len(selected_items)}/{n} items "
        f"maximizing priority ({optimal_value:g}). Weight util {weight_util:.1f}%, "
        f"volume util {volume_util:.1f}%. Table states ≈ {table_states:,} "
        f"(weight bins={max_w}, volume bins={max_v}). "
        "Selection is optimal for the discretized capacities."
    )

    return {
        "selected_items": selected_items,
        "excluded_items": excluded_items,
        "total_weight": round(total_weight, 2),
        "total_volume": round(total_volume, 2),
        "total_priority": optimal_value,
        "utilization": round((weight_util + volume_util) / 2, 1),
        "explanation": explanation,
        "confidence": confidence,
        "algorithm": "2D Dynamic Programming (0/1 Knapsack, weight+volume)",
        "table_size": f"{n} items × {max_w} weight bins × {max_v} volume bins",
    }
