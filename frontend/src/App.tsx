import { useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Toolbar } from './components/Toolbar';
import { VSMCanvas } from './components/VSMCanvas';
import type { NodeType } from './types';
import './App.css';

export default function App() {
  const [projectName, setProjectName] = useState('My VSM Project');
  const [projectSaved, setProjectSaved] = useState(false);

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

  return (
    <div className="app-layout">
      <Toolbar
        onAddNode={handleAddNode}
        projectName={projectName}
        onProjectNameChange={(n) => { setProjectName(n); setProjectSaved(false); }}
        onSaveProject={handleSaveProject}
        projectSaved={projectSaved}
      />
      <ReactFlowProvider>
        <VSMCanvas projectId={null} nodeIdMap={new Map()} />
      </ReactFlowProvider>
    </div>
  );
}
