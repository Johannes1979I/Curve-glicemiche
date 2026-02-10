from __future__ import annotations

import json
from datetime import date
from sqlalchemy.orm import Session

from .. import models


DEFAULT_GLYC_REFS = {
    "0": {"min": 60, "max": 100},
    "30": {"min": 110, "max": 160},
    "60": {"min": 120, "max": 180},
    "90": {"min": 90, "max": 150},
    "120": {"min": 60, "max": 140},
    "180": {"min": 60, "max": 110},
}

PREGNANT_GLYC_REFS = {
    "0": {"min": 60, "max": 92},
    "30": {"min": 100, "max": 170},
    "60": {"min": 100, "max": 180},
    "90": {"min": 80, "max": 165},
    "120": {"min": 60, "max": 153},
    "180": {"min": 60, "max": 110},
}

# Nota clinica: per l'insulina OGTT non esiste uno standard unico universalmente condiviso.
# I range sono quindi configurabili e adattabili al metodo analitico locale.
DEFAULT_INS_REFS = {
    "0": {"min": 2, "max": 25},
    "30": {"min": 20, "max": 100},
    "60": {"min": 20, "max": 120},
    "90": {"min": 20, "max": 100},
    "120": {"min": 6, "max": 60},
    "180": {"min": 2, "max": 30},
}

DEFAULT_SOURCES = [
    "ADA Standards of Care in Diabetes—2026 (Diagnosis and Classification of Diabetes)",
    "ADA Diabetes Diagnosis & Tests (criteri OGTT/FPG/A1C, aggiornamento continuo)",
    "IDF Global Clinical Practice Recommendations 2025",
    "WHO guideline: Hyperglycaemia first detected in pregnancy (criteri OMS)",
    "IADPSG Consensus (75 g OGTT gravidanza: 92/180/153 mg/dL)",
    "Clinical Chemistry / ADA insulin standardization: variabilità dei dosaggi insulinici",
]

DEFAULT_METHODS = {
    "glyc": "Metodo enzimatico (Esochinasi/G6PDH) - Fotometria UV",
    "ins": "Immunodosaggio in Chemiluminescenza (CLIA / ECLIA)",
}

DEFAULT_NOTES = (
    "Le soglie diagnostiche principali OGTT sono allineate alle linee guida internazionali. "
    "I punti intermedi (30/90/180) e la curva insulinemica sono configurabili dal laboratorio "
    "in base a metodica analitica e popolazione di riferimento."
)

DATASET_NAME = "Global Endocrine Guideline Profile"
DATASET_VERSION = "2026.02.10"


def _new_default_profile() -> models.ReferenceProfile:
    return models.ReferenceProfile(
        profile_key="global-endocrine-consensus-v2",
        profile_name="Global Endocrine Consensus DB (profilo locale)",
        glyc_refs_json=json.dumps(DEFAULT_GLYC_REFS, ensure_ascii=False),
        pregnant_glyc_refs_json=json.dumps(PREGNANT_GLYC_REFS, ensure_ascii=False),
        ins_refs_json=json.dumps(DEFAULT_INS_REFS, ensure_ascii=False),
        sources_json=json.dumps(DEFAULT_SOURCES, ensure_ascii=False),
        method_glyc=DEFAULT_METHODS["glyc"],
        method_ins=DEFAULT_METHODS["ins"],
        notes=DEFAULT_NOTES,
        updated_on=date.today(),
        is_active=1,
    )


def get_active_profile(db: Session) -> models.ReferenceProfile:
    row = (
        db.query(models.ReferenceProfile)
        .filter(models.ReferenceProfile.is_active == 1)
        .order_by(models.ReferenceProfile.updated_on.desc(), models.ReferenceProfile.id.desc())
        .first()
    )
    if row:
        return row

    row = _new_default_profile()
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def row_to_payload(row: models.ReferenceProfile) -> dict:
    try:
        glyc = json.loads(row.glyc_refs_json or "{}")
    except Exception:
        glyc = DEFAULT_GLYC_REFS

    try:
        preg = json.loads(row.pregnant_glyc_refs_json or "{}")
    except Exception:
        preg = PREGNANT_GLYC_REFS

    try:
        ins = json.loads(row.ins_refs_json or "{}")
    except Exception:
        ins = DEFAULT_INS_REFS

    try:
        sources = json.loads(row.sources_json or "[]")
        if not isinstance(sources, list):
            sources = DEFAULT_SOURCES
    except Exception:
        sources = DEFAULT_SOURCES

    metadata = {
        "profile_id": row.profile_key,
        "profile_name": row.profile_name,
        "dataset_name": DATASET_NAME,
        "dataset_version": DATASET_VERSION,
        "updated_at": row.updated_on.isoformat() if row.updated_on else None,
        "sources": sources,
        "notes": row.notes,
    }

    return {
        "default_glyc_refs": glyc,
        "pregnant_glyc_refs": preg,
        "default_ins_refs": ins,
        "references_metadata": metadata,
        "default_methodologies": {
            "glyc": row.method_glyc or DEFAULT_METHODS["glyc"],
            "ins": row.method_ins or DEFAULT_METHODS["ins"],
        },
    }
