from __future__ import annotations

from sqlalchemy.orm import Session
from .. import models


def _default() -> models.ReportSettings:
    return models.ReportSettings(
        singleton_key="default",
        report_title="Referto Esame Microbiologico con MIC",
        header_line1="Centro Polispecialistico Giovanni Paolo I srl",
        header_line2="Laboratorio Analisi",
        header_line3="Referto microbiologico con antibiogramma MIC",
        include_interpretation_default=1,
        include_commercial_names_default=1,
        header_logo_data_url=None,
    )


def get_or_create(db: Session) -> models.ReportSettings:
    row = db.query(models.ReportSettings).filter(models.ReportSettings.singleton_key == "default").first()
    if row:
        return row
    row = _default()
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def row_to_payload(row: models.ReportSettings) -> dict:
    return {
        "report_title": row.report_title,
        "header_line1": row.header_line1,
        "header_line2": row.header_line2,
        "header_line3": row.header_line3,
        "include_interpretation_pdf": bool(row.include_interpretation_default),
        "include_commercial_names_pdf": bool(row.include_commercial_names_default),
        "header_logo_data_url": row.header_logo_data_url,
    }


def update_settings(db: Session, payload: dict) -> models.ReportSettings:
    row = get_or_create(db)
    row.report_title = payload.get("report_title") or row.report_title
    row.header_line1 = payload.get("header_line1")
    row.header_line2 = payload.get("header_line2")
    row.header_line3 = payload.get("header_line3")
    row.include_interpretation_default = 1 if payload.get("include_interpretation_pdf", True) else 0
    row.include_commercial_names_default = 1 if payload.get("include_commercial_names_pdf", True) else 0
    row.header_logo_data_url = payload.get("header_logo_data_url")
    db.commit()
    db.refresh(row)
    return row
