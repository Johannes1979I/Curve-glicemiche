from typing import Dict, List, Tuple, Any


def evaluate_series(times: List[int], values: List[float], refs: Dict[str, Dict[str, float]]) -> Tuple[List[Dict[str, Any]], str]:
    rows = []
    severity = "normal"
    for idx, t in enumerate(times):
        v = values[idx] if idx < len(values) else 0
        ref = refs.get(str(t)) or refs.get(t) or {"min": 0, "max": 0}
        if v < ref["min"]:
            status = "low"
            severity = "warning" if severity == "normal" else severity
        elif v > ref["max"]:
            status = "high"
            severity = "danger" if severity in ("normal", "warning") else severity
        else:
            status = "normal"
        rows.append({"time": t, "value": v, "ref": ref, "status": status})
    return rows, severity


def interpret_exam(payload: Dict[str, Any]) -> Dict[str, Any]:
    glyc_times = payload.get("glyc_times", [])
    ins_times = payload.get("ins_times", [])
    glyc_values = payload.get("glyc_values", [])
    ins_values = payload.get("ins_values", [])
    glyc_refs = payload.get("glyc_refs", {})
    ins_refs = payload.get("ins_refs", {})
    pregnant = bool(payload.get("pregnant_mode", False))

    glyc_rows, glyc_sev = evaluate_series(glyc_times, glyc_values, glyc_refs)
    ins_rows, ins_sev = evaluate_series(ins_times, ins_values, ins_refs)

    overall = "normal"
    for sev in (glyc_sev, ins_sev):
        if sev == "danger":
            overall = "danger"
            break
        if sev == "warning" and overall == "normal":
            overall = "warning"

    gly_diag = None
    if 120 in glyc_times:
        i120 = glyc_times.index(120)
        v120 = glyc_values[i120] if i120 < len(glyc_values) else 0
        if pregnant:
            v0 = glyc_values[glyc_times.index(0)] if 0 in glyc_times and glyc_values else 0
            v60 = glyc_values[glyc_times.index(60)] if 60 in glyc_times and glyc_values else 0
            gdm = (v0 >= 92) or (v60 >= 180) or (v120 >= 153)
            if gdm:
                gly_diag = "Criteri IADPSG compatibili con diabete gestazionale (almeno un valore sopra soglia)."
                overall = "danger" if overall != "danger" else overall
            else:
                gly_diag = "Criteri IADPSG nei limiti."
        else:
            if v120 < 140:
                gly_diag = "Tolleranza glucidica normale."
            elif v120 < 200:
                gly_diag = "Ridotta tolleranza al glucosio (IGT)."
                overall = "warning" if overall == "normal" else overall
            else:
                gly_diag = "Valore suggestivo di diabete mellito (da confermare clinicamente)."
                overall = "danger"

    ins_diag = None
    if ins_times and ins_values:
        peak_val = max(ins_values)
        peak_idx = ins_values.index(peak_val)
        peak_time = ins_times[peak_idx]
        v0 = ins_values[0]
        v120 = ins_values[ins_times.index(120)] if 120 in ins_times else None

        if peak_time <= 60 and (v120 is None or v120 <= v0 * 3):
            ins_diag = "Pattern insulinemico nel range atteso."
        elif peak_time > 60:
            ins_diag = f"Picco insulinemico ritardato (picco a {peak_time}'). Possibile insulino-resistenza."
            overall = "warning" if overall == "normal" else overall
        elif v120 is not None and v120 > v0 * 3:
            ins_diag = "Ritorno lento verso il basale a 120'."
            overall = "warning" if overall == "normal" else overall

    summary_map = {
        "normal": "Referto complessivamente nei limiti di riferimento.",
        "warning": "Referto con alterazioni borderline/moderate da correlare clinicamente.",
        "danger": "Referto con alterazioni: necessaria valutazione medica."
    }

    return {
        "overall_status": overall,
        "summary": summary_map[overall],
        "details": {
            "glycemic_rows": glyc_rows,
            "insulin_rows": ins_rows,
            "glycemic_interpretation": gly_diag,
            "insulin_interpretation": ins_diag,
        },
    }
