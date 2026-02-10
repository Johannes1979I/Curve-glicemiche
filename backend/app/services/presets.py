from __future__ import annotations
import json
from sqlalchemy.orm import Session
from .. import models
from .seed_data import SPECIMEN_TYPES, REFERENCES_METADATA, DEFAULT_METHODOLOGIES


def _load(raw: str):
    try:
        val = json.loads(raw or "[]")
        return val if isinstance(val, list) else []
    except Exception:
        return []


def _catalog_to_payload(row: models.AntibioticCatalog) -> dict:
    return {
        "id": row.id,
        "antibiotic_name": row.antibiotic_name,
        "antibiotic_class": row.antibiotic_class,
        "active_ingredient": row.active_ingredient,
        "breakpoint_ref": row.breakpoint_ref,
        "specimen_types": _load(row.specimen_types_json),
        "commercial_names": _load(row.commercial_names_json),
        "aware_group": row.aware_group or None,
    }


def get_presets_payload(db: Session) -> dict:
    rows = (
        db.query(models.AntibioticCatalog)
        .filter(models.AntibioticCatalog.enabled == 1)
        .order_by(models.AntibioticCatalog.antibiotic_name.asc())
        .all()
    )
    catalog = [_catalog_to_payload(r) for r in rows]

    default_panels = {}
    for spec in [s["id"] for s in SPECIMEN_TYPES]:
        panel = []
        for item in catalog:
            types = [str(x).lower() for x in item.get("specimen_types", [])]
            if spec in types or "all" in types:
                panel.append(item)
        default_panels[spec] = panel

    return {
        "specimen_types": SPECIMEN_TYPES,
        "catalog": catalog,
        "default_panels": default_panels,
        "references_metadata": REFERENCES_METADATA,
        "default_methodologies": DEFAULT_METHODOLOGIES,
    }
