import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

router = APIRouter(tags=["phase2"])


# ── Node Metrics ──────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/metrics", response_model=List[schemas.NodeMetricOut])
def list_metrics(project_id: int, db: Session = Depends(get_db)):
    node_ids = [
        n.id for n in
        db.query(models.VSMNode).filter(models.VSMNode.project_id == project_id).all()
    ]
    if not node_ids:
        return []
    return db.query(models.NodeMetric).filter(models.NodeMetric.node_id.in_(node_ids)).all()


@router.post("/projects/{project_id}/metrics", response_model=schemas.NodeMetricOut, status_code=201)
def create_metric(project_id: int, data: schemas.NodeMetricCreate, db: Session = Depends(get_db)):
    node = db.query(models.VSMNode).filter(
        models.VSMNode.id == data.node_id,
        models.VSMNode.project_id == project_id,
    ).first()
    if not node:
        raise HTTPException(404, "Node not found in this project")
    metric = models.NodeMetric(**data.model_dump())
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


@router.put("/metrics/{metric_id}", response_model=schemas.NodeMetricOut)
def update_metric(metric_id: int, data: schemas.NodeMetricUpdate, db: Session = Depends(get_db)):
    metric = db.get(models.NodeMetric, metric_id)
    if not metric:
        raise HTTPException(404, "Metric not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(metric, key, val)
    db.commit()
    db.refresh(metric)
    return metric


@router.delete("/metrics/{metric_id}", status_code=204)
def delete_metric(metric_id: int, db: Session = Depends(get_db)):
    metric = db.get(models.NodeMetric, metric_id)
    if not metric:
        raise HTTPException(404, "Metric not found")
    db.delete(metric)
    db.commit()


# ── Hypotheses ────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/hypotheses", response_model=List[schemas.HypothesisOut])
def list_hypotheses(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.Hypothesis).filter(models.Hypothesis.project_id == project_id).all()


@router.post("/projects/{project_id}/hypotheses", response_model=schemas.HypothesisOut, status_code=201)
def create_hypothesis(project_id: int, data: schemas.HypothesisCreate, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    hyp = models.Hypothesis(project_id=project_id, **data.model_dump())
    db.add(hyp)
    db.commit()
    db.refresh(hyp)
    return hyp


@router.put("/hypotheses/{hyp_id}", response_model=schemas.HypothesisOut)
def update_hypothesis(hyp_id: int, data: schemas.HypothesisUpdate, db: Session = Depends(get_db)):
    hyp = db.get(models.Hypothesis, hyp_id)
    if not hyp:
        raise HTTPException(404, "Hypothesis not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(hyp, key, val)
    db.commit()
    db.refresh(hyp)
    return hyp


@router.delete("/hypotheses/{hyp_id}", status_code=204)
def delete_hypothesis(hyp_id: int, db: Session = Depends(get_db)):
    hyp = db.get(models.Hypothesis, hyp_id)
    if not hyp:
        raise HTTPException(404, "Hypothesis not found")
    db.delete(hyp)
    db.commit()


# ── Mechanisms ────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/mechanisms", response_model=List[schemas.MechanismOut])
def list_mechanisms(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.Mechanism).filter(models.Mechanism.project_id == project_id).all()


@router.post("/projects/{project_id}/mechanisms", response_model=schemas.MechanismOut, status_code=201)
def create_mechanism(project_id: int, data: schemas.MechanismCreate, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    mech = models.Mechanism(project_id=project_id, **data.model_dump())
    db.add(mech)
    db.commit()
    db.refresh(mech)
    return mech


@router.put("/mechanisms/{mech_id}", response_model=schemas.MechanismOut)
def update_mechanism(mech_id: int, data: schemas.MechanismUpdate, db: Session = Depends(get_db)):
    mech = db.get(models.Mechanism, mech_id)
    if not mech:
        raise HTTPException(404, "Mechanism not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(mech, key, val)
    db.commit()
    db.refresh(mech)
    return mech


@router.delete("/mechanisms/{mech_id}", status_code=204)
def delete_mechanism(mech_id: int, db: Session = Depends(get_db)):
    mech = db.get(models.Mechanism, mech_id)
    if not mech:
        raise HTTPException(404, "Mechanism not found")
    db.delete(mech)
    db.commit()


# ── Constraint Scores ─────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/constraint-scores")
def constraint_scores(project_id: int, db: Session = Depends(get_db)):
    """Auto-compute constraint score for each process node based on its metrics."""
    nodes = db.query(models.VSMNode).filter(
        models.VSMNode.project_id == project_id,
        models.VSMNode.type == "process",
    ).all()

    results = []
    for node in nodes:
        props = json.loads(node.properties) if node.properties else {}
        metrics = db.query(models.NodeMetric).filter(models.NodeMetric.node_id == node.id).all()

        # Build a lookup of metric_name -> metric
        metric_map = {m.metric_name: m for m in metrics}

        # 1. Load ratio: cycleTime relative to takt — higher = more constrained
        cycle_time = props.get("cycleTime", 0)
        uptime = props.get("uptime", 100)
        effective_ct = cycle_time / (uptime / 100) if uptime > 0 else cycle_time
        load_ratio = min(effective_ct / 60, 2.0)  # normalise: 60s = 1.0, capped at 2.0

        # 2. Backlog score: WIP / capacity proxy
        wip = props.get("wip", 0)
        workers = props.get("workers", 1)
        backlog_score = min(wip / max(workers * 10, 1), 2.0)

        # 3. Escalation rate from metrics
        esc_metric = metric_map.get("escalation_rate")
        escalation_score = 0.0
        if esc_metric and esc_metric.current_value is not None:
            escalation_score = min(esc_metric.current_value / 10, 2.0)  # 10% = 1.0

        # 4. Quality gap: how far current_value is from target_value across all metrics
        quality_gaps = []
        for m in metrics:
            if m.current_value is not None and m.target_value is not None and m.target_value != 0:
                gap = abs(m.current_value - m.target_value) / abs(m.target_value)
                quality_gaps.append(gap)
        quality_score = min(sum(quality_gaps) / max(len(quality_gaps), 1), 2.0)

        # 5. Dependency risk: number of incoming edges (more deps = higher risk)
        incoming = db.query(models.VSMEdge).filter(
            models.VSMEdge.project_id == project_id,
            models.VSMEdge.target_id == str(node.id),
        ).count()
        dependency_score = min(incoming / 3, 2.0)  # 3 deps = 1.0

        total = load_ratio + backlog_score + escalation_score + quality_score + dependency_score

        results.append({
            "node_id": node.id,
            "label": node.label,
            "scores": {
                "load_ratio": round(load_ratio, 2),
                "backlog": round(backlog_score, 2),
                "escalation": round(escalation_score, 2),
                "quality_gap": round(quality_score, 2),
                "dependency_risk": round(dependency_score, 2),
            },
            "total": round(total, 2),
        })

    # Sort by total descending
    results.sort(key=lambda r: r["total"], reverse=True)
    return results
