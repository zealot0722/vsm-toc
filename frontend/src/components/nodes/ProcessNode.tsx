import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { VSMNodeData } from '../../types';
import './nodes.css';

export function ProcessNode({ data, selected }: NodeProps) {
  const d = data as unknown as VSMNodeData;
  const p = d.properties;
  return (
    <div
      className={`vsm-node process-node ${selected ? 'selected' : ''} ${d.isBottleneck ? 'bottleneck' : ''}`}
    >
      {d.isBottleneck && <div className="bottleneck-badge">⚠ 制約站</div>}
      <div className="node-label">{d.label}</div>
      {p && (
        <div className="node-props">
          <div className="prop-row"><span>週期</span><span>{p.cycleTime}s</span></div>
          <div className="prop-row"><span>稼動率</span><span>{p.uptime}%</span></div>
          <div className="prop-row"><span>班次</span><span>{p.shifts}</span></div>
          <div className="prop-row"><span>人數</span><span>{p.workers}</span></div>
          <div className="prop-row"><span>在製品</span><span>{p.wip}</span></div>
        </div>
      )}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
