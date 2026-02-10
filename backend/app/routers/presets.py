from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.presets import get_presets_payload


router = APIRouter(prefix="/presets", tags=["presets"])


@router.get("")
def get_presets(db: Session = Depends(get_db)):
    return get_presets_payload(db)
