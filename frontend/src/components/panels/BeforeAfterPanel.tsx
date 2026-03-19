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

  const METRIC_LABELS: Record<string, string> = {
    cycle_time: 'C/T 週期時間',
    backlog: '待處理積壓',
    escalation_rate: '異常升報率',
    uptime: '稼動率',
    wip: '在製品數（WIP）',
  };

  return (
    <div className="ba-panel">
      <div className="ba-header">
        <div>
          <div className="ba-title">改善前後對比</div>
          <div className="ba-subtitle">VSM 績效指標變化</div>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="ba-body">
        {!projectId && <div className="ba-empty">請先儲存專案</div>}
        {projectId && rows.length === 0 && <div className="ba-empty">尚無可比較的指標</div>}
        {rows.length > 0 && (
          <table className="ba-table">
            <thead>
              <tr>
                <th>指標</th>
                <th>改善前</th>
                <th>改善後</th>
                <th>趨勢</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const trend = getTrend(r.before, r.after, r.metric_name);
                return (
                  <tr key={r.metric_name}>
                    <td className="ba-metric-name">
                      {METRIC_LABELS[r.metric_name] ?? r.metric_name.replace(/_/g, ' ')}
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
