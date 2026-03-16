# VSM-TOC ×《數值化之鬼》×《機制化》— PRD 擴充版

## 1. 產品重新定位

VSM-TOC 不再只是流程圖 + TOC 分析工具。

**新定位：**
> 一個把流程約束、運作機制、改善驗證串成閉環的改善操作系統。

### 核心閉環

```text
流動觀測（VSM）
→ 約束判定（TOC）
→ 機制設計（機制化）
→ 數值驗證（數值化）
→ 改善前後比較
→ 再迭代
```

## 2. 設計原則

### 原則 A：先用最小數值確認問題，再用機制化設計解法
- 問題識別階段：只需要少量可信數值
- 解法設計階段：強制描述機制，不接受空泛 action item
- 驗證階段：再導入完整數值化比較

### 原則 B：節點必須同時表達「現況」與「承諾」
每個節點不只記錄 current state，也必須有 target state。
沒有 target 的分析，視為未完成。

### 原則 C：改善案不是 task，而是 hypothesis
每個改善案都必須綁定：
- 想改善哪個制約
- 預期改變什麼
- 用什麼數值驗證
- 多久後判定成立/不成立

### 原則 D：FRT 的 injection 必須轉譯成 mechanism
未來現實樹中的解法節點，必須落成可持續運作的機制設計，不接受只有想法、沒有運作規則的解法。

## 3. 目標使用者
- 改善顧問
- 營運主管
- 流程改善 PM
- 正在推動 AI 導入 / 例外處理自動化的部門專員

## 4. 核心資料模型擴充

## 4.1 NodeMetric
每個節點的指標改為結構化物件，而不是單一欄位。

```ts
NodeMetric {
  id: string
  node_id: string
  metric_name: string
  current_value: number | null
  target_value: number | null
  unit: string
  source_type: 'measured' | 'estimated' | 'assumed'
  owner: string | null
  review_cycle: 'daily' | 'weekly' | 'monthly' | null
  notes: string | null
}
```

建議預設 metric：
- cycle time
- throughput
- backlog / WIP
- backlog aging
- rework rate
- escalation rate
- first-pass yield / first-contact resolution

## 4.2 Hypothesis
```ts
Hypothesis {
  id: string
  project_id: string
  title: string
  suspected_constraint: string
  expected_effect: string
  validation_metric: string[]
  observation_window: string
  status: 'draft' | 'running' | 'validated' | 'invalidated'
}
```

## 4.3 Mechanism
```ts
Mechanism {
  id: string
  linked_toc_node_id: string
  trigger: string
  actor: string
  frequency: string
  input_rule: string | null
  output_rule: string | null
  exception_path: string | null
  escalation_rule: string | null
  sop_link: string | null
  backup_role: string | null
  owner: string | null
  health_status: 'normal' | 'abnormal' | 'stopped'
}
```

## 4.4 ConstraintScore
```ts
ConstraintScore {
  node_id: string
  load_capacity_ratio: number | null
  backlog_aging_score: number | null
  rework_score: number | null
  downstream_block_score: number | null
  dependency_risk_score: number | null
  total_score: number | null
}
```

## 5. 功能需求優先序

## P0（MVP 必做）

### 5.1 節點雙值化（Current / Target / Gap）
每個節點指標都應能展示：
- 現況值
- 目標值
- 差距
- 數據來源

**價值：**
讓 VSM 從描述工具，升級為改善工具。

### 5.2 Hypothesis Card（改善假設卡）
每個改善案不是普通 task，而是可驗證命題。

欄位：
- 問題假設
- 指向的制約
- 預期影響
- 驗證指標
- 觀察期
- 狀態

### 5.3 Mechanism Card（機制卡）
每個 FRT injection 都要能展開成機制卡。

必填欄位：
- 觸發條件
- 執行者
- 頻率
- 例外處理
- 升級規則
- owner

### 5.4 改善前後對比（因果導向）
不做花俏報表，只回答：
- 約束位置是否移動
- 吞吐是否上升
- backlog 是否下降
- 是否把壓力轉移到下游
- 機制是否穩定運作

## P1（第二階段）

### 5.5 Constraint Score 引擎
瓶頸判定不只看 cycle time，而是綜合：
- 負荷/能力比
- backlog aging
- 返工率
- 下游阻塞影響
- 人員依賴度

### 5.6 依賴度熱點圖
節點增加人員依賴風險：
- 可替代人數
- SOP 完整度
- backup role
- 單點依賴顏色提示

### 5.7 指標治理
- 指標 owner
- review cycle
- 口徑版本紀錄
- 未更新提醒

## P2（錦上添花）
- AI 自動產生 CRT / FRT 初稿
- 儀表板視覺化強化
- 模擬器
- 多角色協作與權限細分

## 6. 主要風險

### 風險 1：數值化變成 KPI 神壇
若過早強化圖表與比較，使用者會優化局部效率，而不是整體流動。

**對策：**
所有比較頁優先顯示全局吞吐、約束移動、backlog 變化，不鼓勵單一局部 KPI 排行。

### 風險 2：機制化淪為 SOP 附件區
如果 mechanism 只是貼文字，沒有觸發、執行者、例外路徑與健康狀態，等於沒有融合。

**對策：**
機制卡必須成為結構化物件，並具備 health_status。

### 風險 3：資料填寫負擔過高
一開始要求填太多欄位，使用者會放棄。

**對策：**
採分層填寫：
- 先填核心節點與最小數值
- 進入改善案時才補 hypothesis / mechanism
- 驗證階段才補完整 before / after

## 7. 成功指標
- 使用者能在 30 分鐘內完成一張最小可用 VSM + 一個 hypothesis
- 至少一個 FRT injection 能轉為 mechanism card
- 使用者能在一次改善後，完成 before/after 對比
- 改善案有明確 validated / invalidated 結果，而非永遠 open

## 8. 一句話總結
VSM-TOC 的未來，不是做得更像畫圖工具，而是做成一個能讓「改善」被制度化、可驗證、可複製的操作系統。
