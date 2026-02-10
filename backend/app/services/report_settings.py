from __future__ import annotations

from sqlalchemy.orm import Session

from .. import models


def _default() -> models.ReportSettings:
    return models.ReportSettings(
        singleton_key="default",
        report_title="Referto Curva da Carico Orale di Glucosio",
        header_line1="Centro Polispecialistico Giovanni Paolo I srl",
        header_line2="Via Ignazio Garbini, 25 - 01100 Viterbo",
        header_line3="Tel 0761 304260 - www.polispecialisticoviterbo.it",
        include_interpretation_default=1,
        merge_charts_default=1,
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
    include = bool(row.include_interpretation_default)
    merge = bool(row.merge_charts_default)

    # Manteniamo sia i nomi legacy che i nuovi alias *_pdf per retrocompatibilità.
    return {
        "report_title": row.report_title,
        "header_line1": row.header_line1,
        "header_line2": row.header_line2,
        "header_line3": row.header_line3,
        "include_interpretation_default": include,
        "merge_charts_default": merge,
        "include_interpretation_pdf": include,
        "merge_charts_pdf": merge,
        "header_logo_data_url": row.header_logo_data_url,
    }


def update_from_payload(db: Session, payload: dict) -> dict:
    row = get_or_create(db)

    include = payload.get("include_interpretation_pdf")
    if include is None:
        include = payload.get("include_interpretation_default", True)

    merge = payload.get("merge_charts_pdf")
    if merge is None:
        merge = payload.get("merge_charts_default", True)

    row.report_title = str(payload.get("report_title", row.report_title or "Referto Curva da Carico Orale di Glucosio") or "Referto Curva da Carico Orale di Glucosio")
    row.header_line1 = str(payload.get("header_line1", row.header_line1 or "") or "")
    row.header_line2 = str(payload.get("header_line2", row.header_line2 or "") or "")
    row.header_line3 = str(payload.get("header_line3", row.header_line3 or "") or "")
    row.include_interpretation_default = 1 if bool(include) else 0
    row.merge_charts_default = 1 if bool(merge) else 0

    logo = payload.get("header_logo_data_url", row.header_logo_data_url)
    if logo and len(str(logo)) > 1_200_000:
        logo = None  # protezione dimensione eccessiva in SQLite
    row.header_logo_data_url = str(logo) if logo else None

    db.add(row)
    db.commit()
    db.refresh(row)
    return row_to_payload(row)
