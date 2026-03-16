from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    vsm_nodes = relationship("VSMNode", back_populates="project", cascade="all, delete-orphan")
    vsm_edges = relationship("VSMEdge", back_populates="project", cascade="all, delete-orphan")


class VSMNode(Base):
    __tablename__ = "vsm_nodes"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    type = Column(String, nullable=False)   # supplier / process / inventory / customer / infoflow
    label = Column(String, nullable=False)
    x = Column(Float, default=0.0)
    y = Column(Float, default=0.0)
    properties = Column(Text, nullable=True)  # JSON string

    project = relationship("Project", back_populates="vsm_nodes")
    toc_analyses = relationship("TOCAnalysis", back_populates="vsm_node", cascade="all, delete-orphan")


class VSMEdge(Base):
    __tablename__ = "vsm_edges"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    source_id = Column(String, nullable=False)   # React Flow node ID (string)
    target_id = Column(String, nullable=False)
    type = Column(String, default="smoothstep")

    project = relationship("Project", back_populates="vsm_edges")


class TOCAnalysis(Base):
    __tablename__ = "toc_analyses"

    id = Column(Integer, primary_key=True, index=True)
    vsm_node_id = Column(Integer, ForeignKey("vsm_nodes.id"), nullable=False)
    type = Column(String, nullable=False)   # EC / CRT / FRT

    # Evaporating Cloud fields
    goal = Column(Text, default="")
    need_a = Column(Text, default="")
    prereq_a = Column(Text, default="")
    need_b = Column(Text, default="")
    prereq_b = Column(Text, default="")
    assumption_ab = Column(Text, default="")
    assumption_a_prereq_a = Column(Text, default="")
    assumption_b_prereq_b = Column(Text, default="")
    broken_assumption = Column(Text, default="")

    vsm_node = relationship("VSMNode", back_populates="toc_analyses")
    toc_nodes = relationship("TOCNode", back_populates="analysis", cascade="all, delete-orphan")
    toc_edges = relationship("TOCEdge", back_populates="analysis", cascade="all, delete-orphan")


class TOCNode(Base):
    __tablename__ = "toc_nodes"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("toc_analyses.id"), nullable=False)
    type = Column(String, nullable=False)
    label = Column(Text, nullable=False)
    x = Column(Float, default=0.0)
    y = Column(Float, default=0.0)

    analysis = relationship("TOCAnalysis", back_populates="toc_nodes")


class TOCEdge(Base):
    __tablename__ = "toc_edges"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("toc_analyses.id"), nullable=False)
    source_id = Column(Integer, ForeignKey("toc_nodes.id"), nullable=False)
    target_id = Column(Integer, ForeignKey("toc_nodes.id"), nullable=False)
    assumption = Column(Text, default="")

    analysis = relationship("TOCAnalysis", back_populates="toc_edges")


class NodeMetric(Base):
    __tablename__ = "node_metrics"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("vsm_nodes.id"), nullable=False)
    metric_name = Column(String, nullable=False)
    current_value = Column(Float, nullable=True)
    target_value = Column(Float, nullable=True)
    unit = Column(String, default="")
    source_type = Column(String, default="estimated")  # measured | estimated | assumed
    owner = Column(String, nullable=True)
    review_cycle = Column(String, nullable=True)  # daily | weekly | monthly
    notes = Column(String, nullable=True)


class Hypothesis(Base):
    __tablename__ = "hypotheses"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    suspected_constraint = Column(String, default="")
    expected_effect = Column(String, default="")
    validation_metrics = Column(String, default="[]")  # JSON array stored as string
    observation_window = Column(String, default="14 days")
    status = Column(String, default="draft")  # draft | running | validated | invalidated
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Mechanism(Base):
    __tablename__ = "mechanisms"

    id = Column(Integer, primary_key=True, index=True)
    linked_toc_node_id = Column(Integer, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    trigger = Column(String, default="")
    actor = Column(String, default="")
    frequency = Column(String, default="")
    input_rule = Column(String, nullable=True)
    output_rule = Column(String, nullable=True)
    exception_path = Column(String, nullable=True)
    escalation_rule = Column(String, nullable=True)
    sop_link = Column(String, nullable=True)
    backup_role = Column(String, nullable=True)
    owner = Column(String, nullable=True)
    health_status = Column(String, default="normal")  # normal | abnormal | stopped
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
