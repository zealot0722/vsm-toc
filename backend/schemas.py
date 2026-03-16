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


# ── Node Metrics ─────────────────────────────────────────────────────────────

class NodeMetricCreate(BaseModel):
    node_id: int
    metric_name: str
    current_value: Optional[float] = None
    target_value: Optional[float] = None
    unit: str = ""
    source_type: str = "estimated"
    owner: Optional[str] = None
    review_cycle: Optional[str] = None
    notes: Optional[str] = None


class NodeMetricUpdate(BaseModel):
    metric_name: Optional[str] = None
    current_value: Optional[float] = None
    target_value: Optional[float] = None
    unit: Optional[str] = None
    source_type: Optional[str] = None
    owner: Optional[str] = None
    review_cycle: Optional[str] = None
    notes: Optional[str] = None


class NodeMetricOut(BaseModel):
    id: int
    node_id: int
    metric_name: str
    current_value: Optional[float] = None
    target_value: Optional[float] = None
    unit: str
    source_type: str
    owner: Optional[str] = None
    review_cycle: Optional[str] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Hypotheses ───────────────────────────────────────────────────────────────

class HypothesisCreate(BaseModel):
    title: str
    suspected_constraint: str = ""
    expected_effect: str = ""
    validation_metrics: str = "[]"
    observation_window: str = "14 days"
    status: str = "draft"


class HypothesisUpdate(BaseModel):
    title: Optional[str] = None
    suspected_constraint: Optional[str] = None
    expected_effect: Optional[str] = None
    validation_metrics: Optional[str] = None
    observation_window: Optional[str] = None
    status: Optional[str] = None


class HypothesisOut(BaseModel):
    id: int
    project_id: int
    title: str
    suspected_constraint: str
    expected_effect: str
    validation_metrics: str
    observation_window: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Mechanisms ───────────────────────────────────────────────────────────────

class MechanismCreate(BaseModel):
    linked_toc_node_id: Optional[int] = None
    title: str
    trigger: str = ""
    actor: str = ""
    frequency: str = ""
    input_rule: Optional[str] = None
    output_rule: Optional[str] = None
    exception_path: Optional[str] = None
    escalation_rule: Optional[str] = None
    sop_link: Optional[str] = None
    backup_role: Optional[str] = None
    owner: Optional[str] = None
    health_status: str = "normal"


class MechanismUpdate(BaseModel):
    linked_toc_node_id: Optional[int] = None
    title: Optional[str] = None
    trigger: Optional[str] = None
    actor: Optional[str] = None
    frequency: Optional[str] = None
    input_rule: Optional[str] = None
    output_rule: Optional[str] = None
    exception_path: Optional[str] = None
    escalation_rule: Optional[str] = None
    sop_link: Optional[str] = None
    backup_role: Optional[str] = None
    owner: Optional[str] = None
    health_status: Optional[str] = None


class MechanismOut(BaseModel):
    id: int
    linked_toc_node_id: Optional[int] = None
    project_id: int
    title: str
    trigger: str
    actor: str
    frequency: str
    input_rule: Optional[str] = None
    output_rule: Optional[str] = None
    exception_path: Optional[str] = None
    escalation_rule: Optional[str] = None
    sop_link: Optional[str] = None
    backup_role: Optional[str] = None
    owner: Optional[str] = None
    health_status: str
    created_at: datetime

    model_config = {"from_attributes": True}
