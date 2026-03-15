from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel


# ── Projects ──────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str


class ProjectOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── VSM Nodes ─────────────────────────────────────────────────────────────────

class VSMNodeCreate(BaseModel):
    type: str
    label: str
    x: float = 0.0
    y: float = 0.0
    properties: Optional[Any] = None  # JSON-serialisable dict


class VSMNodeUpdate(BaseModel):
    label: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    properties: Optional[Any] = None


class VSMNodeOut(BaseModel):
    id: int
    project_id: int
    type: str
    label: str
    x: float
    y: float
    properties: Optional[Any] = None

    model_config = {"from_attributes": True}


# ── VSM Edges ─────────────────────────────────────────────────────────────────

class VSMEdgeCreate(BaseModel):
    source_id: str
    target_id: str
    type: str = "smoothstep"


class VSMEdgeOut(BaseModel):
    id: int
    project_id: int
    source_id: str
    target_id: str
    type: str

    model_config = {"from_attributes": True}


# ── TOC Analyses ──────────────────────────────────────────────────────────────

class TOCAnalysisCreate(BaseModel):
    vsm_node_id: int
    type: str   # EC / CRT / FRT
    goal: str = ""
    need_a: str = ""
    prereq_a: str = ""
    need_b: str = ""
    prereq_b: str = ""
    assumption_ab: str = ""
    assumption_a_prereq_a: str = ""
    assumption_b_prereq_b: str = ""
    broken_assumption: str = ""


class TOCAnalysisUpdate(BaseModel):
    goal: Optional[str] = None
    need_a: Optional[str] = None
    prereq_a: Optional[str] = None
    need_b: Optional[str] = None
    prereq_b: Optional[str] = None
    assumption_ab: Optional[str] = None
    assumption_a_prereq_a: Optional[str] = None
    assumption_b_prereq_b: Optional[str] = None
    broken_assumption: Optional[str] = None


class TOCAnalysisOut(BaseModel):
    id: int
    vsm_node_id: int
    type: str
    goal: str
    need_a: str
    prereq_a: str
    need_b: str
    prereq_b: str
    assumption_ab: str
    assumption_a_prereq_a: str
    assumption_b_prereq_b: str
    broken_assumption: str

    model_config = {"from_attributes": True}


# ── TOC Nodes (CRT/FRT) ─────────────────────────────────────────────────────

class TOCNodeCreate(BaseModel):
    analysis_id: int
    type: str       # symptom / intermediate-cause / core-constraint / injection
    label: str
    x: float = 0.0
    y: float = 0.0


class TOCNodeUpdate(BaseModel):
    type: Optional[str] = None
    label: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None


class TOCNodeOut(BaseModel):
    id: int
    analysis_id: int
    type: str
    label: str
    x: float
    y: float

    model_config = {"from_attributes": True}


# ── TOC Edges (CRT/FRT) ─────────────────────────────────────────────────────

class TOCEdgeCreate(BaseModel):
    analysis_id: int
    source_id: int
    target_id: int
    assumption: str = ""


class TOCEdgeUpdate(BaseModel):
    assumption: Optional[str] = None


class TOCEdgeOut(BaseModel):
    id: int
    analysis_id: int
    source_id: int
    target_id: int
    assumption: str

    model_config = {"from_attributes": True}
