from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from .. import schemas
from ..crud import catalog as crud


router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("", response_model=list[schemas.CatalogItemOut])
def list_catalog(
    search: str = Query(""),
    specimen: str | None = Query(default=None),
    only_enabled: bool = Query(default=True),
    limit: int = Query(default=500, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    rows = crud.list_items(db, search=search, specimen=specimen, only_enabled=only_enabled, limit=limit)
    return [crud.row_to_payload(r) for r in rows]


@router.post("", response_model=schemas.CatalogItemOut, status_code=201)
def create_catalog(payload: schemas.CatalogItemCreate, db: Session = Depends(get_db)):
    row = crud.create_item(db, payload)
    return crud.row_to_payload(row)


@router.put("/{item_id}", response_model=schemas.CatalogItemOut)
def update_catalog(item_id: int, payload: schemas.CatalogItemUpdate, db: Session = Depends(get_db)):
    row = crud.get_item(db, item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Antibiotico non trovato")
    row = crud.update_item(db, row, payload)
    return crud.row_to_payload(row)


@router.delete("/{item_id}", status_code=204)
def delete_catalog(item_id: int, db: Session = Depends(get_db)):
    row = crud.get_item(db, item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Antibiotico non trovato")
    crud.delete_item(db, row)
    return None
