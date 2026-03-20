import { useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Toolbar } from './components/Toolbar';
import { VSMCanvas } from './components/VSMCanvas';
import type { NodeType, APIConfig } from './types';
import './App.css';

// ── AI System Prompt ──────────────────────────────────────────────────────────
const AI_SYSTEM_PROMPT = '你是 VSM 與 TOC 流程改善顧問。以下是一個製造/服務流程的 VSM 圖分析。請找出：1) 主要制約瓶頸及原因 2) 三個立即可行的改善建議 3) TOC 五步驟應用建議。用繁體中文回答。';

// ── AI API Caller ─────────────────────────────────────────────────────────────
async function callAI(config: APIConfig, markdown: string): Promise<string> {
  if (config.provider === 'openai') {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o',
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: markdown },
        ],
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`OpenAI API 錯誤：${resp.status} ${errText}`);
    }
    const data = await resp.json();
    return data.choices[0].message.content;
  }

  if (config.provider === 'claude') {
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.model || 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: AI_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: markdown }],
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`Claude API 錯誤：${resp.status} ${errText}`);
      }
      const data = await resp.json();
      return data.content[0].text;
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error('提示：Claude API 需透過後端代理（CORS 限制），請改用 OpenAI 或自訂 endpoint');
      }
      throw err;
    }
  }

  // Custom endpoint
  const endpoint = config.endpoint;
  if (!endpoint) throw new Error('請填入自訂 API endpoint');
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o',
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: markdown },
      ],
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`API 錯誤：${resp.status} ${errText}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || data.content?.[0]?.text || JSON.stringify(data);
}

// ── App Component ─────────────────────────────────────────────────────────────

export default function App() {
  const [projectName, setProjectName] = useState('我的 VSM 專案');
  const [projectSaved, setProjectSaved] = useState(false);

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [apiConfig, setApiConfig] = useState<APIConfig>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('vsm_api_config') || '{}');
      return { provider: 'openai', apiKey: '', ...stored };
    } catch { return { provider: 'openai' as const, apiKey: '' }; }
  });

  // Analysis modal
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const handleAddNode = useCallback((type: NodeType) => {
    const addFn = (window as unknown as Record<string, unknown>).__vsmAddNode;
    if (typeof addFn === 'function') {
      (addFn as (t: NodeType) => void)(type);
    }
  }, []);

  const handleSaveProject = useCallback(() => {
    setProjectSaved(true);
    setTimeout(() => setProjectSaved(false), 2000);
  }, []);

  const handleSaveSettings = useCallback((config: APIConfig) => {
    setApiConfig(config);
    localStorage.setItem('vsm_api_config', JSON.stringify(config));
    setShowSettings(false);
  }, []);

  const handleAIAnalyze = useCallback(async () => {
    if (!apiConfig.apiKey) {
      setAnalysisError('請先在設定中填入 API Key');
      setAnalysisResult('');
      setShowAnalysis(true);
      return;
    }

    const exportFn = (window as unknown as Record<string, unknown>).__vsmExportMarkdown;
    if (typeof exportFn !== 'function') {
      setAnalysisError('無法取得畫布資料');
      setAnalysisResult('');
      setShowAnalysis(true);
      return;
    }

    const markdown = (exportFn as () => string)();
    setAnalysisLoading(true);
    setAnalysisError('');
    setAnalysisResult('');
    setShowAnalysis(true);

    try {
      const result = await callAI(apiConfig, markdown);
      setAnalysisResult(result);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalysisLoading(false);
    }
  }, [apiConfig]);

  return (
    <div className="app-layout">
      <Toolbar
        onAddNode={handleAddNode}
        projectName={projectName}
        onProjectNameChange={(n) => { setProjectName(n); setProjectSaved(false); }}
        onSaveProject={handleSaveProject}
        projectSaved={projectSaved}
        onAIAnalyze={handleAIAnalyze}
        onOpenSettings={() => setShowSettings(true)}
      />
      <ReactFlowProvider>
        <VSMCanvas projectId={null} nodeIdMap={new Map()} />
      </ReactFlowProvider>

      {/* ── Settings Modal ──────────────────────────────────────────────── */}
      {showSettings && (
        <SettingsModal
          config={apiConfig}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* ── Analysis Result Modal ───────────────────────────────────────── */}
      {showAnalysis && (
        <AnalysisModal
          loading={analysisLoading}
          result={analysisResult}
          error={analysisError}
          onClose={() => { setShowAnalysis(false); setAnalysisError(''); }}
        />
      )}
    </div>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────────

function SettingsModal({ config, onSave, onClose }: {
  config: APIConfig;
  onSave: (c: APIConfig) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState<APIConfig['provider']>(config.provider || 'openai');
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [endpoint, setEndpoint] = useState(config.endpoint || '');
  const [model, setModel] = useState(config.model || '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>⚙ AI 設定</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>API 提供者</label>
            <select
              className="settings-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value as APIConfig['provider'])}
            >
              <option value="openai">OpenAI</option>
              <option value="claude">Claude (Anthropic)</option>
              <option value="custom">自訂 API</option>
            </select>
          </div>
          <div className="form-group">
            <label>API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="輸入 API Key..."
            />
          </div>
          {provider === 'custom' && (
            <div className="form-group">
              <label>API Endpoint</label>
              <input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://your-api.com/v1/chat/completions"
              />
            </div>
          )}
          <div className="form-group">
            <label>模型名稱（選填）</label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider === 'openai' ? 'gpt-4o' : provider === 'claude' ? 'claude-sonnet-4-6' : '模型名稱'}
            />
          </div>
          {provider === 'claude' && (
            <div className="settings-hint">
              ⚠ Claude API 在瀏覽器中可能受 CORS 限制，建議使用 OpenAI 或自訂 endpoint
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onClose}>取消</button>
          <button
            className="modal-btn save"
            onClick={() => onSave({ provider, apiKey, endpoint, model })}
          >
            儲存設定
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Analysis Result Modal ─────────────────────────────────────────────────────

function AnalysisModal({ loading, result, error, onClose }: {
  loading: boolean;
  result: string;
  error: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box analysis-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>🤖 AI 流程分析</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body analysis-body">
          {loading && <div className="analysis-loading">⏳ 正在分析中，請稍候...</div>}
          {error && <div className="analysis-error">{error}</div>}
          {result && <pre className="analysis-result">{result}</pre>}
          {!loading && !error && !result && <div className="analysis-empty">尚無分析結果</div>}
        </div>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  );
}
