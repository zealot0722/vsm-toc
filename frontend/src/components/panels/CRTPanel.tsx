import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  BackgroundVariant,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import type { TOCNodeType, TOCTreeNode, TOCTreeEdge } from '../../types';
import { api } from '../../api/client';

/* ── Node colour map ─────────────────────────────────────────────────────── */

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  symptom:              { bg: '#2d1a1a', border: '#8b3030', text: '#ff8a8a' },
  'intermediate-cause': { bg: '#2d2a1a', border: '#8b7a30', text: '#ffd080' },
  'core-constraint':    { bg: '#2d1f0a', border: '#aa6020', text: '#ffaa50' },
};

/* ── Custom CRT node components ──────────────────────────────────────────── */

interface CRTNodeData extends Record<string, unknown> {
  label: string;
  tocNodeType: TOCNodeType;
  isCoreConstraint?: boolean;
}

function CRTNodeComponent({ data }: NodeProps<Node<CRTNodeData>>) {
  const colors = NODE_COLORS[data.tocNodeType] ?? NODE_COLORS.symptom;
  const typeLabels: Record<string, string> = {
    symptom: '非理想效果（UDE）',
    'intermediate-cause': '中間因果',
    'core-constraint': '核心制約',
  };
  return (
    <div
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 120,
        maxWidth: 200,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.border }} />
      <div style={{ fontSize: 9, fontWeight: 700, color: colors.border, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {typeLabels[data.tocNodeType] ?? data.tocNodeType}
      </div>
      <div style={{ fontSize: 12, color: colors.text, fontWeight: 500 }}>
        {data.label}
      </div>
      {data.isCoreConstraint && (
        <div style={{ fontSize: 9, color: '#ffaa50', marginTop: 4, fontWeight: 700 }}>
          ★ 核心制約
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: colors.border }} />
    </div>
  );
}

const CRT_NODE_TYPES: NodeTypes = {
  crtNode: CRTNodeComponent,
};

/* ── Core constraint auto-detection ──────────────────────────────────────── */

function detectCoreConstraints(
  nodes: Node<CRTNodeData>[],
  edges: Edge[],
): Set<string> {
  // Count how many symptom branches converge on each node
  // A node is a "core constraint" if it is an ancestor of 2+ symptom nodes

  const symptomIds = new Set(
    nodes.filter((n) => n.data.tocNodeType === 'symptom').map((n) => n.id),
  );

  // Build adjacency: target -> sources (who points to target)
  // edges go source -> target (cause -> effect, bottom -> top)
  // So we need: for each node, find which symptom descendants it reaches
  // Actually in CRT: cause is at the bottom, effect (symptom) at the top.
  // Edges: source=cause, target=effect. So we follow reverse (from symptom back to causes).

  // Build forward adjacency: source -> [targets] (cause -> effects)
  const childrenOf = new Map<string, string[]>();
  for (const e of edges) {
    const arr = childrenOf.get(e.source) ?? [];
    arr.push(e.target);
    childrenOf.set(e.source, arr);
  }

  // For each node, find all reachable symptom descendants
  const cache = new Map<string, Set<string>>();

  function getReachableSymptoms(nodeId: string): Set<string> {
    if (cache.has(nodeId)) return cache.get(nodeId)!;
    const result = new Set<string>();
    if (symptomIds.has(nodeId)) result.add(nodeId);
    for (const child of childrenOf.get(nodeId) ?? []) {
      for (const s of getReachableSymptoms(child)) result.add(s);
    }
    cache.set(nodeId, result);
    return result;
  }

  const coreIds = new Set<string>();
  for (const n of nodes) {
    if (n.data.tocNodeType === 'symptom') continue;
    const reachable = getReachableSymptoms(n.id);
    if (reachable.size >= 2) coreIds.add(n.id);
  }
  return coreIds;
}

/* ── CRT Panel Component ─────────────────────────────────────────────────── */

interface CRTPanelProps {
  analysisId: number | null;
  vsmNodeId: number | null;
  onAnalysisCreated: (id: number) => void;
}

export function CRTPanel({ analysisId, vsmNodeId, onAnalysisCreated }: CRTPanelProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CRTNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [addingType, setAddingType] = useState<TOCNodeType>('symptom');
  const nodeCounter = useRef(0);
  const currentAnalysisId = useRef<number | null>(analysisId);

  // Load existing tree data
  useEffect(() => {
    currentAnalysisId.current = analysisId;
    if (!analysisId) {
      setNodes([]);
      setEdges([]);
      return;
    }
    Promise.all([
      api.toc.nodes.list(analysisId) as Promise<TOCTreeNode[]>,
      api.toc.edges.list(analysisId) as Promise<TOCTreeEdge[]>,
    ]).then(([apiNodes, apiEdges]) => {
      const flowNodes: Node<CRTNodeData>[] = apiNodes.map((n) => ({
        id: String(n.id),
        type: 'crtNode',
        position: { x: n.x, y: n.y },
        data: { label: n.label, tocNodeType: n.type as TOCNodeType },
      }));
      const flowEdges: Edge[] = apiEdges.map((e) => ({
        id: `e${e.source_id}-${e.target_id}`,
        source: String(e.source_id),
        target: String(e.target_id),
        label: e.assumption || undefined,
        style: { stroke: '#4a6a9a' },
        animated: true,
        markerEnd: { type: 'arrowclosed' as const, color: '#4a6a9a' },
      }));
      setNodes(flowNodes);
      setEdges(flowEdges);
      nodeCounter.current = Math.max(0, ...apiNodes.map((n) => n.id)) + 1;
    }).catch(() => {});
  }, [analysisId, setNodes, setEdges]);

  // Auto-detect core constraints when nodes/edges change
  useEffect(() => {
    const coreIds = detectCoreConstraints(nodes, edges);
    setNodes((prev) =>
      prev.map((n) => {
        const isCoreConstraint = coreIds.has(n.id);
        const newType: TOCNodeType = isCoreConstraint ? 'core-constraint' : n.data.tocNodeType === 'core-constraint' ? 'intermediate-cause' : n.data.tocNodeType;
        if (n.data.isCoreConstraint === isCoreConstraint && n.data.tocNodeType === newType) return n;
        return { ...n, data: { ...n.data, isCoreConstraint, tocNodeType: newType } };
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges.length, nodes.length]);

  const ensureAnalysis = useCallback(async (): Promise<number> => {
    if (currentAnalysisId.current) return currentAnalysisId.current;
    if (!vsmNodeId) throw new Error('No VSM node');
    const result = await api.toc.create({
      vsm_node_id: vsmNodeId,
      type: 'CRT',
    }) as { id: number };
    currentAnalysisId.current = result.id;
    onAnalysisCreated(result.id);
    return result.id;
  }, [vsmNodeId, onAnalysisCreated]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            style: { stroke: '#4a6a9a' },
            animated: true,
            markerEnd: { type: 'arrowclosed' as const, color: '#4a6a9a' },
          },
          eds,
        ),
      );
      // Persist edge
      ensureAnalysis().then((aId) => {
        if (params.source && params.target) {
          api.toc.edges.create(aId, {
            analysis_id: aId,
            source_id: Number(params.source),
            target_id: Number(params.target),
          }).catch(() => {});
        }
      });
    },
    [setEdges, ensureAnalysis],
  );

  const addNode = useCallback(async () => {
    try {
      const aId = await ensureAnalysis();
      const result = await api.toc.nodes.create(aId, {
        analysis_id: aId,
        type: addingType,
        label: addingType === 'symptom'
          ? '新 UDE'
          : addingType === 'core-constraint'
            ? '核心制約'
            : '中間因果',
        x: 100 + Math.random() * 200,
        y: addingType === 'symptom' ? 50 : 200 + Math.random() * 150,
      }) as TOCTreeNode;

      const newNode: Node<CRTNodeData> = {
        id: String(result.id),
        type: 'crtNode',
        position: { x: result.x, y: result.y },
        data: { label: result.label, tocNodeType: result.type as TOCNodeType },
      };
      setNodes((nds) => [...nds, newNode]);
    } catch (e) {
      console.error('Failed to add CRT node', e);
    }
  }, [addingType, setNodes, ensureAnalysis]);

  const typeButtons: { type: TOCNodeType; label: string; color: string }[] = [
    { type: 'symptom', label: 'UDE（非理想效果）', color: '#8b3030' },
    { type: 'intermediate-cause', label: '中間因果', color: '#8b7a30' },
    { type: 'core-constraint', label: '核心制約', color: '#aa6020' },
  ];

  return (
    <div className="tree-panel-content">
      <div className="tree-toolbar">
        <div className="tree-node-types">
          {typeButtons.map((t) => (
            <button
              key={t.type}
              className={`tree-type-btn ${addingType === t.type ? 'active' : ''}`}
              style={{ borderColor: addingType === t.type ? t.color : 'transparent' }}
              onClick={() => setAddingType(t.type)}
            >
              <span className="tree-type-dot" style={{ background: t.color }} />
              {t.label}
            </button>
          ))}
        </div>
        <button className="tree-add-btn" onClick={addNode}>
          + 新增節點
        </button>
      </div>

      <div className="tree-hint">
        因果邏輯：下方原因 → 上方結果。核心制約為多條 UDE 分支的交匯根源，系統自動標記。
      </div>

      <div className="tree-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={CRT_NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: '#0a1020' }}
          deleteKeyCode={['Backspace', 'Delete']}
          defaultEdgeOptions={{ animated: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1a2540" />
          <Controls
            style={{
              background: '#0d1225',
              border: '1px solid #1e2d4d',
              borderRadius: '6px',
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
