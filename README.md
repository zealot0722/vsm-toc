# VSM·TOC — Value Stream Mapping + Theory of Constraints

An integrated decision tool for improvement consultants and operations managers.
Map value streams, detect constraints, and apply TOC logical analysis — all in one canvas.

---

## Features (Phase 1)

- **VSM Canvas** — Drag, connect, pan, and zoom a full value stream map
- **5 Node Types** — Supplier, Process, Inventory, Customer, Info Flow
- **Bottleneck Detection** — Auto-highlights the process with the highest Cycle Time
- **Evaporating Cloud** — Click the bottleneck node to open the TOC conflict analysis panel
- **Persistent Storage** — FastAPI + SQLite backend with full CRUD API

---

## Quick Start (Local Dev)

### Option A — Run directly

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
# API available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:5173
```

### Option B — Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Project Structure

```
vsm-toc/
├── frontend/                  # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── nodes/         # SupplierNode, ProcessNode, InventoryNode, CustomerNode, InfoFlowNode
│   │   │   ├── panels/        # TOCPanel (Evaporating Cloud)
│   │   │   ├── Toolbar.tsx    # Node palette + project controls
│   │   │   └── VSMCanvas.tsx  # Main React Flow canvas
│   │   ├── api/client.ts      # API client
│   │   └── types/index.ts     # TypeScript types
│   └── Dockerfile
│
├── backend/                   # FastAPI + SQLite
│   ├── main.py                # App entry point + CORS
│   ├── database.py            # SQLAlchemy engine + session
│   ├── models.py              # ORM models
│   ├── schemas.py             # Pydantic schemas
│   ├── routers/
│   │   ├── projects.py        # Projects + VSM nodes/edges CRUD
│   │   └── toc.py             # TOC analyses CRUD
│   └── Dockerfile
│
├── docker-compose.yml
└── DESIGN.md
```

---

## Data Model

```sql
projects       (id, name, created_at, updated_at)
vsm_nodes      (id, project_id, type, label, x, y, properties JSON)
vsm_edges      (id, project_id, source_id, target_id, type)
toc_analyses   (id, vsm_node_id, type, goal, need_a, prereq_a, need_b, prereq_b, ...)
toc_nodes      (id, analysis_id, type, label, x, y)
toc_edges      (id, analysis_id, source_id, target_id, assumption)
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List all projects |
| POST | `/projects` | Create project |
| GET | `/projects/{id}` | Get project |
| DELETE | `/projects/{id}` | Delete project |
| GET | `/projects/{id}/nodes` | List VSM nodes |
| POST | `/projects/{id}/nodes` | Create VSM node |
| PUT | `/projects/{id}/nodes/{nid}` | Update VSM node |
| DELETE | `/projects/{id}/nodes/{nid}` | Delete VSM node |
| GET | `/projects/{id}/edges` | List VSM edges |
| POST | `/projects/{id}/edges` | Create VSM edge |
| DELETE | `/projects/{id}/edges/{eid}` | Delete VSM edge |
| GET | `/toc/node/{vsm_node_id}` | List TOC analyses for node |
| POST | `/toc` | Create TOC analysis |
| GET | `/toc/{id}` | Get TOC analysis |
| PUT | `/toc/{id}` | Update TOC analysis |
| DELETE | `/toc/{id}` | Delete TOC analysis |

---

## Roadmap

- **Phase 2** — Current Reality Tree + Future Reality Tree, Lead Time calculations
- **Phase 3** — PostgreSQL, multi-user, project sharing, improvement simulation
