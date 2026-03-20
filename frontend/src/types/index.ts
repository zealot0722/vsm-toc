export type NodeType = 'supplier' | 'process' | 'inventory' | 'customer' | 'infoflow';

export interface ProcessProperties extends Record<string, unknown> {
  cycleTime: number;
  uptime: number;
  shifts: number;
  workers: number;
  wip: number;
}

export type ConstraintCause = 'capacity' | 'policy' | 'skill' | 'dependency' | 'demand_variation';

export interface VSMNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  isBottleneck?: boolean;
  properties?: ProcessProperties;
  notes?: string;
  constraintCause?: ConstraintCause;
}

export interface ECAnalysis {
  id?: number;
  vsmNodeId: number;
  goal: string;
  needA: string;
  prereqA: string;
  needB: string;
  prereqB: string;
  assumptionAB?: string;
  assumptionAPrereqA?: string;
  assumptionBPrereqB?: string;
  brokenAssumption?: string;
}

export interface Project {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ApiVSMNode {
  id: number;
  project_id: number;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  properties: ProcessProperties | null;
}

export interface ApiVSMEdge {
  id: number;
  project_id: number;
  source_id: number;
  target_id: number;
  type: string;
}

// CRT / FRT types
export type TOCNodeType = 'symptom' | 'intermediate-cause' | 'core-constraint' | 'injection';

export interface TOCTreeNode {
  id: number;
  analysis_id: number;
  type: TOCNodeType;
  label: string;
  x: number;
  y: number;
}

export interface TOCTreeEdge {
  id: number;
  analysis_id: number;
  source_id: number;
  target_id: number;
  assumption: string;
}

export type TOCTab = 'ec' | 'crt' | 'frt';

// ── Phase 2 Types ───────────────────────────────────────────────────────────

export interface NodeMetric {
  id: number;
  node_id: number;
  metric_name: string;
  current_value: number | null;
  target_value: number | null;
  unit: string;
  source_type: string;
  owner: string | null;
  review_cycle: string | null;
  notes: string | null;
}

export interface Hypothesis {
  id: number;
  project_id: number;
  title: string;
  suspected_constraint: string;
  expected_effect: string;
  validation_metrics: string;
  observation_window: string;
  status: 'draft' | 'running' | 'validated' | 'invalidated';
  created_at: string;
}

export interface Mechanism {
  id: number;
  linked_toc_node_id: number | null;
  project_id: number;
  title: string;
  trigger: string;
  actor: string;
  frequency: string;
  input_rule: string | null;
  output_rule: string | null;
  exception_path: string | null;
  escalation_rule: string | null;
  sop_link: string | null;
  backup_role: string | null;
  owner: string | null;
  health_status: 'normal' | 'abnormal' | 'stopped';
  created_at: string;
}

export interface ConstraintScore {
  node_id: number;
  label: string;
  scores: {
    load_ratio: number;
    backlog: number;
    escalation: number;
    quality_gap: number;
    dependency_risk: number;
  };
  total: number;
}

export type Phase2Tab = 'constraint' | 'hypothesis' | 'mechanism';

export interface APIConfig {
  provider: 'openai' | 'claude' | 'custom';
  apiKey: string;
  endpoint?: string;
  model?: string;
}
