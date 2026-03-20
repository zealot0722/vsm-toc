import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  BackgroundVariant,
  Panel,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SupplierNode }  from './nodes/SupplierNode';
import { ProcessNode }   from './nodes/ProcessNode';
import { InventoryNode } from './nodes/InventoryNode';
import { CustomerNode }  from './nodes/CustomerNode';
import { InfoFlowNode }  from './nodes/InfoFlowNode';
import { TOCPanel }      from './panels/TOCPanel';
import { Phase2Panel }   from './panels/Phase2Panel';
import { BeforeAfterPanel } from './panels/BeforeAfterPanel';
import type { NodeType, VSMNodeData, ProcessProperties, NodeMetric } from '../types';
import { api } from '../api/client';
import './VSMCanvas.css';

const NODE_TYPES: NodeTypes = {
  supplier:  SupplierNode,
  process:   ProcessNode,
  inventory: InventoryNode,
  customer:  CustomerNode,
  infoflow:  InfoFlowNode,
};

type FlowNode = Node<VSMNodeData>;

const INITIAL_NODES: FlowNode[] = [
  {
    id: '1', type: 'supplier', position: { x: 60, y: 200 },
    data: { label: '供應商', nodeType: 'supplier' },
  },
  {
    id: '2', type: 'process', position: { x: 260, y: 180 },
    data: { label: '裁切', nodeType: 'process',
      properties: { cycleTime: 45, uptime: 90, shifts: 2, workers: 3, wip: 20 } },
  },
  {
    id: '3', type: 'inventory', position: { x: 460, y: 220 },
    data: { label: '在製品緩衝', nodeType: 'inventory',
      properties: { cycleTime: 0, uptime: 100, shifts: 1, workers: 0, wip: 50 } },
  },
  {
    id: '4', type: 'process', position: { x: 580, y: 180 },
    data: { label: '焊接', nodeType: 'process',
      properties: { cycleTime: 120, uptime: 85, shifts: 2, workers: 5, wip: 35 } },
  },
  {
    id: '5', type: 'process', position: { x: 800, y: 180 },
    data: { label: '組裝', nodeType: 'process',
      properties: { cycleTime: 60, uptime: 95, shifts: 2, workers: 4, wip: 15 } },
  },
  {
    id: '6', type: 'customer', position: { x: 1020, y: 200 },
    data: { label: '客戶', nodeType: 'customer' },
  },
  {
    id: '7', type: 'infoflow', position: { x: 500, y: 60 },
    data: { label: '生產排程', nodeType: 'infoflow' },
  },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep' },
  { id: 'e2-3', source: '2', target: '3', type: 'smoothstep' },
  { id: 'e3-4', source: '3', target: '4', type: 'smoothstep' },
  { id: 'e4-5', source: '4', target: '5', type: 'smoothstep' },
  { id: 'e5-6', source: '5', target: '6', type: 'smoothstep' },
  {
    id: 'e7-4', source: '7', target: '4', type: 'smoothstep',
    style: { strokeDasharray: '5 3', stroke: '#2d6a7a' },
  },
];

function detectBottleneck(nodes: FlowNode[]): string | null {
  let maxCT = -1;
  let bottleneckId: string | null = null;
  for (const node of nodes) {
    if (node.type === 'process' && node.data.properties) {
      const ct = node.data.properties.cycleTime;
      if (ct > maxCT) { maxCT = ct; bottleneckId = node.id; }
    }
  }
  return bottleneckId;
}

// ── Export to Markdown (for AI analysis) ──────────────────────────────────────
export function exportToMarkdown(nodes: FlowNode[], edges: Edge[]): string {
  const bottleneckId = detectBottleneck(nodes);
  const typeLabels: Record<string, string> = {
    supplier: '供應商', process: '製程站', inventory: '在製品庫存',
    customer: '客戶', infoflow: '資訊流',
  };

  let md = '# VSM 流程圖分析\n\n';
  md += '## 製程節點\n';
  md += '| 節點 | 類型 | C/T(s) | 稼動率(%) | 人數 | WIP | 制約站 |\n';
  md += '|------|------|--------|-----------|------|-----|--------|\n';
  for (const n of nodes) {
    const props = n.data.properties;
    const type = typeLabels[n.type ?? ''] ?? n.type ?? '';
    const ct = props?.cycleTime ?? '—';
    const uptime = props?.uptime ?? '—';
    const workers = props?.workers ?? '—';
    const wip = props?.wip ?? '—';
    const isBn = n.id === bottleneckId ? '是' : '否';
    md += `| ${n.data.label} | ${type} | ${ct} | ${uptime} | ${workers} | ${wip} | ${isBn} |\n`;
  }

  md += '\n## 連線關係\n';
  for (const e of edges) {
    const src = nodes.find(n => n.id === e.source);
    const tgt = nodes.find(n => n.id === e.target);
    if (src && tgt) md += `- ${src.data.label} → ${tgt.data.label}\n`;
  }

  let valueAddedTime = 0;
  let wipDelay = 0;
  for (const n of nodes) {
    const props = n.data.properties;
    if (!props) continue;
    if (n.type === 'process') {
      valueAddedTime += props.cycleTime;
      wipDelay += props.wip;
    } else if (n.type === 'inventory') {
      wipDelay += props.wip;
    }
  }
  const totalLeadTime = valueAddedTime + wipDelay;
  const efficiency = totalLeadTime > 0 ? (valueAddedTime / totalLeadTime) * 100 : 0;

  md += '\n## 效率指標\n';
  md += `- 總前置時間：${totalLeadTime}s\n`;
  md += `- 增值時間：${valueAddedTime}s\n`;
  md += `- 流程效率（PCE）：${efficiency.toFixed(1)}%\n`;

  if (bottleneckId) {
    const bn = nodes.find(n => n.id === bottleneckId);
    if (bn?.data.properties) {
      md += '\n## TOC 識別\n';
      md += `- 制約站：${bn.data.label}（C/T 最高：${bn.data.properties.cycleTime}s）\n`;
    }
  }

  return md;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface VSMCanvasProps {
  projectId: number | null;
  nodeIdMap: Map<string, number>;
}

export function VSMCanvas({ projectId, nodeIdMap: _nodeIdMap }: VSMCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedBottleneckNode, setSelectedBottleneckNode] = useState<FlowNode | null>(null);
  const [showTOC, setShowTOC] = useState(false);
  const [showPhase2, setShowPhase2] = useState(false);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [editingNode, setEditingNode] = useState<FlowNode | null>(null);
  const [nodeMetrics, setNodeMetrics] = useState<NodeMetric[]>([]);
  const nodeCounter = useRef(INITIAL_NODES.length + 1);

  // Edge context menu
  const [edgeMenu, setEdgeMenu] = useState<{ edgeId: string; x: number; y: number } | null>(null);

  // Load node metrics when project is available
  useEffect(() => {
    if (!projectId) return;
    api.metrics.list(projectId).then((data) => setNodeMetrics(data as NodeMetric[])).catch(() => {});
  }, [projectId]);

  const cycleTimes = nodes.map(n => n.data.properties?.cycleTime ?? 0).join(',');
  useEffect(() => {
    const bottleneckId = detectBottleneck(nodes);
    setNodes((prev) =>
      prev.map((n) => ({ ...n, data: { ...n.data, isBottleneck: n.id === bottleneckId } }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleTimes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const n = node as FlowNode;
    setEdgeMenu(null);
    if (n.data.isBottleneck) {
      setSelectedBottleneckNode(n);
      setShowTOC(true);
    } else {
      setEditingNode(n);
    }
  }, []);

  // ── Edge context menu handlers ──────────────────────────────────────────────
  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    event.stopPropagation();
    setEdgeMenu({ edgeId: edge.id, x: event.clientX, y: event.clientY });
  }, []);

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setEdgeMenu(null);
  }, [setEdges]);

  // ── Add node ────────────────────────────────────────────────────────────────
  const addNode = useCallback((type: NodeType) => {
    const id = String(++nodeCounter.current);
    const defaults: Record<NodeType, Partial<VSMNodeData>> = {
      supplier:  { label: '供應商' },
      process:   { label: '新製程站', properties: { cycleTime: 30, uptime: 90, shifts: 1, workers: 2, wip: 10 } },
      inventory: { label: '在製品庫存', properties: { cycleTime: 0, uptime: 100, shifts: 1, workers: 0, wip: 0 } },
      customer:  { label: '客戶' },
      infoflow:  { label: '資訊流' },
    };
    const newNode: FlowNode = {
      id, type,
      position: { x: 200 + Math.random() * 300, y: 150 + Math.random() * 150 },
      data: { nodeType: type, ...defaults[type] } as VSMNodeData,
    };
    setNodes((nds) => [...nds, newNode]);

    if (type === 'process' && projectId) {
      const defaultMetrics = [
        { node_id: Number(id), metric_name: 'cycle_time', unit: 'min', current_value: 30, target_value: 20, source_type: 'estimated' },
        { node_id: Number(id), metric_name: 'backlog', unit: 'count', current_value: 10, target_value: 5, source_type: 'estimated' },
        { node_id: Number(id), metric_name: 'escalation_rate', unit: '%', current_value: 5, target_value: 2, source_type: 'estimated' },
      ];
      for (const m of defaultMetrics) {
        api.metrics.create(projectId, m).catch(() => {});
      }
    }
  }, [setNodes, projectId]);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__vsmAddNode = addNode;
  }, [addNode]);

  // Expose exportToMarkdown for AI analysis
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__vsmExportMarkdown = () => exportToMarkdown(nodes, edges);
  }, [nodes, edges]);

  // ── Lead Time Calculations ──────────────────────────────────────────────────
  const leadTimeMetrics = useMemo(() => {
    let valueAddedTime = 0;
    let wipDelay = 0;

    for (const n of nodes) {
      const props = n.data.properties;
      if (!props) continue;

      if (n.type === 'process') {
        valueAddedTime += props.cycleTime;
        wipDelay += props.wip;
      } else if (n.type === 'inventory') {
        wipDelay += props.wip;
      }
    }

    const totalLeadTime = valueAddedTime + wipDelay;
    const efficiency = totalLeadTime > 0
      ? (valueAddedTime / totalLeadTime) * 100
      : 0;

    return { totalLeadTime, valueAddedTime, efficiency };
  }, [nodes]);

  const getNodeMetrics = useCallback((nodeId: string) => {
    return nodeMetrics.filter(m => String(m.node_id) === nodeId);
  }, [nodeMetrics]);

  const rightPanelOpen = showTOC || showPhase2 || showBeforeAfter;

  return (
    <div
      className="vsm-canvas-wrapper"
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => setEdgeMenu(null)}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={() => setEdgeMenu(null)}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        style={{ background: '#1a1a2e' }}
        deleteKeyCode={['Backspace', 'Delete']}
        panOnDrag={[1, 2]}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        zoomOnScroll
        zoomOnPinch
        panOnScroll={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e2d4d" />
        <Controls
          showInteractive={false}
          style={{ background: '#0d1225', border: '1px solid #1e2d4d', borderRadius: '8px' }}
        />
        <MiniMap
          style={{ background: '#0d1225', border: '1px solid #1e2d4d', borderRadius: '8px' }}
          nodeColor={(n) => {
            const d = n.data as VSMNodeData;
            if (d.isBottleneck) return '#ff6b6b';
            const colorMap: Record<string, string> = {
              supplier: '#3d7a6b', process: '#2d4a7a', inventory: '#7a5c2d',
              customer: '#5a3d7a', infoflow: '#2d6a7a',
            };
            return colorMap[n.type ?? ''] ?? '#2d4a7a';
          }}
          maskColor="rgba(0,0,0,0.5)"
        />
        <Panel position="top-right" style={{ marginRight: rightPanelOpen ? '410px' : '0', transition: 'margin 0.25s' }}>
          <div className="flow-stats">
            <span className="stat-label">節點數</span>
            <span className="stat-value">{nodes.length}</span>
            <span className="stat-label">製程站</span>
            <span className="stat-value">{nodes.filter(n => n.type === 'process').length}</span>
            <div className="stat-divider" />
            <button
              className={`stat-toggle ${showPhase2 ? 'active' : ''}`}
              onClick={() => { setShowPhase2(!showPhase2); setShowTOC(false); setShowBeforeAfter(false); }}
              title="深度分析"
            >
              深度分析
            </button>
            <button
              className={`stat-toggle ${showBeforeAfter ? 'active' : ''}`}
              onClick={() => { setShowBeforeAfter(!showBeforeAfter); setShowTOC(false); setShowPhase2(false); }}
              title="改善前後比較"
            >
              前後
            </button>
          </div>
        </Panel>
      </ReactFlow>

      <div className="lead-time-bar">
        <div className="lt-metric">
          <span className="lt-label">總前置時間</span>
          <span className="lt-value">{leadTimeMetrics.totalLeadTime}s</span>
        </div>
        <div className="lt-divider" />
        <div className="lt-metric">
          <span className="lt-label">增值時間</span>
          <span className="lt-value lt-va">{leadTimeMetrics.valueAddedTime}s</span>
        </div>
        <div className="lt-divider" />
        <div className="lt-metric">
          <span className="lt-label">流程效率（PCE）</span>
          <span className={`lt-value ${leadTimeMetrics.efficiency < 25 ? 'lt-low' : leadTimeMetrics.efficiency < 50 ? 'lt-mid' : 'lt-high'}`}>
            {leadTimeMetrics.efficiency.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* ── Edge Context Menu ──────────────────────────────────────────────── */}
      {edgeMenu && (
        <div
          className="edge-context-menu"
          style={{ position: 'fixed', left: edgeMenu.x, top: edgeMenu.y, zIndex: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => deleteEdge(edgeMenu.edgeId)}>🗑 刪除連線</button>
        </div>
      )}

      {showTOC && selectedBottleneckNode && (
        <TOCPanel
          node={selectedBottleneckNode}
          apiNodeId={null}
          onClose={() => setShowTOC(false)}
        />
      )}

      {showPhase2 && (
        <Phase2Panel
          projectId={projectId}
          nodes={nodes}
          onClose={() => setShowPhase2(false)}
        />
      )}

      {showBeforeAfter && (
        <BeforeAfterPanel
          projectId={projectId}
          onClose={() => setShowBeforeAfter(false)}
        />
      )}

      {editingNode && editingNode.type === 'process' && (
        <NodeEditModal
          node={editingNode}
          metrics={getNodeMetrics(editingNode.id)}
          onSave={(updated) => {
            setNodes((nds) => nds.map((n) => n.id === updated.id ? { ...n, data: updated.data } : n));
            setEditingNode(null);
          }}
          onClose={() => setEditingNode(null)}
        />
      )}
    </div>
  );
}

// ── Node Edit Modal ───────────────────────────────────────────────────────────

interface NodeEditModalProps {
  node: FlowNode;
  metrics: NodeMetric[];
  onSave: (node: FlowNode) => void;
  onClose: () => void;
}

function NodeEditModal({ node, metrics, onSave, onClose }: NodeEditModalProps) {
  const [label, setLabel] = useState(node.data.label);
  const [props, setProps] = useState<ProcessProperties>(
    node.data.properties ?? { cycleTime: 30, uptime: 90, shifts: 1, workers: 2, wip: 10 }
  );

  const setProp = (key: keyof ProcessProperties, val: string) =>
    setProps((p) => ({ ...p, [key]: Number(val) }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>編輯製程站</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>名稱</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          {(
            [
              ['cycleTime', 'C/T 週期時間（秒）'],
              ['uptime', '稼動率（%）'],
              ['shifts', '班次數'],
              ['workers', '作業人數'],
              ['wip', '在製品數（WIP）'],
            ] as [keyof ProcessProperties, string][]
          ).map(([key, lbl]) => (
            <div className="form-group" key={key}>
              <label>{lbl}</label>
              <input
                type="number"
                value={props[key] as number}
                onChange={(e) => setProp(key, e.target.value)}
                min={0}
              />
            </div>
          ))}

          {metrics.length > 0 && (
            <>
              <div className="modal-metrics-divider" />
              <div className="modal-metrics-title">製程站績效指標</div>
              {metrics.map((m) => {
                const gap = m.current_value != null && m.target_value != null && m.target_value !== 0
                  ? ((m.current_value - m.target_value) / Math.abs(m.target_value) * 100)
                  : null;
                return (
                  <div key={m.id} className="metric-inline">
                    <span className="metric-inline-name">{m.metric_name.replace(/_/g, ' ')}</span>
                    <span className="metric-inline-values">
                      <span>{m.current_value ?? '—'}</span>
                      <span className="metric-arrow">→</span>
                      <span className="metric-target">{m.target_value ?? '—'}</span>
                      {gap !== null && (
                        <span className={`metric-gap ${gap <= 0 ? 'good' : 'bad'}`}>
                          {gap > 0 ? '+' : ''}{gap.toFixed(0)}%
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onClose}>取消</button>
          <button
            className="modal-btn save"
            onClick={() => onSave({ ...node, data: { ...node.data, label, properties: props } })}
          >
            更新
          </button>
        </div>
      </div>
    </div>
  );
}
