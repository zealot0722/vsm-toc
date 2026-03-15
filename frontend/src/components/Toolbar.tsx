import type { NodeType } from '../types';
import './Toolbar.css';

const NODE_TYPES: { type: NodeType; label: string; icon: string; color: string }[] = [
  { type: 'supplier',  label: 'Supplier',  icon: '🏭', color: '#3d7a6b' },
  { type: 'process',   label: 'Process',   icon: '⚙️', color: '#2d4a7a' },
  { type: 'inventory', label: 'Inventory', icon: '▽',  color: '#7a5c2d' },
  { type: 'customer',  label: 'Customer',  icon: '👤', color: '#5a3d7a' },
  { type: 'infoflow',  label: 'Info Flow', icon: '📋', color: '#2d6a7a' },
];

interface ToolbarProps {
  onAddNode: (type: NodeType) => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onSaveProject: () => void;
  projectSaved: boolean;
}

export function Toolbar({ onAddNode, projectName, onProjectNameChange, onSaveProject, projectSaved }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-brand">
        <span className="brand-icon">◈</span>
        <span className="brand-name">VSM·TOC</span>
      </div>

      <div className="toolbar-section">
        <span className="section-label">Project</span>
        <input
          className="project-input"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder="Project name..."
        />
        <button
          className={`toolbar-btn save-btn ${projectSaved ? 'saved' : ''}`}
          onClick={onSaveProject}
          title="Save project"
        >
          {projectSaved ? '✓' : '⬆'} Save
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="section-label">Add Node</span>
        <div className="node-palette">
          {NODE_TYPES.map(({ type, label, icon, color }) => (
            <button
              key={type}
              className="palette-btn"
              style={{ '--node-color': color } as React.CSSProperties}
              onClick={() => onAddNode(type)}
              title={`Add ${label}`}
            >
              <span className="palette-icon">{icon}</span>
              <span className="palette-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="section-label">Hint</span>
        <div className="hint-text">
          <span className="hint-badge bottleneck">⚠</span> Auto-detected bottleneck (highest CT)
          <br />
          Click bottleneck node for TOC analysis
        </div>
      </div>
    </div>
  );
}
