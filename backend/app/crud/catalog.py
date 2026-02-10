import json
from sqlalchemy.orm import Session
from sqlalchemy import or_
from .. import models, schemas


def _dump_list(values):
    return json.dumps(values or [], ensure_ascii=False)


def _load_list(raw):
    try:
        v = json.loads(raw or "[]")
        return v if isinstance(v, list) else []
    except Exception:
        return []


def create_item(db: Session, payload: schemas.CatalogItemCreate) -> models.AntibioticCatalog:
    p = payload.model_dump()
    row = models.AntibioticCatalog(
        antibiotic_name=p["antibiotic_name"],
        antibiotic_class=p.get("antibiotic_class"),
        active_ingredient=p.get("active_ingredient"),
        breakpoint_ref=p.get("breakpoint_ref"),
        specimen_types_json=_dump_list(p.get("specimen_types")),
        commercial_names_json=_dump_list(p.get("commercial_names")),
        aware_group=p.get("aware_group"),
        notes=p.get("notes"),
        enabled=1 if p.get("enabled", True) else 0,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_items(db: Session, search: str = "", specimen: str | None = None, only_enabled: bool = True, limit: int = 500):
    q = db.query(models.AntibioticCatalog)
    if only_enabled:
        q = q.filter(models.AntibioticCatalog.enabled == 1)
    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                models.AntibioticCatalog.antibiotic_name.ilike(like),
                models.AntibioticCatalog.antibiotic_class.ilike(like),
                models.AntibioticCatalog.active_ingredient.ilike(like),
            )
        )
    rows = q.order_by(models.AntibioticCatalog.antibiotic_name.asc()).limit(limit).all()

    if specimen:
        specimen = specimen.strip().lower()
        rows = [
            r
            for r in rows
            if specimen in [str(x).strip().lower() for x in _load_list(r.specimen_types_json)]
            or "all" in [str(x).strip().lower() for x in _load_list(r.specimen_types_json)]
        ]
    return rows


def get_item(db: Session, item_id: int):
    return db.query(models.AntibioticCatalog).filter(models.AntibioticCatalog.id == item_id).first()


def update_item(db: Session, row: models.AntibioticCatalog, payload: schemas.CatalogItemUpdate):
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if k == "specimen_types":
            row.specimen_types_json = _dump_list(v)
        elif k == "commercial_names":
            row.commercial_names_json = _dump_list(v)
        elif k == "enabled":
            row.enabled = 1 if v else 0
        else:
            setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


def delete_item(db: Session, row: models.AntibioticCatalog):
    db.delete(row)
    db.commit()


def row_to_payload(row: models.AntibioticCatalog) -> dict:
    return {
        "id": row.id,
        "antibiotic_name": row.antibiotic_name,
        "antibiotic_class": row.antibiotic_class,
        "active_ingredient": row.active_ingredient,
        "breakpoint_ref": row.breakpoint_ref,
        "specimen_types": _load_list(row.specimen_types_json),
        "commercial_names": _load_list(row.commercial_names_json),
        "aware_group": row.aware_group or None,
        "notes": row.notes,
        "enabled": bool(row.enabled),
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }
