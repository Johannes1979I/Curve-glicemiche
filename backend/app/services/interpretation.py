from __future__ import annotations
from typing import Dict, Any, List


def _norm_interp(v: str | None) -> str:
    s = (v or "").strip().upper()
    if s in {"S", "SUSCETTIBILE", "SENSITIVE"}:
        return "S"
    if s in {"I", "INTERMEDIO", "INCREASED EXPOSURE"}:
        return "I"
    if s in {"R", "RESISTENTE", "RESISTANT"}:
        return "R"
    return "-"


def _parse_mic(v: str | None) -> float | None:
    if not v:
        return None
    s = str(v).replace(",", ".")
    cleaned = "".join(ch for ch in s if ch.isdigit() or ch == ".")
    try:
        return float(cleaned)
    except Exception:
        return None


AWARE_PRIORITY = {"Access": 0, "Watch": 1, "Reserve": 2, "Other": 3, None: 4, "": 4}


def _fmt_names(names: List[str]) -> str:
    names = [str(x).strip() for x in (names or []) if str(x).strip()]
    return ", ".join(names)


def _resistance_patterns(specimen: str, resistant: List[dict]) -> List[str]:
    names = [str(x.get("antibiotic_name") or "").lower() for x in resistant]
    patterns: List[str] = []

    has_fq = any(("cipro" in n) or ("levoflox" in n) for n in names)
    has_ceph3 = any(("ceftriax" in n) or ("cefotax" in n) or ("ceftaz" in n) for n in names)
    has_carb = any(("meropen" in n) or ("imipenem" in n) or ("ertapen" in n) for n in names)

    if len(resistant) >= 3:
        patterns.append("Multi-resistenza (MDR) sospetta: almeno 3 antibiotici classificati R.")
    if has_fq and has_ceph3:
        patterns.append("Pattern compatibile con possibile ESBL: resistenza a fluorochinoloni e cefalosporine di III generazione.")
    if has_carb:
        patterns.append("Attenzione: resistenza ai carbapenemi nel pannello testato.")
    if specimen == "feci" and len(resistant) >= 2:
        patterns.append("Nelle infezioni enteriche valutare terapia antibiotica solo se clinicamente indicata.")

    return patterns


def interpret_exam(payload: Dict[str, Any]) -> Dict[str, Any]:
    specimen = str(payload.get("specimen_type") or "").lower()
    growth = str(payload.get("growth_result") or "positive").lower()
    organism = (payload.get("microorganism") or "").strip()
    entries = payload.get("antibiogram") or []

    normalized = []
    for e in entries:
        row = dict(e)
        row["interpretation"] = _norm_interp(row.get("interpretation"))
        row["commercial_names"] = row.get("commercial_names") or []
        row["mic_numeric"] = _parse_mic(row.get("mic"))
        normalized.append(row)

    sensitive = [e for e in normalized if e.get("interpretation") == "S"]
    intermediate = [e for e in normalized if e.get("interpretation") == "I"]
    resistant = [e for e in normalized if e.get("interpretation") == "R"]

    # Stewardship: Access -> Watch -> Reserve, poi MIC crescente, poi alfabetico
    recommended = sorted(
        sensitive,
        key=lambda x: (
            AWARE_PRIORITY.get(x.get("aware_group"), 4),
            x.get("mic_numeric") if x.get("mic_numeric") is not None else 999999.0,
            str(x.get("antibiotic_name", "")).lower(),
        ),
    )
    first_choice = recommended[0] if recommended else None

    warnings: List[str] = []
    if growth == "negative":
        summary = "Nessuna crescita significativa nel campione inviato."
    else:
        target = organism if organism else "microrganismo isolato"
        if recommended:
            rec_short = []
            for r in recommended[:6]:
                comm = _fmt_names(r.get("commercial_names") or [])
                if comm:
                    rec_short.append(f"{r.get('antibiotic_name')} (esempi: {comm})")
                else:
                    rec_short.append(str(r.get("antibiotic_name")))
            summary = (
                f"{target}: antibiotici risultati sensibili nel pannello testato -> "
                + "; ".join(rec_short)
                + "."
            )
        else:
            summary = (
                f"{target}: nessun antibiotico classificato come sensibile (S) nel pannello inserito. "
                "Valutare consulto infettivologico e ulteriore AST."
            )

    if specimen == "feci":
        warnings.append(
            "Nei quadri enterici molte infezioni sono autolimitanti: l'antibiotico si valuta solo se clinicamente indicato."
        )
    if growth != "negative":
        warnings.append(
            "La scelta terapeutica finale deve considerare sede infezione, dosaggio, allergie, gravidanza, funzione renale ed epidemiologia locale."
        )

    return {
        "sensitive": sensitive,
        "intermediate": intermediate,
        "resistant": resistant,
        "recommended": recommended,
        "first_choice": first_choice,
        "resistance_patterns": _resistance_patterns(specimen, resistant),
        "summary": summary,
        "warnings": warnings,
    }
