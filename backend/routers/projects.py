import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=List[schemas.ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).all()


@router.post("", response_model=schemas.ProjectOut, status_code=201)
def create_project(data: schemas.ProjectCreate, db: Session = Depends(get_db)):
    project = models.Project(name=data.name)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=schemas.ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    db.delete(project)
    db.commit()


# ── Nodes ──────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/nodes", response_model=List[schemas.VSMNodeOut])
def list_nodes(project_id: int, db: Session = Depends(get_db)):
    nodes = db.query(models.VSMNode).filter(models.VSMNode.project_id == project_id).all()
    return [_node_out(n) for n in nodes]


@router.post("/{project_id}/nodes", response_model=schemas.VSMNodeOut, status_code=201)
def create_node(project_id: int, data: schemas.VSMNodeCreate, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    node = models.VSMNode(
        project_id=project_id,
        type=data.type,
        label=data.label,
        x=data.x,
        y=data.y,
        properties=json.dumps(data.properties) if data.properties is not None else None,
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return _node_out(node)


@router.put("/{project_id}/nodes/{node_id}", response_model=schemas.VSMNodeOut)
def update_node(project_id: int, node_id: int, data: schemas.VSMNodeUpdate, db: Session = Depends(get_db)):
    node = db.query(models.VSMNode).filter(
        models.VSMNode.id == node_id,
        models.VSMNode.project_id == project_id,
    ).first()
    if not node:
        raise HTTPException(404, "Node not found")
    if data.label is not None:
        node.label = data.label
    if data.x is not None:
        node.x = data.x
    if data.y is not None:
        node.y = data.y
    if data.properties is not None:
        node.properties = json.dumps(data.properties)
    db.commit()
    db.refresh(node)
    return _node_out(node)


@router.delete("/{project_id}/nodes/{node_id}", status_code=204)
def delete_node(project_id: int, node_id: int, db: Session = Depends(get_db)):
    node = db.query(models.VSMNode).filter(
        models.VSMNode.id == node_id,
        models.VSMNode.project_id == project_id,
    ).first()
    if not node:
        raise HTTPException(404, "Node not found")
    db.delete(node)
    db.commit()


# ── Edges ──────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/edges", response_model=List[schemas.VSMEdgeOut])
def list_edges(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.VSMEdge).filter(models.VSMEdge.project_id == project_id).all()


@router.post("/{project_id}/edges", response_model=schemas.VSMEdgeOut, status_code=201)
def create_edge(project_id: int, data: schemas.VSMEdgeCreate, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    edge = models.VSMEdge(
        project_id=project_id,
        source_id=data.source_id,
        target_id=data.target_id,
        type=data.type,
    )
    db.add(edge)
    db.commit()
    db.refresh(edge)
    return edge


@router.delete("/{project_id}/edges/{edge_id}", status_code=204)
def delete_edge(project_id: int, edge_id: int, db: Session = Depends(get_db)):
    edge = db.query(models.VSMEdge).filter(
        models.VSMEdge.id == edge_id,
        models.VSMEdge.project_id == project_id,
    ).first()
    if not edge:
        raise HTTPException(404, "Edge not found")
    db.delete(edge)
    db.commit()


def _node_out(node: models.VSMNode) -> schemas.VSMNodeOut:
    props = json.loads(node.properties) if node.properties else None
    return schemas.VSMNodeOut(
        id=node.id,
        project_id=node.project_id,
        type=node.type,
        label=node.label,
        x=node.x,
        y=node.y,
        properties=props,
    )
