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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SupplierNode }  from './nodes/SupplierNode';
import { ProcessNode }   from './nodes/ProcessNode';
import { InventoryNode } from './nodes/InventoryNode';
import { CustomerNode }  from './nodes/CustomerNode';
import { InfoFlowNode }  from './nodes/InfoFlowNode';
import { TOCPanel }      from './panels/TOCPanel';
import type { NodeType, VSMNodeData, ProcessProperties } from '../types';
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
    data: { label: 'Supplier', nodeType: 'supplier' },
  },
  {
    id: '2', type: 'process', position: { x: 260, y: 180 },
    data: { label: 'Cutting', nodeType: 'process',
      properties: { cycleTime: 45, uptime: 90, shifts: 2, workers: 3, wip: 20 } },
  },
  {
    id: '3', type: 'inventory', position: { x: 460, y: 220 },
    data: { label: 'WIP Buffer', nodeType: 'inventory',
      properties: { cycleTime: 0, uptime: 100, shifts: 1, workers: 0, wip: 50 } },
  },
  {
    id: '4', type: 'process', position: { x: 580, y: 180 },
    data: { label: 'Welding', nodeType: 'process',
      properties: { cycleTime: 120, uptime: 85, shifts: 2, workers: 5, wip: 35 } },
  },
  {
    id: '5', type: 'process', position: { x: 800, y: 180 },
    data: { label: 'Assembly', nodeType: 'process',
      properties: { cycleTime: 60, uptime: 95, shifts: 2, workers: 4, wip: 15 } },
  },
  {
    id: '6', type: 'customer', position: { x: 1020, y: 200 },
    data: { label: 'Customer', nodeType: 'customer' },
  },
  {
    id: '7', type: 'infoflow', position: { x: 500, y: 60 },
    data: { label: 'Production Schedule', nodeType: 'infoflow' },
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

interface VSMCanvasProps {
  projectId: number | null;
  nodeIdMap: Map<string, number>;
}

export function VSMCanvas({ projectId: _projectId, nodeIdMap: _nodeIdMap }: VSMCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedBottleneckNode, setSelectedBottleneckNode] = useState<FlowNode | null>(null);
  const [showTOC, setShowTOC] = useState(false);
  const [editingNode, setEditingNode] = useState<FlowNode | null>(null);
  const nodeCounter = useRef(INITIAL_NODES.length + 1);

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
    if (n.data.isBottleneck) {
      setSelectedBottleneckNode(n);
      setShowTOC(true);
    } else {
      setEditingNode(n);
    }
  }, []);

  const addNode = useCallback((type: NodeType) => {
    const id = String(++nodeCounter.current);
    const defaults: Record<NodeType, Partial<VSMNodeData>> = {
      supplier:  { label: 'Supplier' },
      process:   { label: 'New Process', properties: { cycleTime: 30, uptime: 90, shifts: 1, workers: 2, wip: 10 } },
      inventory: { label: 'Inventory', properties: { cycleTime: 0, uptime: 100, shifts: 1, workers: 0, wip: 0 } },
      customer:  { label: 'Customer' },
      infoflow:  { label: 'Info Flow' },
    };
    const newNode: FlowNode = {
      id, type,
      position: { x: 200 + Math.random() * 300, y: 150 + Math.random() * 150 },
      data: { nodeType: type, ...defaults[type] } as VSMNodeData,
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__vsmAddNode = addNode;
  }, [addNode]);

  // ── Lead Time Calculations ──────────────────────────────────────────────
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

  return (
    <div className="vsm-canvas-wrapper">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        style={{ background: '#1a1a2e' }}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e2d4d" />
        <Controls style={{ background: '#0d1225', border: '1px solid #1e2d4d', borderRadius: '8px' }} />
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
        <Panel position="top-right" style={{ marginRight: showTOC ? '390px' : '0', transition: 'margin 0.25s' }}>
          <div className="flow-stats">
            <span className="stat-label">Nodes</span>
            <span className="stat-value">{nodes.length}</span>
            <span className="stat-label">Process</span>
            <span className="stat-value">{nodes.filter(n => n.type === 'process').length}</span>
          </div>
        </Panel>
      </ReactFlow>

      <div className="lead-time-bar">
        <div className="lt-metric">
          <span className="lt-label">Total Lead Time</span>
          <span className="lt-value">{leadTimeMetrics.totalLeadTime}s</span>
        </div>
        <div className="lt-divider" />
        <div className="lt-metric">
          <span className="lt-label">Value-Added Time</span>
          <span className="lt-value lt-va">{leadTimeMetrics.valueAddedTime}s</span>
        </div>
        <div className="lt-divider" />
        <div className="lt-metric">
          <span className="lt-label">Process Efficiency</span>
          <span className={`lt-value ${leadTimeMetrics.efficiency < 25 ? 'lt-low' : leadTimeMetrics.efficiency < 50 ? 'lt-mid' : 'lt-high'}`}>
            {leadTimeMetrics.efficiency.toFixed(1)}%
          </span>
        </div>
      </div>

      {showTOC && selectedBottleneckNode && (
        <TOCPanel
          node={selectedBottleneckNode}
          apiNodeId={null}
          onClose={() => setShowTOC(false)}
        />
      )}

      {editingNode && editingNode.type === 'process' && (
        <NodeEditModal
          node={editingNode}
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

interface NodeEditModalProps {
  node: FlowNode;
  onSave: (node: FlowNode) => void;
  onClose: () => void;
}

function NodeEditModal({ node, onSave, onClose }: NodeEditModalProps) {
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
          <span>Edit Process Node</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          {(
            [
              ['cycleTime', 'Cycle Time (s)'],
              ['uptime', 'Uptime (%)'],
              ['shifts', 'Shifts'],
              ['workers', 'Workers'],
              ['wip', 'WIP'],
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
        </div>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
          <button
            className="modal-btn save"
            onClick={() => onSave({ ...node, data: { ...node.data, label, properties: props } })}
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
