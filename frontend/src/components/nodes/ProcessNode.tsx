import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { VSMNodeData, ConstraintCause } from '../../types';
import './nodes.css';

const CONSTRAINT_CAUSE_LABELS: Record<ConstraintCause, string> = {
  capacity: '產能',
  policy: '政策',
  skill: '技能',
  dependency: '依賴',
  demand_variation: '波動',
};

export function ProcessNode({ data, selected }: NodeProps) {
  const d = data as unknown as VSMNodeData;
  const p = d.properties;
  return (
    <div
      className={`vsm-node process-node ${selected ? 'selected' : ''} ${d.isBottleneck ? 'bottleneck' : ''}`}
    >
      {d.isBottleneck && (
        <div className="bottleneck-badge">
          ⚠ 制約站
          {d.constraintCause && (
            <span className="constraint-cause-tag">{CONSTRAINT_CAUSE_LABELS[d.constraintCause]}</span>
          )}
        </div>
      )}
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
      {d.notes && <div className="node-notes-icon" title={d.notes}>📝</div>}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
