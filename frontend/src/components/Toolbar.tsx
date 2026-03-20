import type { NodeType } from '../types';
import './Toolbar.css';

const NODE_TYPES: { type: NodeType; label: string; icon: string; color: string }[] = [
  { type: 'supplier',  label: '供應商',    icon: '🏭', color: '#3d7a6b' },
  { type: 'process',   label: '製程站',    icon: '⚙️', color: '#2d4a7a' },
  { type: 'inventory', label: '在製品庫存', icon: '▽',  color: '#7a5c2d' },
  { type: 'customer',  label: '客戶',      icon: '👤', color: '#5a3d7a' },
  { type: 'infoflow',  label: '資訊流',    icon: '📋', color: '#2d6a7a' },
];

interface ToolbarProps {
  onAddNode: (type: NodeType) => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onSaveProject: () => void;
  projectSaved: boolean;
  onAIAnalyze: () => void;
  onOpenSettings: () => void;
}

export function Toolbar({ onAddNode, projectName, onProjectNameChange, onSaveProject, projectSaved, onAIAnalyze, onOpenSettings }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-brand">
        <span className="brand-icon">◈</span>
        <span className="brand-name">VSM·TOC</span>
      </div>

      <div className="toolbar-section">
        <span className="section-label">專案</span>
        <input
          className="project-input"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder="專案名稱..."
        />
        <button
          className={`toolbar-btn save-btn ${projectSaved ? 'saved' : ''}`}
          onClick={onSaveProject}
          title="儲存專案"
        >
          {projectSaved ? '✓' : '⬆'} 儲存
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="section-label">節點類型</span>
        <div className="node-palette">
          {NODE_TYPES.map(({ type, label, icon, color }) => (
            <button
              key={type}
              className="palette-btn"
              style={{ '--node-color': color } as React.CSSProperties}
              onClick={() => onAddNode(type)}
              title={`新增 ${label}`}
            >
              <span className="palette-icon">{icon}</span>
              <span className="palette-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="section-label">分析工具</span>
        <button
          className="toolbar-btn ai-btn"
          onClick={onAIAnalyze}
          title="使用 AI 分析 VSM 流程"
        >
          🤖 AI 分析
        </button>
        <button
          className="toolbar-btn settings-btn"
          onClick={onOpenSettings}
          title="API 設定"
        >
          ⚙ 設定
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="section-label">操作提示</span>
        <div className="hint-text">
          <span className="hint-badge bottleneck">⚠</span> 自動偵測制約站（最高 C/T）
          <br />
          點擊制約站節點進行 TOC 分析
          <br />
          左鍵拖曳空白處可框選多個節點
          <br />
          中鍵／右鍵拖曳可平移畫布
          <br />
          右鍵點擊連線可刪除連線
        </div>
      </div>
    </div>
  );
}
