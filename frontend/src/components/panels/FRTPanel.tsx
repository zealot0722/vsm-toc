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
  injection:            { bg: '#1a2d1a', border: '#309050', text: '#80e0a0' },
};

/* ── Custom FRT node components ──────────────────────────────────────────── */

interface FRTNodeData extends Record<string, unknown> {
  label: string;
  tocNodeType: TOCNodeType;
}

function FRTNodeComponent({ data }: NodeProps<Node<FRTNodeData>>) {
  const colors = NODE_COLORS[data.tocNodeType] ?? NODE_COLORS.symptom;
  const typeLabels: Record<string, string> = {
    symptom: '期望效果（DE）',
    'intermediate-cause': '中間效果',
    'core-constraint': '根本性變革',
    injection: '注入（Injection）',
  };
  const isInjection = data.tocNodeType === 'injection';

  return (
    <div
      style={{
        background: colors.bg,
        border: `2px ${isInjection ? 'dashed' : 'solid'} ${colors.border}`,
        borderRadius: isInjection ? 12 : 8,
        padding: '8px 12px',
        minWidth: 120,
        maxWidth: 200,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.border }} />
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: colors.border,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 4,
        }}
      >
        {isInjection ? 'INJECTION' : typeLabels[data.tocNodeType] ?? data.tocNodeType}
      </div>
      <div style={{ fontSize: 12, color: colors.text, fontWeight: 500 }}>
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: colors.border }} />
    </div>
  );
}

const FRT_NODE_TYPES: NodeTypes = {
  frtNode: FRTNodeComponent,
};

/* ── FRT Panel Component ─────────────────────────────────────────────────── */

interface FRTPanelProps {
  analysisId: number | null;
  vsmNodeId: number | null;
  onAnalysisCreated: (id: number) => void;
}

export function FRTPanel({ analysisId, vsmNodeId, onAnalysisCreated }: FRTPanelProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FRTNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [addingType, setAddingType] = useState<TOCNodeType>('injection');
  const [negBranchMode, setNegBranchMode] = useState(false);
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
      const flowNodes: Node<FRTNodeData>[] = apiNodes.map((n) => ({
        id: String(n.id),
        type: 'frtNode',
        position: { x: n.x, y: n.y },
        data: { label: n.label, tocNodeType: n.type as TOCNodeType },
      }));
      const flowEdges: Edge[] = apiEdges.map((e) => {
        const isNegative = e.assumption === 'negative-branch';
        return {
          id: `e${e.source_id}-${e.target_id}`,
          source: String(e.source_id),
          target: String(e.target_id),
          label: isNegative ? '負面分支' : e.assumption || undefined,
          style: isNegative
            ? { stroke: '#ff4444', strokeDasharray: '6 3' }
            : { stroke: '#309050' },
          animated: !isNegative,
          markerEnd: { type: 'arrowclosed' as const, color: isNegative ? '#ff4444' : '#309050' },
        };
      });
      setNodes(flowNodes);
      setEdges(flowEdges);
      nodeCounter.current = Math.max(0, ...apiNodes.map((n) => n.id)) + 1;
    }).catch(() => {});
  }, [analysisId, setNodes, setEdges]);

  const ensureAnalysis = useCallback(async (): Promise<number> => {
    if (currentAnalysisId.current) return currentAnalysisId.current;
    if (!vsmNodeId) throw new Error('No VSM node');
    const result = await api.toc.create({
      vsm_node_id: vsmNodeId,
      type: 'FRT',
    }) as { id: number };
    currentAnalysisId.current = result.id;
    onAnalysisCreated(result.id);
    return result.id;
  }, [vsmNodeId, onAnalysisCreated]);

  const onConnect = useCallback(
    (params: Connection) => {
      const isNegative = negBranchMode;
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            style: isNegative
              ? { stroke: '#ff4444', strokeDasharray: '6 3' }
              : { stroke: '#309050' },
            animated: !isNegative,
            label: isNegative ? '負面分支' : undefined,
            markerEnd: { type: 'arrowclosed' as const, color: isNegative ? '#ff4444' : '#309050' },
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
            assumption: isNegative ? 'negative-branch' : '',
          }).catch(() => {});
        }
      });
    },
    [setEdges, ensureAnalysis, negBranchMode],
  );

  const addNode = useCallback(async () => {
    try {
      const aId = await ensureAnalysis();
      const labelMap: Record<string, string> = {
        injection: '新注入',
        symptom: '期望效果',
        'intermediate-cause': '中間效果',
        'core-constraint': '根本性變革',
      };
      const result = await api.toc.nodes.create(aId, {
        analysis_id: aId,
        type: addingType,
        label: labelMap[addingType] ?? '新節點',
        x: 100 + Math.random() * 200,
        y: addingType === 'injection' ? 300 : addingType === 'symptom' ? 50 : 150 + Math.random() * 100,
      }) as TOCTreeNode;

      const newNode: Node<FRTNodeData> = {
        id: String(result.id),
        type: 'frtNode',
        position: { x: result.x, y: result.y },
        data: { label: result.label, tocNodeType: result.type as TOCNodeType },
      };
      setNodes((nds) => [...nds, newNode]);
    } catch (e) {
      console.error('Failed to add FRT node', e);
    }
  }, [addingType, setNodes, ensureAnalysis]);

  const typeButtons: { type: TOCNodeType; label: string; color: string }[] = [
    { type: 'injection', label: '注入（Injection）', color: '#309050' },
    { type: 'symptom', label: '期望效果（DE）', color: '#8b3030' },
    { type: 'intermediate-cause', label: '中間效果', color: '#8b7a30' },
    { type: 'core-constraint', label: '根本性變革', color: '#aa6020' },
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
        <div className="tree-toolbar-row">
          <button className="tree-add-btn" onClick={addNode}>
            + 新增節點
          </button>
          <button
            className={`tree-neg-btn ${negBranchMode ? 'active' : ''}`}
            onClick={() => setNegBranchMode((v) => !v)}
            title="切換負面分支模式"
          >
            {negBranchMode ? '負面分支 ●' : '負面分支'}
          </button>
        </div>
      </div>

      <div className="tree-hint">
        從注入（Injection）出發，驗證能否產生期望效果（DE）。開啟「負面分支」以標記可能的副作用連線。
      </div>

      <div className="tree-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={FRT_NODE_TYPES}
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
