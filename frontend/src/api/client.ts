const BASE = 'http://localhost:8000';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// Projects
export const api = {
  projects: {
    list: () => req<{ id: number; name: string; created_at: string; updated_at: string }[]>('/projects'),
    create: (name: string) => req('/projects', { method: 'POST', body: JSON.stringify({ name }) }),
    get: (id: number) => req(`/projects/${id}`),
    delete: (id: number) => req(`/projects/${id}`, { method: 'DELETE' }),
  },
  vsm: {
    nodes: {
      list: (projectId: number) => req(`/projects/${projectId}/nodes`),
      create: (projectId: number, data: object) =>
        req(`/projects/${projectId}/nodes`, { method: 'POST', body: JSON.stringify(data) }),
      update: (projectId: number, nodeId: number, data: object) =>
        req(`/projects/${projectId}/nodes/${nodeId}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (projectId: number, nodeId: number) =>
        req(`/projects/${projectId}/nodes/${nodeId}`, { method: 'DELETE' }),
    },
    edges: {
      list: (projectId: number) => req(`/projects/${projectId}/edges`),
      create: (projectId: number, data: object) =>
        req(`/projects/${projectId}/edges`, { method: 'POST', body: JSON.stringify(data) }),
      delete: (projectId: number, edgeId: number) =>
        req(`/projects/${projectId}/edges/${edgeId}`, { method: 'DELETE' }),
    },
  },
  toc: {
    list: (nodeId: number) => req(`/toc/node/${nodeId}`),
    create: (data: object) => req('/toc', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: object) => req(`/toc/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req(`/toc/${id}`, { method: 'DELETE' }),
    nodes: {
      list: (analysisId: number) => req(`/toc/${analysisId}/nodes`),
      create: (analysisId: number, data: object) =>
        req(`/toc/${analysisId}/nodes`, { method: 'POST', body: JSON.stringify(data) }),
      update: (nodeId: number, data: object) =>
        req(`/toc/nodes/${nodeId}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (nodeId: number) =>
        req(`/toc/nodes/${nodeId}`, { method: 'DELETE' }),
    },
    edges: {
      list: (analysisId: number) => req(`/toc/${analysisId}/edges`),
      create: (analysisId: number, data: object) =>
        req(`/toc/${analysisId}/edges`, { method: 'POST', body: JSON.stringify(data) }),
      update: (edgeId: number, data: object) =>
        req(`/toc/edges/${edgeId}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (edgeId: number) =>
        req(`/toc/edges/${edgeId}`, { method: 'DELETE' }),
    },
  },
};
