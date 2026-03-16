import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { NodeMetric } from '../../types';
import './BeforeAfterPanel.css';

interface BeforeAfterPanelProps {
  projectId: number | null;
  onClose: () => void;
}

interface BeforeAfterRow {
  metric_name: string;
  unit: string;
  before: number | null;
  after: number | null;
}

export function BeforeAfterPanel({ projectId, onClose }: BeforeAfterPanelProps) {
  const [rows, setRows] = useState<BeforeAfterRow[]>([]);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const metrics = await api.metrics.list(projectId) as NodeMetric[];
      // Group by metric_name, use target_value as "before" (baseline) and current_value as "after"
      const grouped = new Map<string, BeforeAfterRow>();
      for (const m of metrics) {
        const key = m.metric_name;
        if (!grouped.has(key)) {
          grouped.set(key, {
            metric_name: m.metric_name,
            unit: m.unit,
            before: m.target_value,
            after: m.current_value,
          });
        } else {
          // Aggregate: sum values across nodes for the same metric
          const existing = grouped.get(key)!;
          existing.before = (existing.before ?? 0) + (m.target_value ?? 0);
          existing.after = (existing.after ?? 0) + (m.current_value ?? 0);
        }
      }
      setRows(Array.from(grouped.values()));
    } catch { /* ignore */ }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const getTrend = (before: number | null, after: number | null, metricName: string) => {
    if (before == null || after == null) return { arrow: '—', cls: 'neutral' };
    const diff = after - before;
    // For cycle_time and backlog, lower is better; for others, higher is better
    const lowerIsBetter = ['cycle_time', 'backlog', 'escalation_rate'].includes(metricName);
    if (diff === 0) return { arrow: '→', cls: 'neutral' };
    const improved = lowerIsBetter ? diff < 0 : diff > 0;
    return {
      arrow: diff > 0 ? '↑' : '↓',
      cls: improved ? 'good' : 'bad',
    };
  };

  return (
    <div className="ba-panel">
      <div className="ba-header">
        <div>
          <div className="ba-title">Before / After</div>
          <div className="ba-subtitle">Metric comparison</div>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="ba-body">
        {!projectId && <div className="ba-empty">Save project first</div>}
        {projectId && rows.length === 0 && <div className="ba-empty">No metrics to compare</div>}
        {rows.length > 0 && (
          <table className="ba-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Before</th>
                <th>After</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const trend = getTrend(r.before, r.after, r.metric_name);
                return (
                  <tr key={r.metric_name}>
                    <td className="ba-metric-name">
                      {r.metric_name.replace(/_/g, ' ')}
                      {r.unit && <span className="ba-unit"> ({r.unit})</span>}
                    </td>
                    <td className="ba-val">{r.before ?? '—'}</td>
                    <td className="ba-val">{r.after ?? '—'}</td>
                    <td className={`ba-trend ${trend.cls}`}>{trend.arrow}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
