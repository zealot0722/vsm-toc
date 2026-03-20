import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { VSMNodeData } from '../../types';
import './nodes.css';

export function SupplierNode({ data, selected }: NodeProps) {
  const d = data as unknown as VSMNodeData;
  return (
    <div className={`vsm-node supplier-node ${selected ? 'selected' : ''}`}>
      <div className="node-icon">🏭</div>
      <div className="node-label">{d.label}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
