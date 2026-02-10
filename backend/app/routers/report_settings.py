from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import schemas
from ..services import report_settings as report_srv


router = APIRouter(prefix="/report-settings", tags=["report-settings"])


@router.get("", response_model=schemas.ReportSettingsOut)
def get_report_settings(db: Session = Depends(get_db)):
    row = report_srv.get_or_create(db)
    return report_srv.row_to_payload(row)


@router.put("", response_model=schemas.ReportSettingsOut)
def update_report_settings(payload: schemas.ReportSettingsIn, db: Session = Depends(get_db)):
    row = report_srv.update_settings(db, payload.model_dump())
    return report_srv.row_to_payload(row)
