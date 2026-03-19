import { useState, useEffect, useCallback } from 'react';
import type { VSMNodeData, ECAnalysis, TOCTab } from '../../types';
import { api } from '../../api/client';
import { CRTPanel } from './CRTPanel';
import { FRTPanel } from './FRTPanel';
import './TOCPanel.css';

interface TOCPanelProps {
  node: { id: string; data: VSMNodeData } | null;
  apiNodeId: number | null;
  onClose: () => void;
}

const EMPTY_EC: Omit<ECAnalysis, 'id' | 'vsmNodeId'> = {
  goal: '',
  needA: '',
  prereqA: '',
  needB: '',
  prereqB: '',
  assumptionAB: '',
  assumptionAPrereqA: '',
  assumptionBPrereqB: '',
  brokenAssumption: '',
};

export function TOCPanel({ node, apiNodeId, onClose }: TOCPanelProps) {
  const [activeTab, setActiveTab] = useState<TOCTab>('ec');
  const [ec, setEc] = useState<Omit<ECAnalysis, 'id' | 'vsmNodeId'>>(EMPTY_EC);
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [crtAnalysisId, setCrtAnalysisId] = useState<number | null>(null);
  const [frtAnalysisId, setFrtAnalysisId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!apiNodeId) return;
    (api.toc.list(apiNodeId) as Promise<(ECAnalysis & { type: string; id: number })[]>).then((list) => {
      // Load EC analysis
      const ecAnalysis = list.find((a) => a.type === 'EC');
      if (ecAnalysis) {
        setAnalysisId(ecAnalysis.id ?? null);
        setEc({
          goal: ecAnalysis.goal,
          needA: ecAnalysis.needA,
          prereqA: ecAnalysis.prereqA,
          needB: ecAnalysis.needB,
          prereqB: ecAnalysis.prereqB,
          assumptionAB: ecAnalysis.assumptionAB ?? '',
          assumptionAPrereqA: ecAnalysis.assumptionAPrereqA ?? '',
          assumptionBPrereqB: ecAnalysis.assumptionBPrereqB ?? '',
          brokenAssumption: ecAnalysis.brokenAssumption ?? '',
        });
      } else {
        setEc(EMPTY_EC);
        setAnalysisId(null);
      }
      // Load CRT analysis ID
      const crtAnalysis = list.find((a) => a.type === 'CRT');
      setCrtAnalysisId(crtAnalysis?.id ?? null);
      // Load FRT analysis ID
      const frtAnalysis = list.find((a) => a.type === 'FRT');
      setFrtAnalysisId(frtAnalysis?.id ?? null);
    }).catch(() => {});
  }, [apiNodeId]);

  if (!node) return null;

  const handleChange = (field: keyof typeof ec, value: string) => {
    setEc((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!apiNodeId) return;
    setSaving(true);
    try {
      const payload = { ...ec, vsm_node_id: apiNodeId, type: 'EC' };
      if (analysisId) {
        await api.toc.update(analysisId, payload);
      } else {
        const result = await api.toc.create(payload) as ECAnalysis;
        setAnalysisId(result.id ?? null);
      }
      setSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCrtCreated = useCallback((id: number) => setCrtAnalysisId(id), []);
  const handleFrtCreated = useCallback((id: number) => setFrtAnalysisId(id), []);

  const tabs: { key: TOCTab; label: string }[] = [
    { key: 'ec', label: '蒸發雲（EC）' },
    { key: 'crt', label: '現況樹（CRT）' },
    { key: 'frt', label: '未來樹（FRT）' },
  ];

  return (
    <div className={`toc-panel ${activeTab !== 'ec' ? 'toc-panel-wide' : ''}`}>
      <div className="toc-panel-header">
        <div>
          <div className="toc-panel-title">TOC 分析</div>
          <div className="toc-panel-subtitle">{node.data.label}</div>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="toc-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'ec' && (
        <div className="toc-panel-body">
          <div className="ec-diagram">
            <ECDiagram ec={ec} />
          </div>

          <div className="ec-form">
            <h4 className="form-section-title">蒸發雲結構要素</h4>

            <div className="form-group">
              <label>共同目標（Goal）</label>
              <input
                value={ec.goal}
                onChange={(e) => handleChange('goal', e.target.value)}
                placeholder="雙方共同追求的系統目標..."
              />
            </div>

            <div className="form-group">
              <label>需求 A（Need A）</label>
              <input
                value={ec.needA}
                onChange={(e) => handleChange('needA', e.target.value)}
                placeholder="達成目標的必要需求 A..."
              />
            </div>

            <div className="form-group assumption-group">
              <label className="assumption-label">
                <span className="assumption-tag">潛在假設</span>
                <input
                  value={ec.assumptionAPrereqA}
                  onChange={(e) => handleChange('assumptionAPrereqA', e.target.value)}
                  placeholder="行動 A 能滿足需求 A 的潛在假設..."
                  className="assumption-input"
                />
              </label>
            </div>

            <div className="form-group">
              <label>行動 A（Action A）</label>
              <input
                value={ec.prereqA}
                onChange={(e) => handleChange('prereqA', e.target.value)}
                placeholder="滿足需求 A 所採取的行動..."
              />
            </div>

            <div className="form-divider" />

            <div className="form-group">
              <label>需求 B（Need B）</label>
              <input
                value={ec.needB}
                onChange={(e) => handleChange('needB', e.target.value)}
                placeholder="達成目標的必要需求 B（與 A 存在衝突）..."
              />
            </div>

            <div className="form-group assumption-group">
              <label className="assumption-label">
                <span className="assumption-tag">潛在假設</span>
                <input
                  value={ec.assumptionBPrereqB}
                  onChange={(e) => handleChange('assumptionBPrereqB', e.target.value)}
                  placeholder="行動 B 能滿足需求 B 的潛在假設..."
                  className="assumption-input"
                />
              </label>
            </div>

            <div className="form-group">
              <label>行動 B（Action B）</label>
              <input
                value={ec.prereqB}
                onChange={(e) => handleChange('prereqB', e.target.value)}
                placeholder="滿足需求 B 所採取的行動（與行動 A 衝突）..."
              />
            </div>

            <div className="form-divider" />

            <div className="form-group">
              <label>衝突假設（A vs B）</label>
              <input
                value={ec.assumptionAB}
                onChange={(e) => handleChange('assumptionAB', e.target.value)}
                placeholder="使行動 A 與行動 B 無法並存的潛在假設..."
              />
            </div>

            <div className="form-group">
              <label>突破假設（解除衝突）</label>
              <textarea
                value={ec.brokenAssumption}
                onChange={(e) => handleChange('brokenAssumption', e.target.value)}
                placeholder="哪個潛在假設可被挑戰或推翻，從而消解衝突？"
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button
                className={`save-btn ${saved ? 'saved' : ''}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '儲存中...' : saved ? '已儲存' : '儲存分析'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'crt' && (
        <div className="toc-panel-body tree-body">
          <CRTPanel
            analysisId={crtAnalysisId}
            vsmNodeId={apiNodeId}
            onAnalysisCreated={handleCrtCreated}
          />
        </div>
      )}

      {activeTab === 'frt' && (
        <div className="toc-panel-body tree-body">
          <FRTPanel
            analysisId={frtAnalysisId}
            vsmNodeId={apiNodeId}
            onAnalysisCreated={handleFrtCreated}
          />
        </div>
      )}
    </div>
  );
}

function ECDiagram({ ec }: { ec: Omit<ECAnalysis, 'id' | 'vsmNodeId'> }) {
  return (
    <div className="ec-visual">
      <div className="ec-row ec-row-top">
        <div className="ec-box ec-need" title="需求 A">{ec.needA || '需求 A'}</div>
        <div className="ec-arrow">-&gt;</div>
        <div className="ec-box ec-prereq" title="行動 A">{ec.prereqA || '行動 A'}</div>
      </div>
      <div className="ec-center">
        <div className="ec-box ec-goal" title="共同目標">{ec.goal || '共同目標'}</div>
        <div className="ec-conflict-arrow">
          <span>CONFLICT</span>
        </div>
      </div>
      <div className="ec-row ec-row-bottom">
        <div className="ec-box ec-need" title="需求 B">{ec.needB || '需求 B'}</div>
        <div className="ec-arrow">-&gt;</div>
        <div className="ec-box ec-prereq" title="行動 B">{ec.prereqB || '行動 B'}</div>
      </div>
    </div>
  );
}
