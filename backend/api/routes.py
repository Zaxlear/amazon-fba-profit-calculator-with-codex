from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from backend.api.deps import get_db
from backend.models.schemas import (
    BranchCreateRequest,
    DeleteProjectsResponse,
    FBACalculationResult,
    FBACalculatorInput,
    ProjectCreateRequest,
    ProjectNode,
    ProjectUpdateRequest,
    SavedProject,
    Settings,
)
from backend.services.calculator import calculate_fba_profit
from backend.services.project import (
    create_branch,
    create_project,
    delete_project_cascade,
    export_project,
    get_project,
    get_settings,
    list_projects_tree,
    update_project,
    update_settings,
)

router = APIRouter(prefix="/api")


@router.post(
    "/calculate",
    response_model=FBACalculationResult,
    response_model_by_alias=True,
)
def calculate(input_data: FBACalculatorInput) -> FBACalculationResult:
    return calculate_fba_profit(input_data)


@router.get(
    "/projects",
    response_model=list[ProjectNode],
    response_model_by_alias=True,
)
def projects(db: Session = Depends(get_db)) -> list[ProjectNode]:
    return list_projects_tree(db)


@router.get(
    "/projects/{project_id}",
    response_model=SavedProject,
    response_model_by_alias=True,
)
def project(project_id: str, db: Session = Depends(get_db)) -> SavedProject:
    project_obj = get_project(db, project_id)
    if project_obj is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_obj


@router.post(
    "/projects",
    response_model=SavedProject,
    response_model_by_alias=True,
)
def create_project_endpoint(
    payload: ProjectCreateRequest, db: Session = Depends(get_db)
) -> SavedProject:
    return create_project(db, payload)


@router.put(
    "/projects/{project_id}",
    response_model=SavedProject,
    response_model_by_alias=True,
)
def update_project_endpoint(
    project_id: str, payload: ProjectUpdateRequest, db: Session = Depends(get_db)
) -> SavedProject:
    updated = update_project(db, project_id, payload)
    if updated is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return updated


@router.delete(
    "/projects/{project_id}",
    response_model=DeleteProjectsResponse,
    response_model_by_alias=True,
)
def delete_project_endpoint(
    project_id: str, db: Session = Depends(get_db)
) -> DeleteProjectsResponse:
    deleted_ids = delete_project_cascade(db, project_id)
    if not deleted_ids:
        raise HTTPException(status_code=404, detail="Project not found")
    return DeleteProjectsResponse(deleted_ids=deleted_ids)


@router.post(
    "/projects/{project_id}/branch",
    response_model=SavedProject,
    response_model_by_alias=True,
)
def create_branch_endpoint(
    project_id: str, payload: BranchCreateRequest, db: Session = Depends(get_db)
) -> SavedProject:
    created = create_branch(db, project_id, payload)
    if created is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return created


@router.get("/projects/{project_id}/export")
def export_project_endpoint(
    project_id: str,
    format: str = Query(default="json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db),
):
    exported = export_project(db, project_id, format=format)
    if exported is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if format == "csv":
        return Response(content=exported, media_type="text/csv; charset=utf-8")
    return exported


@router.get(
    "/settings",
    response_model=Settings,
    response_model_by_alias=True,
)
def settings(db: Session = Depends(get_db)) -> Settings:
    return get_settings(db)


@router.put(
    "/settings",
    response_model=Settings,
    response_model_by_alias=True,
)
def update_settings_endpoint(payload: Settings, db: Session = Depends(get_db)) -> Settings:
    return update_settings(db, payload)

