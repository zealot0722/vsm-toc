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
      {d.isBottleneck && <div className="bottleneck-badge">⚠ Bottleneck</div>}
      <div className="node-label">{d.label}</div>
      {p && (
        <div className="node-props">
          <div className="prop-row"><span>CT</span><span>{p.cycleTime}s</span></div>
          <div className="prop-row"><span>Uptime</span><span>{p.uptime}%</span></div>
          <div className="prop-row"><span>Shifts</span><span>{p.shifts}</span></div>
          <div className="prop-row"><span>Workers</span><span>{p.workers}</span></div>
          <div className="prop-row"><span>WIP</span><span>{p.wip}</span></div>
        </div>
      )}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
