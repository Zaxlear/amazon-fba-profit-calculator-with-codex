from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from backend.models.database import Project, Setting
from backend.models.schemas import (
    BranchCreateRequest,
    FBACalculationResult,
    FBACalculatorInput,
    ProjectCreateRequest,
    ProjectNode,
    ProjectUpdateRequest,
    SavedProject,
    SavedProjectSummary,
    Settings,
)
from backend.services.calculator import calculate_fba_profit
from backend.utils.helpers import alpha_to_index, index_to_alpha

SETTINGS_EXCHANGE_RATE_KEY = "exchange_rate"


def _now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat()


def _json_dumps(data) -> str:
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))


def _json_loads(data: str):
    return json.loads(data)


def _next_segment(existing_segments: list[str]) -> str:
    indices: list[int] = []
    for seg in existing_segments:
        try:
            indices.append(alpha_to_index(seg))
        except ValueError:
            continue
    if not indices:
        return "A"
    return index_to_alpha(max(indices) + 1)


def _project_to_summary(p: Project) -> SavedProjectSummary:
    return SavedProjectSummary(
        id=p.id,
        name=p.name,
        description=p.description,
        parent_id=p.parent_id,
        branch_path=p.branch_path,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


def _project_to_saved_project(p: Project) -> SavedProject:
    input_model = FBACalculatorInput.model_validate(_json_loads(p.input_json))
    result_model = FBACalculationResult.model_validate(_json_loads(p.result_json))
    return SavedProject(
        **_project_to_summary(p).model_dump(),
        input=input_model,
        result=result_model,
    )


def get_settings(db: Session) -> Settings:
    row = db.get(Setting, SETTINGS_EXCHANGE_RATE_KEY)
    if row is None:
        return Settings()
    try:
        return Settings(exchange_rate=row.value)
    except Exception:
        return Settings()


def update_settings(db: Session, settings: Settings) -> Settings:
    row = db.get(Setting, SETTINGS_EXCHANGE_RATE_KEY)
    if row is None:
        row = Setting(key=SETTINGS_EXCHANGE_RATE_KEY, value=str(settings.exchange_rate))
        db.add(row)
    else:
        row.value = str(settings.exchange_rate)
    db.commit()
    return settings


def list_projects_tree(db: Session) -> list[ProjectNode]:
    projects = db.execute(select(Project).order_by(Project.branch_path.asc())).scalars().all()

    nodes_by_id: dict[str, ProjectNode] = {}
    roots: list[ProjectNode] = []

    for p in projects:
        nodes_by_id[p.id] = ProjectNode(project=_project_to_summary(p), children=[])

    for p in projects:
        node = nodes_by_id[p.id]
        if p.parent_id and p.parent_id in nodes_by_id:
            nodes_by_id[p.parent_id].children.append(node)
        else:
            roots.append(node)

    return roots


def get_project(db: Session, project_id: str) -> Optional[SavedProject]:
    p = db.get(Project, project_id)
    if p is None:
        return None
    return _project_to_saved_project(p)


def create_project(db: Session, payload: ProjectCreateRequest) -> SavedProject:
    existing_roots = (
        db.execute(select(Project.branch_path).where(Project.parent_id.is_(None))).scalars().all()
    )
    next_root = _next_segment(list(existing_roots))

    project_id = str(uuid.uuid4())
    created_at = _now_iso()

    result = calculate_fba_profit(payload.input)
    p = Project(
        id=project_id,
        name=payload.name,
        description=payload.description,
        parent_id=None,
        branch_path=next_root,
        input_json=_json_dumps(payload.input.model_dump(mode="json", by_alias=True)),
        result_json=_json_dumps(result.model_dump(mode="json", by_alias=True)),
        created_at=created_at,
        updated_at=created_at,
    )
    db.add(p)
    db.commit()
    return _project_to_saved_project(p)


def update_project(
    db: Session, project_id: str, payload: ProjectUpdateRequest
) -> Optional[SavedProject]:
    p = db.get(Project, project_id)
    if p is None:
        return None

    result = calculate_fba_profit(payload.input)

    p.name = payload.name
    p.description = payload.description
    p.input_json = _json_dumps(payload.input.model_dump(mode="json", by_alias=True))
    p.result_json = _json_dumps(result.model_dump(mode="json", by_alias=True))
    p.updated_at = _now_iso()

    db.commit()
    return _project_to_saved_project(p)


def create_branch(
    db: Session, parent_id: str, payload: BranchCreateRequest
) -> Optional[SavedProject]:
    parent = db.get(Project, parent_id)
    if parent is None:
        return None

    sibling_paths = (
        db.execute(select(Project.branch_path).where(Project.parent_id == parent_id))
        .scalars()
        .all()
    )
    sibling_suffixes = [path.split("-")[-1] for path in sibling_paths]
    next_suffix = _next_segment(sibling_suffixes)
    branch_path = f"{parent.branch_path}-{next_suffix}"

    project_id = str(uuid.uuid4())
    now = _now_iso()

    p = Project(
        id=project_id,
        name=payload.name,
        description=payload.description,
        parent_id=parent_id,
        branch_path=branch_path,
        input_json=parent.input_json,
        result_json=parent.result_json,
        created_at=now,
        updated_at=now,
    )
    db.add(p)
    db.commit()
    return _project_to_saved_project(p)


def delete_project_cascade(db: Session, project_id: str) -> list[str]:
    exists = db.get(Project, project_id)
    if exists is None:
        return []

    rows = db.execute(select(Project.id, Project.parent_id)).all()
    children_by_parent: dict[str, list[str]] = {}
    for child_id, parent_id in rows:
        if parent_id is None:
            continue
        children_by_parent.setdefault(parent_id, []).append(child_id)

    deleted: list[str] = []
    stack = [project_id]
    while stack:
        current = stack.pop()
        deleted.append(current)
        stack.extend(children_by_parent.get(current, []))

    db.execute(delete(Project).where(Project.id.in_(deleted)))
    db.commit()
    return deleted


def export_project(db: Session, project_id: str, format: str = "json"):
    project = get_project(db, project_id)
    if project is None:
        return None

    if format == "csv":
        s = project.result.summary
        rows = [
            ["metric", "value_usd", "value_cny"],
            ["totalRevenue", s.total_revenue.usd, s.total_revenue.cny],
            ["totalCost", s.total_cost.usd, s.total_cost.cny],
            ["grossProfit", s.gross_profit.usd, s.gross_profit.cny],
            ["netProfit", s.net_profit.usd, s.net_profit.cny],
        ]
        out_lines = [",".join(map(str, r)) for r in rows]
        return "\n".join(out_lines) + "\n"

    return project.model_dump(mode="json", by_alias=True)
