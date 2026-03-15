import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { VSMNodeData } from '../../types';
import './nodes.css';

export function InventoryNode({ data, selected }: NodeProps) {
  const d = data as unknown as VSMNodeData;
  return (
    <div className={`vsm-node inventory-node ${selected ? 'selected' : ''}`}>
      <div className="inventory-icon">▽</div>
      <div className="node-label">{d.label}</div>
      {d.properties && (
        <div className="node-props">
          <div className="prop-row"><span>WIP</span><span>{d.properties.wip}</span></div>
        </div>
      )}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
