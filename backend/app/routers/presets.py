from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.presets import get_presets_payload
from ..services.reference_profiles import get_active_profile, row_to_payload


router = APIRouter(prefix="/presets", tags=["presets"])


@router.get("")
def get_presets(db: Session = Depends(get_db)):
    row = get_active_profile(db)
    ref_payload = row_to_payload(row)
    return get_presets_payload(ref_payload)
