# VSM-TOC 融合擴充 — 實作 Spec

## 現有架構保留
- Frontend: React + TypeScript + React Flow
- Backend: FastAPI + SQLite
- 現有資料表：projects, vsm_nodes, vsm_edges, toc_analyses, toc_nodes, toc_edges

---

## 1. SQLite Schema（4 個新資料表）

```sql
-- 1. NodeMetric：節點指標（雙值化）
CREATE TABLE node_metrics (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id     INTEGER NOT NULL REFERENCES vsm_nodes(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  current_value REAL,
  target_value  REAL,
  unit          TEXT,
  source_type   TEXT CHECK(source_type IN ('measured','estimated','assumed')) DEFAULT 'estimated',
  owner         TEXT,
  review_cycle  TEXT CHECK(review_cycle IN ('daily','weekly','monthly')),
  notes         TEXT,
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- 2. Hypothesis：改善假設卡
CREATE TABLE hypotheses (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id            INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  toc_analysis_id       INTEGER REFERENCES toc_analyses(id) ON DELETE SET NULL,
  title                 TEXT NOT NULL,
  suspected_constraint  TEXT,
  expected_effect       TEXT,
  validation_metrics    TEXT,  -- JSON array
  observation_window    TEXT,
  status                TEXT CHECK(status IN ('draft','running','validated','invalidated')) DEFAULT 'draft',
  created_at            TEXT DEFAULT (datetime('now')),
  updated_at            TEXT DEFAULT (datetime('now'))
);

-- 3. Mechanism：機制卡
CREATE TABLE mechanisms (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  toc_node_id      INTEGER NOT NULL REFERENCES toc_nodes(id) ON DELETE CASCADE,
  trigger          TEXT,
  actor            TEXT,
  frequency        TEXT,
  exception_path   TEXT,
  escalation_rule  TEXT,
  owner            TEXT,
  backup_role      TEXT,
  sop_link         TEXT,
  health_status    TEXT CHECK(health_status IN ('normal','abnormal','stopped')) DEFAULT 'normal',
  updated_at       TEXT DEFAULT (datetime('now'))
);

-- 4. ConstraintScore：瓶頸評分
CREATE TABLE constraint_scores (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id                 INTEGER NOT NULL REFERENCES vsm_nodes(id) ON DELETE CASCADE,
  load_capacity_ratio     REAL,
  backlog_aging_score     REAL,
  rework_score            REAL,
  downstream_block_score  REAL,
  dependency_risk_score   REAL,
  total_score             REAL,  -- backend 自動加總
  calculated_at           TEXT DEFAULT (datetime('now'))
);
```

---

## 2. FastAPI Endpoints

### NodeMetric
| Method | Path | 說明 |
|--------|------|------|
| GET    | /nodes/{node_id}/metrics | 取得節點所有指標 |
| POST   | /nodes/{node_id}/metrics | 新增指標 |
| PUT    | /metrics/{metric_id} | 更新指標 |
| DELETE | /metrics/{metric_id} | 刪除指標 |

### Hypothesis
| Method | Path | 說明 |
|--------|------|------|
| GET    | /projects/{project_id}/hypotheses | 取得專案所有假設卡 |
| POST   | /projects/{project_id}/hypotheses | 新增假設卡 |
| PUT    | /hypotheses/{id} | 更新假設卡（含 status） |
| DELETE | /hypotheses/{id} | 刪除假設卡 |

### Mechanism
| Method | Path | 說明 |
|--------|------|------|
| GET    | /toc-nodes/{toc_node_id}/mechanism | 取得機制卡（1對1） |
| POST   | /toc-nodes/{toc_node_id}/mechanism | 新增機制卡 |
| PUT    | /mechanisms/{id} | 更新機制卡（含 health_status）|
| DELETE | /mechanisms/{id} | 刪除機制卡 |

### ConstraintScore
| Method | Path | 說明 |
|--------|------|------|
| GET    | /nodes/{node_id}/constraint-score | 取得節點評分 |
| POST   | /nodes/{node_id}/constraint-score | 新增/覆寫評分 |
| GET    | /projects/{project_id}/constraint-scores | 取得整個專案排名 |

---

## 3. Frontend 擴充點

### VSMCanvas / ProcessNode
- 節點右下角加小 badge 顯示：現況值 / 目標值
- 點開節點 detail panel → 下方加 "Metrics" tab
  - 列出所有 NodeMetric
  - 支援新增 / 編輯
  - source_type 用顏色區別（綠=measured, 黃=estimated, 紅=assumed）

### TOC Panel（側邊）
- FRT injection 節點，底部加 "機制卡" 按鈕
  - 展開填寫 trigger / actor / frequency / exception_path / owner
  - health_status 用 icon 顯示（✅/⚠️/🔴）
- TOC Panel 頂部加 "假設卡" 區塊
  - 連結到當前 analysis 的 hypotheses
  - 支援新增 / 切換 status

### 新增頁面：改善前後比較（Before/After）
- 針對某個 hypothesis，比較 validation_metrics 的 before/after
- 顯示：吞吐 / backlog / 制約是否移動
- 只顯示 status=validated 或 running 的 hypothesis

### 瓶頸熱點（ConstraintScore）
- VSM 節點顏色依 total_score 著色（越深越危險）
- hover 顯示各分項分數

---

## 4. 實作順序

### P0（MVP 第一刀，直接擴充現有架構）

1. **NodeMetric 資料表 + API**（後端 1-2 天）
2. **ProcessNode UI 新增 Metrics tab**（前端 1-2 天）
3. **Hypothesis 資料表 + API**（後端 1 天）
4. **TOC Panel 掛假設卡 UI**（前端 1 天）
5. **Mechanism 資料表 + API**（後端 1 天）
6. **FRT injection 掛機制卡 UI**（前端 1 天）

> P0 完成後，VSM-TOC 已能支援「看數字、提假設、設機制」這條核心流程。

### P1（第二刀）

7. Before/After 比較頁
8. ConstraintScore 計算引擎 + 熱點圖
9. 依賴度熱點（dependency_risk 著色）
10. 指標治理：review_cycle 到期提醒

---

## 注意事項

- SQLite 先用，不需改 PostgreSQL（資料量不大）
- Mechanism 與 toc_node 是 1對1，後端應確保唯一性
- ConstraintScore.total_score 由後端自動加總，前端不計算
- source_type='assumed' 的 metric 在 UI 要明顯標示「未實測」
