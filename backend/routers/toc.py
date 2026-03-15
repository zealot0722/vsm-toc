from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

router = APIRouter(prefix="/toc", tags=["toc"])


@router.get("/node/{vsm_node_id}", response_model=List[schemas.TOCAnalysisOut])
def list_analyses(vsm_node_id: int, db: Session = Depends(get_db)):
    return db.query(models.TOCAnalysis).filter(
        models.TOCAnalysis.vsm_node_id == vsm_node_id
    ).all()


@router.post("", response_model=schemas.TOCAnalysisOut, status_code=201)
def create_analysis(data: schemas.TOCAnalysisCreate, db: Session = Depends(get_db)):
    node = db.get(models.VSMNode, data.vsm_node_id)
    if not node:
        raise HTTPException(404, "VSM node not found")
    analysis = models.TOCAnalysis(
        vsm_node_id=data.vsm_node_id,
        type=data.type,
        goal=data.goal,
        need_a=data.need_a,
        prereq_a=data.prereq_a,
        need_b=data.need_b,
        prereq_b=data.prereq_b,
        assumption_ab=data.assumption_ab,
        assumption_a_prereq_a=data.assumption_a_prereq_a,
        assumption_b_prereq_b=data.assumption_b_prereq_b,
        broken_assumption=data.broken_assumption,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


@router.get("/{analysis_id}", response_model=schemas.TOCAnalysisOut)
def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.get(models.TOCAnalysis, analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")
    return analysis


@router.put("/{analysis_id}", response_model=schemas.TOCAnalysisOut)
def update_analysis(analysis_id: int, data: schemas.TOCAnalysisUpdate, db: Session = Depends(get_db)):
    analysis = db.get(models.TOCAnalysis, analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(analysis, field, value)
    db.commit()
    db.refresh(analysis)
    return analysis


@router.delete("/{analysis_id}", status_code=204)
def delete_analysis(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.get(models.TOCAnalysis, analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")
    db.delete(analysis)
    db.commit()


# ── TOC Nodes (CRT / FRT tree nodes) ────────────────────────────────────────

@router.get("/{analysis_id}/nodes", response_model=List[schemas.TOCNodeOut])
def list_toc_nodes(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.get(models.TOCAnalysis, analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")
    return analysis.toc_nodes


@router.post("/{analysis_id}/nodes", response_model=schemas.TOCNodeOut, status_code=201)
def create_toc_node(analysis_id: int, data: schemas.TOCNodeCreate, db: Session = Depends(get_db)):
    analysis = db.get(models.TOCAnalysis, analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")
    node = models.TOCNode(
        analysis_id=analysis_id,
        type=data.type,
        label=data.label,
        x=data.x,
        y=data.y,
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


@router.put("/nodes/{node_id}", response_model=schemas.TOCNodeOut)
def update_toc_node(node_id: int, data: schemas.TOCNodeUpdate, db: Session = Depends(get_db)):
    node = db.get(models.TOCNode, node_id)
    if not node:
        raise HTTPException(404, "TOC node not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(node, field, value)
    db.commit()
    db.refresh(node)
    return node


@router.delete("/nodes/{node_id}", status_code=204)
def delete_toc_node(node_id: int, db: Session = Depends(get_db)):
    node = db.get(models.TOCNode, node_id)
    if not node:
        raise HTTPException(404, "TOC node not found")
    db.delete(node)
    db.commit()


# ── TOC Edges (CRT / FRT tree edges) ────────────────────────────────────────

@router.get("/{analysis_id}/edges", response_model=List[schemas.TOCEdgeOut])
def list_toc_edges(analysis_id: int, db: Session = Depends(get_db)):
    analysis = db.get(models.TOCAnalysis, analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")
    return analysis.toc_edges


@router.post("/{analysis_id}/edges", response_model=schemas.TOCEdgeOut, status_code=201)
def create_toc_edge(analysis_id: int, data: schemas.TOCEdgeCreate, db: Session = Depends(get_db)):
    analysis = db.get(models.TOCAnalysis, analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")
    edge = models.TOCEdge(
        analysis_id=analysis_id,
        source_id=data.source_id,
        target_id=data.target_id,
        assumption=data.assumption,
    )
    db.add(edge)
    db.commit()
    db.refresh(edge)
    return edge


@router.put("/edges/{edge_id}", response_model=schemas.TOCEdgeOut)
def update_toc_edge(edge_id: int, data: schemas.TOCEdgeUpdate, db: Session = Depends(get_db)):
    edge = db.get(models.TOCEdge, edge_id)
    if not edge:
        raise HTTPException(404, "TOC edge not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(edge, field, value)
    db.commit()
    db.refresh(edge)
    return edge


@router.delete("/edges/{edge_id}", status_code=204)
def delete_toc_edge(edge_id: int, db: Session = Depends(get_db)):
    edge = db.get(models.TOCEdge, edge_id)
    if not edge:
        raise HTTPException(404, "TOC edge not found")
    db.delete(edge)
    db.commit()
