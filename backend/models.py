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
