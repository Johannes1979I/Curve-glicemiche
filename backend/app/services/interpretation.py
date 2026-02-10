from typing import Dict, List, Tuple, Any


def _to_float(value: Any) -> float | None:
    """Converte in float gestendo None/stringhe vuote/virgola decimale."""
    if value is None:
        return None
    if isinstance(value, str):
        s = value.strip().replace(",", ".")
        if s == "":
            return None
        try:
            return float(s)
        except ValueError:
            return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def evaluate_series(
    times: List[int],
    values: List[float],
    refs: Dict[str, Dict[str, float]],
) -> Tuple[List[Dict[str, Any]], str]:
    """
    Valuta una serie rispetto ai range di riferimento.
    - I valori mancanti/non numerici NON generano warning.
    """
    rows: List[Dict[str, Any]] = []
    severity = "normal"

    for idx, t in enumerate(times):
        raw_v = values[idx] if idx < len(values) else None
        v = _to_float(raw_v)

        ref = refs.get(str(t)) or refs.get(t) or {"min": 0, "max": 0}
        rmin = _to_float(ref.get("min")) if isinstance(ref, dict) else None
        rmax = _to_float(ref.get("max")) if isinstance(ref, dict) else None
        rmin = rmin if rmin is not None else 0.0
        rmax = rmax if rmax is not None else 0.0

        if v is None:
            status = "missing"
        elif v < rmin:
            status = "low"
            if severity == "normal":
                severity = "warning"
        elif v > rmax:
            status = "high"
            if severity in ("normal", "warning"):
                severity = "danger"
        else:
            status = "normal"

        rows.append(
            {
                "time": t,
                "value": v,
                "ref": {"min": rmin, "max": rmax},
                "status": status,
            }
        )

    return rows, severity


def interpret_exam(payload: Dict[str, Any]) -> Dict[str, Any]:
    glyc_times = payload.get("glyc_times", []) or []
    glyc_values = payload.get("glyc_values", []) or []
    glyc_refs = payload.get("glyc_refs", {}) or {}

    # Insulina attiva solo se esplicitamente richiesta (flag) o modalità combinata
    include_insulin = bool(payload.get("include_insulin")) or payload.get("curve_mode") == "combined"

    ins_times = payload.get("ins_times", []) if include_insulin else []
    ins_values = payload.get("ins_values", []) if include_insulin else []
    ins_refs = payload.get("ins_refs", {}) if include_insulin else {}

    pregnant = bool(payload.get("pregnant_mode", False))

    glyc_rows, glyc_sev = evaluate_series(glyc_times, glyc_values, glyc_refs)
    if include_insulin:
        ins_rows, ins_sev = evaluate_series(ins_times, ins_values, ins_refs)
    else:
        ins_rows, ins_sev = [], "normal"

    overall = "normal"
    for sev in (glyc_sev, ins_sev):
        if sev == "danger":
            overall = "danger"
            break
        if sev == "warning" and overall == "normal":
            overall = "warning"

    def pick_gly(t: int) -> float | None:
        if t not in glyc_times:
            return None
        idx = glyc_times.index(t)
        raw = glyc_values[idx] if idx < len(glyc_values) else None
        return _to_float(raw)

    gly_diag = None
    v120 = pick_gly(120)
    if v120 is not None:
        if pregnant:
            v0 = pick_gly(0)
            v60 = pick_gly(60)
            gdm = (v0 is not None and v0 >= 92) or (v60 is not None and v60 >= 180) or (v120 >= 153)

            if gdm:
                gly_diag = "Criteri IADPSG compatibili con diabete gestazionale (almeno un valore sopra soglia)."
                if overall != "danger":
                    overall = "danger"
            else:
                gly_diag = "Criteri IADPSG nei limiti."
        else:
            if v120 < 140:
                gly_diag = "Tolleranza glucidica normale."
            elif v120 < 200:
                gly_diag = "Ridotta tolleranza al glucosio (IGT)."
                if overall == "normal":
                    overall = "warning"
            else:
                gly_diag = "Valore suggestivo di diabete mellito (da confermare clinicamente)."
                overall = "danger"

    ins_diag = None
    if include_insulin and ins_times and ins_values:
        normalized = [_to_float(v) for v in ins_values]
        numeric_pairs = [(i, v) for i, v in enumerate(normalized) if v is not None]

        if numeric_pairs:
            peak_idx, peak_val = max(numeric_pairs, key=lambda x: x[1])
            peak_time = ins_times[peak_idx] if peak_idx < len(ins_times) else None

            v0 = normalized[0] if len(normalized) > 0 else None
            idx120 = ins_times.index(120) if 120 in ins_times else -1
            v120_ins = normalized[idx120] if idx120 >= 0 and idx120 < len(normalized) else None

            if peak_time is not None:
                if peak_time <= 60 and (v120_ins is None or v0 is None or v120_ins <= v0 * 3):
                    ins_diag = "Pattern insulinemico nel range atteso."
                elif peak_time > 60:
                    ins_diag = f"Picco insulinemico ritardato (picco a {peak_time}'). Possibile insulino-resistenza."
                    if overall == "normal":
                        overall = "warning"
                elif v120_ins is not None and v0 is not None and v120_ins > v0 * 3:
                    ins_diag = "Ritorno lento verso il basale a 120'."
                    if overall == "normal":
                        overall = "warning"

    summary_map = {
        "normal": "Referto complessivamente nei limiti di riferimento.",
        "warning": "Referto con alterazioni da correlare clinicamente.",
        "danger": "Referto con alterazioni: necessaria valutazione medica.",
    }

    return {
        "overall_status": overall,
        "summary": summary_map[overall],
        "details": {
            "glycemic_rows": glyc_rows,
            "insulin_rows": ins_rows,
            "glycemic_interpretation": gly_diag,
            "insulin_interpretation": ins_diag if include_insulin else None,
        },
    }
