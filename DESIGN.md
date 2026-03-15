# VSM-TOC 整合工具 — 設計文件 v0.1

## 產品定位

給改善顧問與營運主管用的決策工具：
在價值流圖中找到制約點，展開 TOC 邏輯分析，設計改善方案。

---

## 技術棧（Local Prototype）

- **Frontend**: React + TypeScript
- **圖形引擎**: React Flow（節點拖拉、連線、縮放）
- **UI 風格**: NotebookLM 樹狀圖風格——深色/中性底、圓角節點、曲線連線、乾淨字體
- **Backend**: FastAPI（Python）+ SQLite（本地）
- **通訊**: REST API

---

## 架構分層

```
┌─────────────────────────────────────┐
│           Frontend (React)          │
│  ┌──────────┐  ┌──────────────────┐ │
│  │ VSM 畫布 │  │  TOC 面板        │ │
│  │ (主視圖) │  │  (側邊展開)      │ │
│  └──────────┘  └──────────────────┘ │
└─────────────────┬───────────────────┘
                  │ REST
┌─────────────────▼───────────────────┐
│         Backend (FastAPI)           │
│  Projects / Nodes / Links / TOC     │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           SQLite (local)            │
└─────────────────────────────────────┘
```

---

## MVP 功能範圍

### 模組一：VSM 畫布

**節點類型：**
| 類型 | 說明 |
|------|------|
| 供應商 | 起點，外部輸入 |
| 製程步驟 | 主要作業單元，可設 cycle time / 人力 / 庫存 |
| 庫存緩衝 | 製程間在製品 |
| 客戶 | 終點，需求端 |
| 資訊流 | 排程、訂單等資訊節點 |

**節點屬性（製程步驟）：**
- Cycle Time（秒/分）
- Uptime %
- 班次數
- 作業人員數
- WIP（在製品數量）
- 是否為瓶頸（手動標記 or 自動偵測）

**畫布操作：**
- 拖拉節點、連線
- 縮放、平移
- 自動計算 Lead Time、Value-Added Time

**瓶頸偵測邏輯：**
- Cycle Time 最長的製程步驟自動標記為瓶頸候選
- 使用者可手動覆蓋

---

### 模組二：TOC 邏輯工具（掛載在瓶頸節點）

點擊瓶頸節點 → 右側展開 TOC 面板，包含三個子工具：

#### 2-1 衝突圖（Evaporating Cloud）
```
       ┌──── 需求 A ────┐
目標 ──┤               ├── 衝突
       └──── 需求 B ────┘
```
- 五個欄位：目標 / 需求A / 前提A / 需求B / 前提B
- 每條連線可加「假設」標籤（挑戰前提用）
- 可標記哪個假設被打破（蒸發衝突）

#### 2-2 現況樹（Current Reality Tree）
- 有向因果圖（IF → THEN）
- 從症狀節點往下挖根因
- 節點類型：症狀 / 中間原因 / 核心制約
- 自動標記「核心制約」（多個症狀收斂的節點）

#### 2-3 未來樹（Future Reality Tree）
- 結構同現況樹
- 注射「解法」節點，驗證是否消除根因症狀
- 可標記「負面分支」（副作用）

---

### 模組三：專案管理

- 新建 / 儲存 / 載入專案
- 每個專案包含：一張 VSM + 多個 TOC 分析（對應不同瓶頸）
- SQLite 儲存所有狀態

---

## UI 設計原則（NotebookLM 風格）

- 底色：深灰 `#1a1a2e` 或中性 `#f5f5f0`（提供切換）
- 節點：圓角矩形，邊框輕薄，陰影柔和
- 連線：貝塞爾曲線，不是直角折線
- 字體：Inter 或 DM Sans，14px 正文
- 瓶頸節點：橘紅色邊框高亮 `#ff6b6b`
- TOC 面板：從右側滑入，不覆蓋主畫布

---

## 資料模型（SQLite）

```sql
projects (id, name, created_at, updated_at)

vsm_nodes (id, project_id, type, label, x, y, properties JSON)
vsm_edges (id, project_id, source_id, target_id, type)

toc_analyses (id, vsm_node_id, type [EC/CRT/FRT])
toc_nodes (id, analysis_id, type, label, x, y)
toc_edges (id, analysis_id, source_id, target_id, assumption TEXT)
```

---

## 開發順序

**Phase 1（MVP）**
1. React Flow 畫布基礎 + 節點類型
2. FastAPI + SQLite 儲存
3. 衝突圖（最常用的 TOC 工具）
4. 瓶頸自動偵測

**Phase 2**
5. 現況樹 + 未來樹
6. Lead Time / Value-Added Time 自動計算顯示

**Phase 3（雲端就緒）**
7. PostgreSQL 替換 SQLite
8. 多使用者 / 專案分享
9. 效益模擬（改善前後對比）

---

## 啟動方式（本地）

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload

# Frontend
cd frontend && npm install && npm run dev

# 瀏覽器開啟 http://localhost:5173
```
