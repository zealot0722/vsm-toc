# VSM-TOC 融合架構圖（一頁版）

## 一句話

> VSM 看流動，TOC 判制約，機制化設計運作規則，數值化驗證規則是否真的讓系統變好。

---

## 核心閉環

```text
[VSM 流動觀測]
  看見流程節點、等待、WIP、吞吐
          ↓
[TOC 約束判定]
  找出最值得動的瓶頸與衝突
          ↓
[機制化設計]
  把解法變成 trigger / actor / frequency / exception 的運作規則
          ↓
[數值化驗證]
  用 current / target / gap / before-after 驗證改善是否成立
          ↓
[治理與迭代]
  檢查機制是否持續運作、約束是否移動，再進下一輪
```

---

## 四層架構

## 1. 觀測層（VSM）
用途：把流動結構與節點狀態可視化

核心物件：
- Node
- Edge
- NodeMetric(current / target / gap)

核心問題：
- 哪裡在等？
- 哪裡有 backlog / WIP？
- 哪個節點最可能是制約？

---

## 2. 判斷層（TOC）
用途：把「看起來很忙」和「真正的全局制約」分開

核心物件：
- ConstraintScore
- Evaporating Cloud
- Current Reality Tree
- Future Reality Tree
- Hypothesis

核心問題：
- 真正卡住全局的是哪裡？
- 現象背後的根因是什麼？
- 哪個解法值得優先做？

---

## 3. 設計層（機制化）
用途：把解法從想法變成可持續運作的機制

核心物件：
- Mechanism Card
  - trigger
  - actor
  - frequency
  - exception_path
  - escalation_rule
  - owner
  - backup_role
  - health_status

核心問題：
- 這個解法誰做？
- 何時觸發？
- 例外怎麼處理？
- 沒有英雄人物時還能不能跑？

---

## 4. 驗證與治理層（數值化）
用途：驗證改善是否成立，並確保不是短期幻覺

核心物件：
- Before / After Snapshot
- Metric Source Type
- Review Cycle
- Owner
- Validation Status

核心問題：
- 改善後吞吐有沒有上升？
- 約束位置有沒有移動？
- 是真的改善，還是只是把壓力轉到下游？
- 機制是否仍在穩定運作？

---

## 最小必要功能

### MVP 第一刀
1. NodeMetric：current / target / gap
2. Hypothesis Card
3. Mechanism Card
4. Before / After 比較

### 第二刀
5. Constraint Score
6. 依賴度熱點圖
7. 指標治理與提醒

---

## 產品邊界

### 不該變成的東西
- 只是流程圖工具
- 只是 KPI dashboard
- 只是 SOP 知識庫
- 只是一般任務看板

### 應該變成的東西
- 改善診斷 + 機制設計 + 數值驗證的一體化系統

---

## 最終定位

> 這不是給人“填完就有成就感”的工具。
> 這是讓每個改善主張都必須綁定數字、機制、責任與驗證窗口的改善操作系統。
