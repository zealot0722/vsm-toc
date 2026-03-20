import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { ConstraintScore, Hypothesis, Mechanism, Phase2Tab, VSMNodeData } from '../../types';
import './Phase2Panel.css';

// ── Types for canvas nodes (minimal subset) ───────────────────────────────────
interface CanvasNode {
  id: string;
  type?: string;
  data: VSMNodeData;
}

interface Phase2PanelProps {
  projectId: number | null;
  nodes: CanvasNode[];
  onClose: () => void;
}

// ── Local storage helpers ─────────────────────────────────────────────────────
const HYPS_KEY = 'vsm_hypotheses';
const MECHS_KEY = 'vsm_mechanisms';

function loadLocal<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}

function saveLocal<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Local constraint score calculation ────────────────────────────────────────
function computeLocalScores(nodes: CanvasNode[]): ConstraintScore[] {
  const processNodes = nodes.filter(n => n.type === 'process' && n.data.properties);
  if (processNodes.length === 0) return [];

  const avgCT = processNodes.reduce((sum, n) => sum + (n.data.properties?.cycleTime ?? 0), 0) / processNodes.length;

  return processNodes.map(n => {
    const props = n.data.properties!;
    const load_ratio = avgCT > 0 ? props.cycleTime / avgCT : 0;
    const backlog = props.wip / 20;
    const escalation = (100 - props.uptime) / 50;
    const quality_gap = (100 - props.uptime) / 100;
    const dependency_risk = (props.wip * props.cycleTime) / 2000;

    const scores = { load_ratio, backlog, escalation, quality_gap, dependency_risk };
    const total = Object.values(scores).reduce((a, b) => a + b, 0);

    return {
      node_id: Number(n.id),
      label: n.data.label,
      scores,
      total,
    };
  });
}

// ── Status / Health colors ────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  draft: '#c8b472',
  running: '#7ab8f5',
  validated: '#88d8b0',
  invalidated: '#ff6b6b',
};

const HEALTH_COLORS: Record<string, string> = {
  normal: '#88d8b0',
  abnormal: '#c8b472',
  stopped: '#ff6b6b',
};

// ── Component ─────────────────────────────────────────────────────────────────
export function Phase2Panel({ projectId, nodes, onClose }: Phase2PanelProps) {
  const [tab, setTab] = useState<Phase2Tab>('constraint');
  const [scores, setScores] = useState<ConstraintScore[]>([]);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [mechanisms, setMechanisms] = useState<Mechanism[]>([]);
  const [editingHyp, setEditingHyp] = useState<Partial<Hypothesis> | null>(null);
  const [editingMech, setEditingMech] = useState<Partial<Mechanism> | null>(null);

  const load = useCallback(() => {
    if (tab === 'constraint') {
      if (projectId) {
        api.constraintScores.get(projectId)
          .then(data => setScores(data as ConstraintScore[]))
          .catch(() => {});
      } else {
        setScores(computeLocalScores(nodes));
      }
    } else if (tab === 'hypothesis') {
      if (projectId) {
        api.hypotheses.list(projectId)
          .then(data => setHypotheses(data as Hypothesis[]))
          .catch(() => {});
      } else {
        setHypotheses(loadLocal<Hypothesis>(HYPS_KEY));
      }
    } else {
      if (projectId) {
        api.mechanisms.list(projectId)
          .then(data => setMechanisms(data as Mechanism[]))
          .catch(() => {});
      } else {
        setMechanisms(loadLocal<Mechanism>(MECHS_KEY));
      }
    }
  }, [projectId, tab, nodes]);

  useEffect(() => { load(); }, [load]);

  // ── Hypothesis CRUD ────────────────────────────────────────────────────────
  const saveHypothesis = async () => {
    if (!editingHyp?.title) return;

    if (projectId) {
      if (editingHyp.id) {
        await api.hypotheses.update(editingHyp.id, editingHyp);
      } else {
        await api.hypotheses.create(projectId, editingHyp);
      }
    } else {
      const items = loadLocal<Hypothesis>(HYPS_KEY);
      if (editingHyp.id) {
        const idx = items.findIndex(h => h.id === editingHyp.id);
        if (idx >= 0) items[idx] = { ...items[idx], ...editingHyp } as Hypothesis;
      } else {
        items.push({
          ...editingHyp,
          id: Date.now(),
          project_id: 0,
          suspected_constraint: editingHyp.suspected_constraint ?? '',
          expected_effect: editingHyp.expected_effect ?? '',
          validation_metrics: editingHyp.validation_metrics ?? '',
          observation_window: editingHyp.observation_window ?? '14 天',
          status: editingHyp.status ?? 'draft',
          created_at: new Date().toISOString(),
        } as Hypothesis);
      }
      saveLocal(HYPS_KEY, items);
    }

    setEditingHyp(null);
    load();
  };

  const deleteHypothesis = async (id: number) => {
    if (projectId) {
      await api.hypotheses.delete(id);
    } else {
      const items = loadLocal<Hypothesis>(HYPS_KEY).filter(h => h.id !== id);
      saveLocal(HYPS_KEY, items);
    }
    load();
  };

  // ── Mechanism CRUD ─────────────────────────────────────────────────────────
  const saveMechanism = async () => {
    if (!editingMech?.title) return;

    if (projectId) {
      if (editingMech.id) {
        await api.mechanisms.update(editingMech.id, editingMech);
      } else {
        await api.mechanisms.create(projectId, editingMech);
      }
    } else {
      const items = loadLocal<Mechanism>(MECHS_KEY);
      if (editingMech.id) {
        const idx = items.findIndex(m => m.id === editingMech.id);
        if (idx >= 0) items[idx] = { ...items[idx], ...editingMech } as Mechanism;
      } else {
        items.push({
          ...editingMech,
          id: Date.now(),
          project_id: 0,
          linked_toc_node_id: null,
          trigger: editingMech.trigger ?? '',
          actor: editingMech.actor ?? '',
          frequency: editingMech.frequency ?? '',
          health_status: editingMech.health_status ?? 'normal',
          created_at: new Date().toISOString(),
        } as Mechanism);
      }
      saveLocal(MECHS_KEY, items);
    }

    setEditingMech(null);
    load();
  };

  const deleteMechanism = async (id: number) => {
    if (projectId) {
      await api.mechanisms.delete(id);
    } else {
      const items = loadLocal<Mechanism>(MECHS_KEY).filter(m => m.id !== id);
      saveLocal(MECHS_KEY, items);
    }
    load();
  };

  const SCORE_LABELS: Record<string, string> = {
    load_ratio: '負荷率',
    backlog: '待處理積壓',
    escalation: '異常升報率',
    quality_gap: '品質落差',
    dependency_risk: '相依制約風險',
  };

  return (
    <div className="p2-panel">
      <div className="p2-header">
        <div>
          <div className="p2-title">制約深度分析</div>
          <div className="p2-subtitle">制約評估 · 改善假說 · 管控機制</div>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="p2-tabs">
        {(['constraint', 'hypothesis', 'mechanism'] as Phase2Tab[]).map((t) => (
          <button
            key={t}
            className={`p2-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'constraint' ? '制約評估' : t === 'hypothesis' ? '改善假說' : '管控機制'}
          </button>
        ))}
      </div>

      <div className="p2-body">
        {/* ── Constraint Score Tab ─────────────────────────────────────────── */}
        {tab === 'constraint' && (
          <div className="p2-scores">
            {scores.length === 0 && <div className="p2-empty">尚無製程站資料</div>}
            {!projectId && scores.length > 0 && (
              <div className="p2-local-hint">本機模式：依據畫布節點資料即時計算</div>
            )}
            {scores.map((s) => (
              <div key={s.node_id} className="score-card">
                <div className="score-header">
                  <span className="score-label">{s.label}</span>
                  <span className="score-total">{s.total.toFixed(1)}</span>
                </div>
                <div className="score-bars">
                  {Object.entries(s.scores).map(([key, val]) => (
                    <div key={key} className="score-bar-row">
                      <span className="bar-label">{SCORE_LABELS[key] || key}</span>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${Math.min(val / 2, 1) * 100}%`,
                            background: val > 1.2 ? '#ff6b6b' : val > 0.6 ? '#c8b472' : '#88d8b0',
                          }}
                        />
                      </div>
                      <span className="bar-value">{val.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Hypothesis Tab ──────────────────────────────────────────────── */}
        {tab === 'hypothesis' && (
          <div className="p2-list">
            <button className="p2-add-btn" onClick={() => setEditingHyp({ title: '', status: 'draft' })}>
              + 新增改善假說
            </button>
            {hypotheses.map((h) => (
              <div key={h.id} className="p2-card">
                <div className="p2-card-header">
                  <span className="p2-card-title">{h.title}</span>
                  <span className="p2-status-badge" style={{ color: STATUS_COLORS[h.status], borderColor: STATUS_COLORS[h.status] }}>
                    {h.status}
                  </span>
                </div>
                {h.suspected_constraint && (
                  <div className="p2-card-field">
                    <span className="p2-field-label">疑似制約因素</span>
                    <span>{h.suspected_constraint}</span>
                  </div>
                )}
                {h.expected_effect && (
                  <div className="p2-card-field">
                    <span className="p2-field-label">預期效果</span>
                    <span>{h.expected_effect}</span>
                  </div>
                )}
                <div className="p2-card-field">
                  <span className="p2-field-label">觀察窗口</span>
                  <span>{h.observation_window}</span>
                </div>
                <div className="p2-card-actions">
                  <button onClick={() => setEditingHyp(h)}>編輯</button>
                  <button className="danger" onClick={() => deleteHypothesis(h.id)}>刪除</button>
                </div>
              </div>
            ))}
            {hypotheses.length === 0 && <div className="p2-empty">尚未建立改善假說</div>}
          </div>
        )}

        {/* ── Mechanism Tab ───────────────────────────────────────────────── */}
        {tab === 'mechanism' && (
          <div className="p2-list">
            <button className="p2-add-btn" onClick={() => setEditingMech({ title: '', health_status: 'normal' })}>
              + 新增管控機制
            </button>
            {mechanisms.map((m) => (
              <div key={m.id} className="p2-card">
                <div className="p2-card-header">
                  <span className="p2-card-title">{m.title}</span>
                  <span className="p2-health-dot" style={{ background: HEALTH_COLORS[m.health_status] }} title={m.health_status} />
                </div>
                {m.trigger && (
                  <div className="p2-card-field">
                    <span className="p2-field-label">觸發條件</span>
                    <span>{m.trigger}</span>
                  </div>
                )}
                {m.actor && (
                  <div className="p2-card-field">
                    <span className="p2-field-label">執行者</span>
                    <span>{m.actor}</span>
                  </div>
                )}
                {m.frequency && (
                  <div className="p2-card-field">
                    <span className="p2-field-label">頻率</span>
                    <span>{m.frequency}</span>
                  </div>
                )}
                {m.owner && (
                  <div className="p2-card-field">
                    <span className="p2-field-label">負責人</span>
                    <span>{m.owner}</span>
                  </div>
                )}
                <div className="p2-card-actions">
                  <button onClick={() => setEditingMech(m)}>編輯</button>
                  <button className="danger" onClick={() => deleteMechanism(m.id)}>刪除</button>
                </div>
              </div>
            ))}
            {mechanisms.length === 0 && <div className="p2-empty">尚未建立管控機制</div>}
          </div>
        )}
      </div>

      {/* ── Hypothesis Edit Modal ──────────────────────────────────────────── */}
      {editingHyp && (
        <div className="modal-overlay" onClick={() => setEditingHyp(null)}>
          <div className="modal-box p2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>{editingHyp.id ? '編輯' : '新增'}改善假說</span>
              <button className="close-btn" onClick={() => setEditingHyp(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>標題</label>
                <input value={editingHyp.title ?? ''} onChange={(e) => setEditingHyp({ ...editingHyp, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label>疑似制約因素</label>
                <input value={editingHyp.suspected_constraint ?? ''} onChange={(e) => setEditingHyp({ ...editingHyp, suspected_constraint: e.target.value })} />
              </div>
              <div className="form-group">
                <label>預期效果</label>
                <input value={editingHyp.expected_effect ?? ''} onChange={(e) => setEditingHyp({ ...editingHyp, expected_effect: e.target.value })} />
              </div>
              <div className="form-group">
                <label>觀察窗口</label>
                <input value={editingHyp.observation_window ?? '14 天'} onChange={(e) => setEditingHyp({ ...editingHyp, observation_window: e.target.value })} />
              </div>
              <div className="form-group">
                <label>狀態</label>
                <select
                  className="p2-select"
                  value={editingHyp.status ?? 'draft'}
                  onChange={(e) => setEditingHyp({ ...editingHyp, status: e.target.value as Hypothesis['status'] })}
                >
                  <option value="draft">草擬中</option>
                  <option value="running">驗證進行中</option>
                  <option value="validated">已確認有效</option>
                  <option value="invalidated">已推翻否定</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setEditingHyp(null)}>取消</button>
              <button className="modal-btn save" onClick={saveHypothesis}>儲存</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mechanism Edit Modal ───────────────────────────────────────────── */}
      {editingMech && (
        <div className="modal-overlay" onClick={() => setEditingMech(null)}>
          <div className="modal-box p2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>{editingMech.id ? '編輯' : '新增'}管控機制</span>
              <button className="close-btn" onClick={() => setEditingMech(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>標題</label>
                <input value={editingMech.title ?? ''} onChange={(e) => setEditingMech({ ...editingMech, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label>觸發條件</label>
                <input value={editingMech.trigger ?? ''} onChange={(e) => setEditingMech({ ...editingMech, trigger: e.target.value })} />
              </div>
              <div className="form-group">
                <label>執行者</label>
                <input value={editingMech.actor ?? ''} onChange={(e) => setEditingMech({ ...editingMech, actor: e.target.value })} />
              </div>
              <div className="form-group">
                <label>頻率</label>
                <input value={editingMech.frequency ?? ''} onChange={(e) => setEditingMech({ ...editingMech, frequency: e.target.value })} />
              </div>
              <div className="form-group">
                <label>負責人</label>
                <input value={editingMech.owner ?? ''} onChange={(e) => setEditingMech({ ...editingMech, owner: e.target.value })} />
              </div>
              <div className="form-group">
                <label>輸入規則</label>
                <input value={editingMech.input_rule ?? ''} onChange={(e) => setEditingMech({ ...editingMech, input_rule: e.target.value })} />
              </div>
              <div className="form-group">
                <label>輸出規則</label>
                <input value={editingMech.output_rule ?? ''} onChange={(e) => setEditingMech({ ...editingMech, output_rule: e.target.value })} />
              </div>
              <div className="form-group">
                <label>例外處理路徑</label>
                <input value={editingMech.exception_path ?? ''} onChange={(e) => setEditingMech({ ...editingMech, exception_path: e.target.value })} />
              </div>
              <div className="form-group">
                <label>升級規則</label>
                <input value={editingMech.escalation_rule ?? ''} onChange={(e) => setEditingMech({ ...editingMech, escalation_rule: e.target.value })} />
              </div>
              <div className="form-group">
                <label>運作狀態</label>
                <select
                  className="p2-select"
                  value={editingMech.health_status ?? 'normal'}
                  onChange={(e) => setEditingMech({ ...editingMech, health_status: e.target.value as Mechanism['health_status'] })}
                >
                  <option value="normal">正常運作</option>
                  <option value="abnormal">異常警示</option>
                  <option value="stopped">已中止</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setEditingMech(null)}>取消</button>
              <button className="modal-btn save" onClick={saveMechanism}>儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
