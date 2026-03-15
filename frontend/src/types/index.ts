export type NodeType = 'supplier' | 'process' | 'inventory' | 'customer' | 'infoflow';

export interface ProcessProperties extends Record<string, unknown> {
  cycleTime: number;
  uptime: number;
  shifts: number;
  workers: number;
  wip: number;
}

export interface VSMNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  isBottleneck?: boolean;
  properties?: ProcessProperties;
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
